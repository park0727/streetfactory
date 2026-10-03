/**
 * Web Push 발송 (RFC 8291 aes128gcm 암호화 + RFC 8292 VAPID). Web Crypto 만 사용해 Cloudflare Workers 에서 동작한다.
 * 외부 라이브러리 없이 구현했고, 암호화 결과는 독립 구현(http_ece)으로 복호화해 검증했다.
 */
const enc = new TextEncoder();

export const b64u = {
  encode(buf: ArrayBuffer | Uint8Array) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(s: string) {
    const p = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
  },
};

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

/** RFC 8291: 페이로드를 받는 쪽 공개키(p256dh)·auth 로 암호화한 본문 */
export async function encryptPayload(
  payload: Uint8Array,
  uaPublic: Uint8Array,
  authSecret: Uint8Array,
  opts?: { salt?: Uint8Array; asKeyPair?: CryptoKeyPair },
) {
  const salt = opts?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const as = opts?.asKeyPair ?? ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));

  const prkKey = await hmac(authSecret, ecdh);
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(payload, new Uint8Array([2])); // 마지막 레코드 구분자
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, padded));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

/** RFC 8292 VAPID: ES256 JWT */
export async function vapidAuth(endpoint: string, publicKeyB64u: string, privateDB64u: string, subject: string) {
  const pub = b64u.decode(publicKeyB64u);
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", d: privateDB64u, x: b64u.encode(pub.slice(1, 33)), y: b64u.encode(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64u.encode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.encode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${b64u.encode(sig)}, k=${publicKeyB64u}`;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url?: string; tag?: string };

/** 한 기기로 발송. 410/404 면 만료된 구독(gone=true). */
export async function sendPush(t: PushTarget, msg: PushMessage, keys: { publicKey: string; privateKey: string; subject: string }) {
  const body = await encryptPayload(enc.encode(JSON.stringify(msg)), b64u.decode(t.p256dh), b64u.decode(t.auth));
  const res = await fetch(t.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(t.endpoint, keys.publicKey, keys.privateKey, keys.subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
      ...(msg.tag ? { Topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}),
    },
    body: body as BodyInit,
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410, text: res.ok ? "" : await res.text().catch(() => "") };
}
