/** 서버 컴포넌트에서 searchParams 를 안전하게 읽는 헬퍼 */
export type SP = Record<string, string | string[] | undefined>;

export const str = (sp: SP, k: string, def = "") => {
  const v = sp[k];
  return (Array.isArray(v) ? v[0] : v) ?? def;
};
export const int = (sp: SP, k: string, def: number) => {
  const n = Number.parseInt(str(sp, k), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};
export const PAGE_SIZE = 50;
