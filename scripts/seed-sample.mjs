/**
 * 화면 검증용 샘플 데이터. **로컬 테스트 DB 전용** — 운영 DB 에 절대 실행하지 말 것.
 *   DATABASE_URL=postgresql://localhost:5432/streetfactory_test node scripts/seed-sample.mjs <관리자 auth uuid>
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || !/localhost|127\.0\.0\.1/.test(url)) {
  console.error("로컬 DB(localhost) 에서만 실행합니다. DATABASE_URL=" + url);
  process.exit(1);
}
const adminId = process.argv[2];
const sql = postgres(url, { max: 1 });

await sql`truncate stock_movements, sales_lines, sales_orders, inbound_lines, inbound_orders, parts, partners, suppliers, categories, doc_sequences restart identity cascade`;
if (adminId) {
  await sql`insert into profiles (id, email, name, role, can_parts, can_repair, must_change_password) values (${adminId}, 'admin@streetfactory.kr', '관리자', 'admin', true, true, false) on conflict (id) do update set must_change_password = false`;
}

const cats = ["브레이크", "엔진", "구동계", "전장", "서스펜션", "외장", "소모품"];
await sql`insert into categories ${sql(cats.map((name, i) => ({ name, sort_order: i + 1 })))}`;
const sups = [
  { name: "Webike Japan", country: "일본", contact: "order@webike.jp" },
  { name: "Wemoto UK", country: "영국", contact: "sales@wemoto.co.uk" },
  { name: "Partzilla", country: "미국", contact: "b2b@partzilla.com" },
  { name: "Zhejiang Moto Parts", country: "중국", contact: "wechat: zjmoto" },
];
await sql`insert into suppliers ${sql(sups)}`;

const bikes = ["CBR600RR", "YZF-R6", "Ninja 400", "MT-07", "Z900", "GSX-R750", "Monster 821", "Street Triple", "CB650R", "R1250GS"];
const mk = ["Honda", "Yamaha", "Kawasaki", "Yamaha", "Kawasaki", "Suzuki", "Ducati", "Triumph", "Honda", "BMW"];
const templates = [
  ["브레이크", "BRK", "브레이크 패드 (앞)", 38000, 69000, 6],
  ["브레이크", "BRK", "브레이크 디스크", 145000, 260000, 2],
  ["엔진", "ENG", "오일 필터", 6500, 14000, 20],
  ["엔진", "ENG", "점화 플러그", 9000, 18000, 16],
  ["구동계", "DRV", "체인 키트 (520)", 98000, 175000, 4],
  ["구동계", "DRV", "리어 스프라켓 45T", 42000, 78000, 5],
  ["전장", "ELC", "레귤레이터/렉티파이어", 65000, 120000, 3],
  ["서스펜션", "SUS", "포크 씰 세트", 21000, 42000, 6],
  ["외장", "BDY", "레버 세트 (클러치/브레이크)", 33000, 62000, 4],
  ["소모품", "CSM", "에어 필터", 24000, 45000, 8],
];
const parts = [];
let n = 1;
for (let b = 0; b < bikes.length; b++) {
  for (let t = 0; t < templates.length; t++) {
    if ((b * 7 + t) % 3 === 0) continue; // 듬성듬성
    const [cat, pre, name, cost, price, safety] = templates[t];
    const status = n % 17 === 0 ? "discontinued" : n % 11 === 0 ? "paused" : "active";
    parts.push({
      code: `${pre}-${String(n).padStart(4, "0")}`,
      name,
      category_id: cats.indexOf(cat) + 1,
      spec: `${mk[b]} ${bikes[b]}`,
      manufacturer: mk[b],
      country: ["일본", "영국", "미국", "중국"][b % 4],
      supplier_id: (b % 4) + 1,
      standard_cost: cost,
      retail_price: price,
      avg_cost: cost,
      safety_stock: safety,
      status,
    });
    n++;
  }
}
await sql`insert into parts ${sql(parts)}`;

const partners = [
  { code: "P-0001", name: "라이더스 모토 (강남)", type: "dealer", contact_name: "김대리", phone: "02-555-0101", address: "서울 강남구" },
  { code: "P-0002", name: "바이크팩토리 부천", type: "service_center", contact_name: "박사장", phone: "032-555-0202", address: "경기 부천시" },
  { code: "P-0003", name: "스트리트팩토리 직영", type: "direct_store", contact_name: "본사", phone: "02-555-0000", address: "서울 성동구" },
  { code: "P-0004", name: "모토마트 온라인", type: "online_mall", contact_name: "온라인팀", phone: "1588-0404", address: "온라인" },
  { code: "P-0005", name: "대구 모터사이클 서비스", type: "service_center", contact_name: "이실장", phone: "053-555-0505", address: "대구 달서구" },
  { code: "P-0006", name: "부산 라이딩클럽", type: "dealer", contact_name: "최팀장", phone: "051-555-0606", address: "부산 해운대구" },
];
await sql`insert into partners ${sql(partners)}`;
await sql`insert into doc_sequences (prefix, year, last_no) values ('P', 0, 6)`;

// 기초재고
const opening = parts.map((p, i) => ({ part_id: i + 1, type: "opening", qty: 3 + ((i * 7) % 15), unit_cost: p.standard_cost, occurred_at: "2026-01-01", created_by: adminId ?? null }));
await sql`insert into stock_movements ${sql(opening)}`;

// 입고 12건 (월별), 판매 80건
const fx = { 일본: ["JPY", 9.2], 영국: ["GBP", 1720], 미국: ["USD", 1380], 중국: ["CNY", 190] };
let seq = 0;
for (let m = 0; m < 9; m++) {
  const supplierId = (m % 4) + 1;
  const s = sups[supplierId - 1];
  const [cur, rate] = fx[s.country];
  const date = `2026-${String(m + 1).padStart(2, "0")}-${String(5 + (m % 3) * 7).padStart(2, "0")}`;
  const [{ id: orderId }] = await sql`insert into inbound_orders (doc_no, doc_date, supplier_id, country, currency, exchange_rate, duty_amount, extra_cost, shipping_method, customs_status, created_by)
    values (${"INB-2026-" + String(++seq).padStart(5, "0")}, ${date}, ${supplierId}, ${s.country}, ${cur}, ${rate}, ${80000 + m * 12000}, ${60000 + m * 5000}, ${m % 2 ? "항공" : "해상"}, 'cleared', ${adminId ?? null}) returning id`;
  const lines = [];
  for (let k = 0; k < 4 + (m % 3); k++) {
    const pi = (m * 13 + k * 7) % parts.length;
    const p = parts[pi];
    lines.push({ order_id: orderId, line_no: k + 1, part_id: pi + 1, qty: 4 + ((k + m) % 8), unit_price_fx: +(p.standard_cost * 0.82 / rate).toFixed(4), unit_price_krw: 0, landed_unit_cost: 0 });
  }
  await sql`insert into inbound_lines ${sql(lines)}`;
  await sql`select fn_post_inbound(${orderId})`;
}
await sql`insert into doc_sequences (prefix, year, last_no) values ('INB', 2026, ${seq})`;

const channels = ["매장", "전화/카톡", "온라인몰", "정비"];
seq = 0;
for (let i = 0; i < 80; i++) {
  const m = Math.floor(i / 9);
  const date = `2026-${String(Math.min(9, m + 1)).padStart(2, "0")}-${String(2 + (i % 26)).padStart(2, "0")}`;
  const partnerId = (i % 6) + 1;
  const [{ id: orderId }] = await sql`insert into sales_orders (doc_no, doc_date, partner_id, channel, created_by)
    values (${"SLS-2026-" + String(++seq).padStart(5, "0")}, ${date}, ${partnerId}, ${channels[i % 4]}, ${adminId ?? null}) returning id`;
  const lines = [];
  for (let k = 0; k < 1 + (i % 3); k++) {
    const pi = (i * 11 + k * 5) % parts.length;
    const p = parts[pi];
    lines.push({ order_id: orderId, line_no: k + 1, part_id: pi + 1, qty: 1 + ((i + k) % 3), unit_price: Math.round(p.retail_price * (partnerId === 3 ? 1 : 0.85)), unit_cost: 0 });
  }
  await sql`insert into sales_lines ${sql(lines)}`;
  await sql`select fn_post_sale(${orderId})`;
}
await sql`insert into doc_sequences (prefix, year, last_no) values ('SLS', 2026, ${seq})`;

const [{ c }] = await sql`select count(*)::int c from v_inventory where stock_status <> 'ok'`;
console.log(`샘플 생성 완료: 부품 ${parts.length}, 거래처 ${partners.length}, 입고 9건, 판매 80건, 재고 경고 ${c}건`);
await sql.end();
