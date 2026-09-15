-- ============================================================
-- 0001: 트리거 / 뷰 / 함수 / RLS  (docs/SCHEMA.md 참고)
-- ============================================================

-- ---------- auth.users → profiles 자동 생성 ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- parts.updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists parts_set_updated_at on public.parts;
create trigger parts_set_updated_at
  before update on public.parts
  for each row execute function public.set_updated_at();

-- ---------- 채번: UPDATE … RETURNING 으로 잠금 ----------
create or replace function public.fn_next_seq(p_prefix text, p_year int)
returns int language plpgsql as $$
declare v_no int;
begin
  insert into public.doc_sequences (prefix, year, last_no)
  values (p_prefix, p_year, 1)
  on conflict (prefix, year) do update set last_no = public.doc_sequences.last_no + 1
  returning last_no into v_no;
  return v_no;
end $$;

-- ---------- 뷰: 현재재고 ----------
create or replace view public.v_stock as
select
  p.id as part_id,
  coalesce(sum(m.qty), 0)::int as qty,
  coalesce(sum(m.qty) filter (where m.type = 'opening'), 0)::int as opening_qty,
  coalesce(sum(m.qty) filter (where m.type = 'inbound'), 0)::int as inbound_qty,
  coalesce(-sum(m.qty) filter (where m.type = 'sale'), 0)::int as sold_qty,
  coalesce(sum(m.qty) filter (where m.type = 'adjustment'), 0)::int as adjustment_qty
from public.parts p
left join public.stock_movements m on m.part_id = p.id
group by p.id;

-- ---------- 뷰: 재고 현황 (상태·평가액 포함) ----------
create or replace view public.v_inventory as
select
  p.id, p.code, p.name, p.category_id, c.name as category_name, p.spec, p.manufacturer, p.country,
  p.supplier_id, p.standard_cost, p.retail_price, p.avg_cost, p.safety_stock, p.status,
  s.qty, s.opening_qty, s.inbound_qty, s.sold_qty, s.adjustment_qty,
  case when s.qty <= 0 then 'out' when s.qty < p.safety_stock then 'low' else 'ok' end as stock_status,
  round(s.qty * p.avg_cost, 0)::numeric(16, 0) as stock_value
from public.parts p
join public.v_stock s on s.part_id = p.id
join public.categories c on c.id = p.category_id;

-- ---------- 뷰: 거래처 실적 ----------
create or replace view public.v_partner_stats as
select
  pt.id as partner_id,
  count(distinct so.id)::int as order_count,
  coalesce(sum(sl.qty * sl.unit_price), 0)::numeric(16, 0) as total_amount,
  max(so.doc_date) as last_date
from public.partners pt
left join public.sales_orders so on so.partner_id = pt.id
left join public.sales_lines sl on sl.order_id = so.id
group by pt.id;

-- ---------- 함수: 이동평균 원가 재계산 (이력 리플레이) ----------
-- 입고/기초 이동을 시간순으로 다시 돌려 parts.avg_cost 를 산출한다.
-- 입고 전표 수정·삭제 뒤에 호출한다. 판매 라인의 unit_cost 스냅샷은 건드리지 않는다.
create or replace function public.fn_recalc_avg_cost(p_part_id bigint)
returns numeric language plpgsql as $$
declare
  m record;
  v_qty int := 0;
  v_avg numeric := 0;
begin
  for m in
    select type, qty, unit_cost from public.stock_movements
    where part_id = p_part_id order by occurred_at, id
  loop
    if m.type in ('opening', 'inbound') and m.qty > 0 then
      if v_qty <= 0 then v_avg := m.unit_cost;
      else v_avg := round((v_qty * v_avg + m.qty * m.unit_cost) / (v_qty + m.qty), 2);
      end if;
    end if;
    v_qty := v_qty + m.qty;
  end loop;
  if v_avg = 0 then
    select standard_cost into v_avg from public.parts where id = p_part_id;
  end if;
  update public.parts set avg_cost = v_avg where id = p_part_id;
  return v_avg;
end $$;

-- ---------- 함수: 입고 전표 확정 ----------
-- 원화단가·부대비용 배분·개당 실질원가 계산 → 재고이동 생성 → 평균원가 갱신. 단일 트랜잭션.
create or replace function public.fn_post_inbound(p_order_id bigint)
returns void language plpgsql as $$
declare
  o public.inbound_orders%rowtype;
  l record;
  v_total_qty int;
  v_overhead numeric;
  v_allocated_sum numeric := 0;
  v_alloc numeric;
  v_krw numeric;
  v_landed numeric;
  v_last_id bigint;
