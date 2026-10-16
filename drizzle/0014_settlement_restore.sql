-- 판매가를 부가세 포함가 그대로 쓰기로 해서(2026-10-16) 포함가 단가 컬럼을 쓰지 않는다. 0004 의 원래 정의로 되돌린다.
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

