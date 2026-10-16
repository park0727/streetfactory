-- 판매가는 부가세 포함가로 받는다. 라인에 포함가(unit_price_gross)가 모두 있으면 총액 = Σ 수량 × 포함가.
-- 공급가 합계에 ×1.1 을 하면 반올림 때문에 1~몇 원 어긋나 '미수 1원'이 남으므로 포함가 합계를 그대로 쓴다.
-- 포함가가 없는 옛 전표는 예전 계산(부가세 적용 시 공급가 × 1.1).
create or replace view public.v_sales_settlement as
with s as (
  select
    order_id,
    sum(qty * unit_price) as supply,
    sum(qty * unit_price_gross) as gross,
    bool_and(unit_price_gross is not null) as has_gross
  from public.sales_lines
  group by order_id
),
t as (
  select
    o.id,
    coalesce(s.supply, 0) as supply,
    case
      when s.has_gross then s.gross
      when o.vat_applied then round(coalesce(s.supply, 0) * 1.1)
      else coalesce(s.supply, 0)
    end as total
  from public.sales_orders o
  left join s on s.order_id = o.id
)
select
  o.id as order_id,
  o.partner_id,
  o.doc_date,
  o.vat_applied,
  o.due_date,
  t.supply::numeric(16, 0) as amount_supply,
  t.total::numeric(16, 0) as amount_total,
  coalesce(p.paid, 0)::numeric(16, 0) as paid,
  (t.total - coalesce(p.paid, 0))::numeric(16, 0) as balance,
  case
    when coalesce(p.paid, 0) >= t.total then 'paid'
    when coalesce(p.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as pay_status
from public.sales_orders o
join t on t.id = o.id
left join (select sales_order_id, sum(amount) as paid from public.payments group by sales_order_id) p on p.sales_order_id = o.id;
