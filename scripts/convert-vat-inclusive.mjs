// 기존 판매 전표·온라인 주문을 '판매가 = 부가세 포함가' 규칙으로 바꾼다 (2026-10 전환, src/lib/vat.ts).
// 라인의 기존 단가를 포함가로 보고 unit_price_gross 에 옮긴 뒤, unit_price 를 공급가(÷1.1)로 바꾼다.
// 거래처가 낼 총액은 그대로이고 장부의 공급가·부가세만 나뉜다. 취소된 온라인 주문은 건드리지 않는다.
//
//   node --env-file=.env.secrets scripts/convert-vat-inclusive.mjs                       # 미리보기만
//   node --env-file=.env.secrets scripts/convert-vat-inclusive.mjs --yes --backup <파일>  # 백업 후 적용
import fs from "node:fs";
import postgres from "postgres";

const apply = process.argv.includes("--yes");
const backupPath = process.argv[process.argv.indexOf("--backup") + 1];
if (apply && (!backupPath || backupPath.startsWith("--"))) throw new Error("--yes 에는 --backup <파일> 이 필요합니다.");

const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL, { max: 1, prepare: false });
const supplyOf = (g) => Math.round(g / 1.1);
// 옛 라인의 포함가: 부가세 적용 전표면 공급가 × 1.1, 아니면 기록된 금액이 곧 받은 포함가
const grossOf = (unitPrice, vatApplied) => (vatApplied ? Math.round(Number(unitPrice) * 1.1) : Number(unitPrice));

async function plan(tx) {
  const sales = await tx`
    select o.id, o.doc_no, o.vat_applied, l.id as line_id, l.qty, l.unit_price
    from sales_orders o join sales_lines l on l.order_id = o.id
    where l.unit_price_gross is null order by o.id, l.line_no`;
  const web = await tx`
    select o.id, o.order_no, o.vat_applied, l.id as line_id, l.qty, l.unit_price
    from web_orders o join web_order_lines l on l.order_id = o.id
    where l.unit_price_gross is null and o.status <> 'cancelled' order by o.id, l.line_no`;
  return { sales, web };
}

const summarize = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const g = grossOf(r.unit_price, r.vat_applied);
    const id = Number(r.id); // bigint 는 문자열로 온다
    const x = m.get(id) ?? { no: r[key], vatBefore: r.vat_applied, supplyBefore: 0, supplyAfter: 0, total: 0 };
    x.supplyBefore += r.qty * Number(r.unit_price);
    x.supplyAfter += r.qty * supplyOf(g);
    x.total += r.qty * g;
    m.set(id, x);
  }
  return m;
};

const settlement = (tx, ids) => (ids.length ? tx`select order_id, amount_supply, amount_total, paid, balance, pay_status from v_sales_settlement where order_id in ${tx(ids)} order by order_id` : []);

await sql.begin(async (tx) => {
  const { sales, web } = await plan(tx);
  const s = summarize(sales, "doc_no");
  const w = summarize(web, "order_no");
  const ids = [...s.keys()];
  const before = await settlement(tx, ids);

  console.log(`판매 전표 ${s.size}건, 온라인 주문 ${w.size}건 (라인 ${sales.length + web.length}개)`);
  for (const [id, x] of s) {
    const b = before.find((r) => Number(r.order_id) === id);
    console.log(`  ${x.no}: 공급가 ${x.supplyBefore.toLocaleString()} → ${x.supplyAfter.toLocaleString()}, 부가세 → ${(x.total - x.supplyAfter).toLocaleString()}, 받을 금액 ${Number(b.amount_total).toLocaleString()} → ${x.total.toLocaleString()} (수금 ${Number(b.paid).toLocaleString()}, ${b.pay_status})`);
  }
  for (const [, x] of w) console.log(`  ${x.no}: 공급가 ${x.supplyBefore.toLocaleString()} → ${x.supplyAfter.toLocaleString()}, 결제 금액 ${x.total.toLocaleString()}`);

  if (!apply) {
    console.log("\n미리보기입니다. 적용하려면 --yes --backup <파일> 을 붙이세요.");
    return;
  }
  fs.writeFileSync(backupPath, JSON.stringify({ at: new Date().toISOString(), sales, web, settlementBefore: before }, null, 2));
  console.log(`\n백업: ${backupPath}`);

  for (const r of sales) {
    const g = grossOf(r.unit_price, r.vat_applied);
    await tx`update sales_lines set unit_price = ${supplyOf(g)}, unit_price_gross = ${g} where id = ${r.line_id}`;
  }
  if (ids.length) await tx`update sales_orders set vat_applied = true where id in ${tx(ids)}`;
  for (const r of web) {
    const g = grossOf(r.unit_price, r.vat_applied);
    await tx`update web_order_lines set unit_price = ${supplyOf(g)}, unit_price_gross = ${g} where id = ${r.line_id}`;
  }
  if (w.size) await tx`update web_orders set vat_applied = true where id in ${tx([...w.keys()])}`;

  // 받을 금액·수금 상태가 그대로인지 확인. 다르면 전부 되돌린다.
  const after = await settlement(tx, ids);
  const diff = after.filter((a) => {
    const b = before.find((r) => Number(r.order_id) === Number(a.order_id));
    return Number(a.amount_total) !== s.get(Number(a.order_id)).total || Number(a.paid) !== Number(b.paid) || (Number(b.amount_total) === s.get(Number(a.order_id)).total && a.pay_status !== b.pay_status);
  });
  if (diff.length) throw new Error(`검증 실패, 되돌립니다: ${JSON.stringify(diff)}`);
  console.log("적용 완료. 전환 후 정산:");
  for (const a of after) console.log(`  #${a.order_id}: 공급가 ${Number(a.amount_supply).toLocaleString()} / 받을 금액 ${Number(a.amount_total).toLocaleString()} / 수금 ${Number(a.paid).toLocaleString()} / 잔액 ${Number(a.balance).toLocaleString()} / ${a.pay_status}`);
});
await sql.end();
