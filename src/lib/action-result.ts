/** Server Action 공통 반환 타입. */
export type ActionOk<T = undefined> = { ok: true; message?: string } & ([T] extends [undefined] ? { data?: undefined } : { data: T });
export type ActionFail = { ok: false; error: string };
export type ActionResult<T = undefined> = ActionOk<T> | ActionFail;
/** data 유무와 무관하게 받는 넓은 타입 (버튼·훅 공용) */
export type AnyActionResult = { ok: true; message?: string } | ActionFail;

/** zod 오류를 첫 메시지 하나로 요약 */
export function firstIssue(issues: { path: PropertyKey[]; message: string }[]): string {
  const i = issues[0];
  if (!i) return "입력값이 올바르지 않습니다.";
  const path = i.path.length ? `${String(i.path[0])}: ` : "";
  return `${path}${i.message}`;
}

/** Postgres 오류 코드 → 사용자 메시지 */
export function dbErrorMessage(e: unknown, fallback = "저장 중 오류가 발생했습니다."): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === "23505") return "이미 존재하는 값입니다.";
  if (err?.code === "23503") return "다른 데이터에서 사용 중이라 삭제할 수 없습니다.";
  return fallback;
}
