-- 전표별 정산 뷰: 총액(부가세 적용 시 ×1.1 반올림) − 수금 합계 = 미수 잔액
create or replace view public.v_sales_settlement as
select
  o.id as order_id,
  o.partner_id,
  o.doc_date,
  o.vat_applied,
  o.due_date,
  coalesce(s.supply, 0)::numeric(16, 0) as amount_supply,
  (case when o.vat_applied then round(coalesce(s.supply, 0) * 1.1) else coalesce(s.supply, 0) end)::numeric(16, 0) as amount_total,
  coalesce(p.paid, 0)::numeric(16, 0) as paid,
  ((case when o.vat_applied then round(coalesce(s.supply, 0) * 1.1) else coalesce(s.supply, 0) end) - coalesce(p.paid, 0))::numeric(16, 0) as balance,
  case
    when coalesce(p.paid, 0) >= (case when o.vat_applied then round(coalesce(s.supply, 0) * 1.1) else coalesce(s.supply, 0) end) then 'paid'
    when coalesce(p.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as pay_status
from public.sales_orders o
left join (select order_id, sum(qty * unit_price) as supply from public.sales_lines group by order_id) s on s.order_id = o.id
left join (select sales_order_id, sum(amount) as paid from public.payments group by sales_order_id) p on p.sales_order_id = o.id;

alter table public.payments enable row level security;
