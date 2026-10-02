-- 고객 계정은 직원 프로필을 만들지 않는다 (user_metadata.kind = 'customer')
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'kind', '') = 'customer' then
    return new;
  end if;
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

-- 주문 가능 재고: 현재재고 − 접수 대기 온라인 주문
create or replace view public.v_available as
select
  s.part_id,
  s.qty,
  coalesce(r.reserved, 0)::int as reserved,
  greatest(s.qty - coalesce(r.reserved, 0), 0)::int as available
from public.v_stock s
left join (
  select l.part_id, sum(l.qty) as reserved
  from public.web_order_lines l
  join public.web_orders o on o.id = l.order_id
  where o.status = 'pending'
  group by l.part_id
) r on r.part_id = s.part_id;

alter table public.customer_accounts enable row level security;
alter table public.web_orders enable row level security;
alter table public.web_order_lines enable row level security;
alter table public.shop_settings enable row level security;

insert into public.shop_settings (id, company_name, order_notice)
values (1, 'Streetfactory', '주문이 접수되었습니다. 아래 계좌로 입금해 주시면 확인 후 출고해 드립니다. 품절 등으로 수량이 바뀌면 연락드립니다.')
on conflict (id) do nothing;