begin
  select * into o from public.inbound_orders where id = p_order_id for update;
  if not found then raise exception 'inbound order % not found', p_order_id; end if;
  if exists (
    select 1 from public.stock_movements m
    join public.inbound_lines il on il.id = m.inbound_line_id
    where il.order_id = p_order_id
  ) then
    raise exception 'inbound order % already posted', p_order_id;
  end if;

  select coalesce(sum(qty), 0), max(id) into v_total_qty, v_last_id
  from public.inbound_lines where order_id = p_order_id;
  if v_total_qty <= 0 then raise exception 'inbound order % has no lines', p_order_id; end if;

  v_overhead := coalesce(o.duty_amount, 0) + coalesce(o.extra_cost, 0);

  for l in select * from public.inbound_lines where order_id = p_order_id order by line_no, id for update loop
    v_krw := round(l.unit_price_fx * o.exchange_rate, 2);
    if l.id = v_last_id then
      v_alloc := v_overhead - v_allocated_sum;           -- 반올림 잔차는 마지막 라인에
    else
      v_alloc := round(v_overhead * l.qty / v_total_qty, 2);
    end if;
    v_allocated_sum := v_allocated_sum + v_alloc;
    v_landed := round((l.qty * v_krw + v_alloc) / l.qty, 2);

    update public.inbound_lines
      set unit_price_krw = v_krw, allocated_cost = v_alloc, landed_unit_cost = v_landed
      where id = l.id;

    insert into public.stock_movements (part_id, type, qty, unit_cost, inbound_line_id, occurred_at, created_by)
    values (l.part_id, 'inbound', l.qty, v_landed, l.id, o.doc_date, o.created_by);

    perform public.fn_recalc_avg_cost(l.part_id);
  end loop;
end $$;

-- ---------- 함수: 입고 전표 확정 취소 ----------
create or replace function public.fn_unpost_inbound(p_order_id bigint)
returns void language plpgsql as $$
declare v_part bigint;
begin
  for v_part in
    select distinct il.part_id from public.inbound_lines il where il.order_id = p_order_id
  loop
    delete from public.stock_movements m
      using public.inbound_lines il
      where m.inbound_line_id = il.id and il.order_id = p_order_id and m.part_id = v_part;
    perform public.fn_recalc_avg_cost(v_part);
  end loop;
end $$;

-- ---------- 함수: 판매 전표 확정 ----------
-- 판매 시점 avg_cost 를 라인에 스냅샷하고 재고이동(−qty) 을 만든다.
create or replace function public.fn_post_sale(p_order_id bigint)
returns void language plpgsql as $$
declare
  o public.sales_orders%rowtype;
  l record;
  v_avg numeric;
begin
  select * into o from public.sales_orders where id = p_order_id for update;
  if not found then raise exception 'sales order % not found', p_order_id; end if;
  if exists (
    select 1 from public.stock_movements m
    join public.sales_lines sl on sl.id = m.sales_line_id
    where sl.order_id = p_order_id
  ) then
    raise exception 'sales order % already posted', p_order_id;
  end if;

  for l in select * from public.sales_lines where order_id = p_order_id order by line_no, id for update loop
    select avg_cost into v_avg from public.parts where id = l.part_id;
    update public.sales_lines set unit_cost = coalesce(v_avg, 0) where id = l.id;
    insert into public.stock_movements (part_id, type, qty, unit_cost, sales_line_id, occurred_at, created_by)
    values (l.part_id, 'sale', -l.qty, coalesce(v_avg, 0), l.id, o.doc_date, o.created_by);
  end loop;
end $$;

-- ---------- 함수: 판매 전표 확정 취소 ----------
create or replace function public.fn_unpost_sale(p_order_id bigint)
returns void language plpgsql as $$
begin
  delete from public.stock_movements m
    using public.sales_lines sl
    where m.sales_line_id = sl.id and sl.order_id = p_order_id;
end $$;

-- ---------- RLS ----------
-- 앱은 서비스 역할(postgres) 로 접속하므로 RLS 를 우회한다.
-- anon / authenticated 에는 정책을 주지 않아 PostgREST 경유 접근을 전면 차단한다.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.sales_channels enable row level security;
alter table public.suppliers enable row level security;
alter table public.parts enable row level security;
alter table public.partners enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_lines enable row level security;
alter table public.inbound_orders enable row level security;
alter table public.inbound_lines enable row level security;
alter table public.stock_movements enable row level security;
alter table public.doc_sequences enable row level security;

-- ---------- 기본 데이터 ----------
insert into public.sales_channels (name, sort_order) values
  ('매장', 1), ('전화/카톡', 2), ('온라인몰', 3), ('정비', 4)
on conflict (name) do nothing;
