-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — O'YIN TIZIMI, RECYCLING KENGAYTMASI, GREEN FLAG
--
--  Supabase → SQL Editor → New query → shu faylni to'liq qo'ying → Run.
--  Qayta ishga tushirish xavfsiz. Mavjud ma'lumotlar o'chirilmaydi.
--
--  1) EcoCoin va EcoShop: XP = to'plangan ball; EcoCoin = ball − sarflangan.
--     Xarid faqat buy_shop_item() orqali (balans va qoldiq bir vaqtda tekshiriladi)
--  2) Eco League: oylik mavsum (sinf bo'yicha jami va o'quvchi boshiga)
--  3) Recycling partiyalari (6 bosqich, kvitansiya), Eco Fund ovoz berish
--  4) Green Flag: maqsadlar, Eco Committee, yig'ilishlar, Action Plan
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── Umumiy: yozuvga maktabni avtomatik qo'yish ──
create or replace function public.set_school_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.school_id is null then
    new.school_id := public.my_school_id();
  end if;
  if new.school_id is null and (select count(*) from public.schools) = 1 then
    select id into new.school_id from public.schools limit 1;
  end if;
  -- Admin boshqa maktab yozuvini o'zgartira olmasin (bitta maktab bo'lsa ham xavfsiz)
  if tg_op = 'UPDATE' then
    new.school_id := old.school_id;
  end if;
  return new;
end $$;

-- ═════════ 1. ECOSHOP ═════════
create table if not exists public.shop_items (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  icon        text not null default '🎁' check (char_length(icon) <= 16),
  price       integer not null check (price between 1 and 100000),
  stock       integer check (stock is null or stock >= 0),
  for_class   boolean not null default false,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.shop_orders (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  item_id     bigint references public.shop_items(id) on delete set null,
  item_title  text not null,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  price       integer not null check (price > 0),
  status      text not null default 'pending' check (status in ('pending', 'delivered', 'rejected')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);
create index if not exists shop_orders_student_idx on public.shop_orders (student_id);

drop trigger if exists shop_items_school on public.shop_items;
create trigger shop_items_school before insert or update on public.shop_items
  for each row execute function public.set_school_id();

-- Hamyon: XP (daraja uchun) va EcoCoin (do'kon uchun) alohida
create or replace function public.my_wallet()
returns table (xp integer, earned integer, spent integer, balance integer)
language sql stable security definer set search_path = public as $$
  with p as (select coalesce(points, 0) as pts from public.profiles where id = auth.uid()),
       s as (select coalesce(sum(price), 0)::int as sp from public.shop_orders
             where student_id = auth.uid() and status <> 'rejected')
  select p.pts, p.pts, s.sp, greatest(p.pts - s.sp, 0) from p, s;
$$;

create or replace function public.buy_shop_item(p_item bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_pts   integer;
  v_sch   bigint;
  v_spent integer;
  it      public.shop_items;
  v_id    bigint;
begin
  if v_uid is null then raise exception 'Avval tizimga kiring' using errcode = '42501'; end if;
  -- Bir vaqtdagi ikki xaridni ketma-ket qilish uchun profilni qulflaymiz
  select coalesce(points, 0), school_id into v_pts, v_sch from public.profiles where id = v_uid for update;
  select * into it from public.shop_items where id = p_item for update;
  if not found or not it.active then raise exception 'Mahsulot topilmadi'; end if;
  if it.school_id is not null and it.school_id is distinct from v_sch then raise exception 'Mahsulot topilmadi'; end if;
  if it.stock is not null and it.stock <= 0 then raise exception 'Mahsulot tugagan'; end if;
  select coalesce(sum(price), 0) into v_spent from public.shop_orders where student_id = v_uid and status <> 'rejected';
  if v_pts - v_spent < it.price then raise exception 'EcoCoin yetarli emas'; end if;
  insert into public.shop_orders (school_id, item_id, item_title, student_id, price)
  values (coalesce(it.school_id, v_sch), it.id, it.title, v_uid, it.price) returning id into v_id;
  if it.stock is not null then
    update public.shop_items set stock = stock - 1 where id = it.id;
  end if;
  return v_id;
end $$;

-- Rad etilgan buyurtma: tanga qaytadi (spent hisobidan chiqadi), qoldiq ham qaytadi
create or replace function public.shop_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.handled_at := now();
    if new.status = 'rejected' and old.status <> 'rejected' and new.item_id is not null then
      update public.shop_items set stock = stock + 1 where id = new.item_id and stock is not null;
    elsif old.status = 'rejected' and new.status <> 'rejected' then
      raise exception 'Rad etilgan buyurtmani qayta tiklab bo''lmaydi';
    end if;
  end if;
  -- Narx, mahsulot va egasini o'zgartirib bo'lmaydi
  new.price := old.price; new.student_id := old.student_id; new.item_id := old.item_id;
  new.item_title := old.item_title; new.school_id := old.school_id;
  return new;
end $$;
drop trigger if exists shop_order_status on public.shop_orders;
create trigger shop_order_status before update on public.shop_orders
  for each row execute function public.shop_order_status();

-- ═════════ 2. ECO LEAGUE ═════════
create or replace function public.get_league(p_month date default current_date)
returns table (class_name text, students bigint, points bigint, per_student numeric,
               recycling_kg numeric, challenges bigint, research bigint)
language sql stable security definer set search_path = public as $$
  with sid as (select public.my_school_id() as id),
  rng as (select date_trunc('month', p_month)::timestamptz as a,
                 (date_trunc('month', p_month) + interval '1 month')::timestamptz as b),
  cls as (
    select c.class_name as cn from public.school_classes c, sid where c.school_id = sid.id
    union
    select p.class_name from public.profiles p, sid
    where p.school_id = sid.id and p.role = 'student' and coalesce(p.class_name, '') <> ''
  ),
  st as (
    select p.class_name as cn, count(*) as n from public.profiles p, sid
    where p.school_id = sid.id and p.role = 'student' group by 1
  ),
  ch as (
    select q.class_name as cn, count(*) as n, sum(cs.awarded_points) as pts
    from public.challenge_submissions cs join public.profiles q on q.id = cs.student_id, sid, rng
    where cs.status = 'approved' and q.school_id = sid.id and cs.reviewed_at >= rng.a and cs.reviewed_at < rng.b
    group by 1
  ),
  rs as (
    select q.class_name as cn, count(*) as n, sum(r.awarded_points) as pts
    from public.eco_research r join public.profiles q on q.id = r.student_id, sid, rng
    where r.status = 'published' and q.school_id = sid.id and r.reviewed_at >= rng.a and r.reviewed_at < rng.b
    group by 1
  ),
  rc as (
    select coalesce(r.class_name, q.class_name) as cn,
           sum(coalesce(r.verified_amount_kg, r.amount_kg)) as kg, sum(r.awarded_points) as pts
    from public.recycling_submissions r left join public.profiles q on q.id = r.student_id, sid, rng
    where r.status = 'approved' and r.school_id = sid.id
      and coalesce(r.reviewed_at, r.submitted_at) >= rng.a and coalesce(r.reviewed_at, r.submitted_at) < rng.b
    group by 1
  )
  select cls.cn,
         coalesce(st.n, 0)::bigint,
         (coalesce(ch.pts, 0) + coalesce(rs.pts, 0) + coalesce(rc.pts, 0))::bigint as total,
         round((coalesce(ch.pts, 0) + coalesce(rs.pts, 0) + coalesce(rc.pts, 0))::numeric / greatest(coalesce(st.n, 0), 1), 1),
         coalesce(rc.kg, 0),
         coalesce(ch.n, 0)::bigint,
         coalesce(rs.n, 0)::bigint
  from cls
  left join st on st.cn = cls.cn
  left join ch on ch.cn = cls.cn
  left join rs on rs.cn = cls.cn
  left join rc on rc.cn = cls.cn
  where auth.uid() is not null
  order by 3 desc, 1;
$$;

-- ═════════ 3. RECYCLING PARTIYALARI VA ECO FUND ═════════
create table if not exists public.recycling_batches (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 2 and 120),
  paper_kg    numeric(8,2) not null default 0 check (paper_kg between 0 and 100000),
  plastic_kg  numeric(8,2) not null default 0 check (plastic_kg between 0 and 100000),
  stage       smallint not null default 1 check (stage between 1 and 6),
  income      bigint not null default 0 check (income between 0 and 1000000000),
  receipt_url text check (receipt_url is null or (char_length(receipt_url) <= 500 and receipt_url ~ '^https://')),
  note        text check (note is null or char_length(note) <= 500),
  history     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.batch_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.history := jsonb_build_array(jsonb_build_object('stage', new.stage, 'at', now()));
  elsif new.stage is distinct from old.stage then
    new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_object('stage', new.stage, 'at', now());
  else
    new.history := old.history;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists batches_school on public.recycling_batches;
create trigger batches_school before insert or update on public.recycling_batches
  for each row execute function public.set_school_id();
drop trigger if exists batches_history on public.recycling_batches;
create trigger batches_history before insert or update on public.recycling_batches
  for each row execute function public.batch_history();

create table if not exists public.fund_projects (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 2 and 120),
  description text check (description is null or char_length(description) <= 400),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
drop trigger if exists fund_projects_school on public.fund_projects;
create trigger fund_projects_school before insert or update on public.fund_projects
  for each row execute function public.set_school_id();

-- Har bir o'quvchining bitta ovozi (fikrini o'zgartirishi mumkin)
create table if not exists public.fund_votes (
  student_id  uuid primary key references public.profiles(id) on delete cascade,
  project_id  bigint not null references public.fund_projects(id) on delete cascade,
  voted_at    timestamptz not null default now()
);

create or replace function public.get_fund_summary()
returns table (project_id bigint, title text, description text, votes bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  select fp.id, fp.title, fp.description,
         (select count(*) from public.fund_votes v where v.project_id = fp.id),
         exists (select 1 from public.fund_votes v where v.project_id = fp.id and v.student_id = auth.uid())
  from public.fund_projects fp
  where auth.uid() is not null and fp.active and fp.school_id = public.my_school_id()
  order by 4 desc, fp.id;
$$;

create or replace function public.vote_fund_project(p_project bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Avval tizimga kiring' using errcode = '42501'; end if;
  if not exists (select 1 from public.fund_projects
                 where id = p_project and active and school_id = public.my_school_id()) then
    raise exception 'Loyiha topilmadi';
  end if;
  insert into public.fund_votes (student_id, project_id) values (auth.uid(), p_project)
  on conflict (student_id) do update set project_id = excluded.project_id, voted_at = now();
end $$;

create or replace function public.admin_reset_fund_votes()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  delete from public.fund_votes v using public.fund_projects fp
  where fp.id = v.project_id and fp.school_id = public.my_school_id();
end $$;

-- Kvitansiya rasmlari: ochiq (o'quvchilar ko'radi), yuklash faqat admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('batch-receipts', 'batch-receipts', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists eco_receipts_insert on storage.objects;
drop policy if exists eco_receipts_delete on storage.objects;
create policy eco_receipts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'batch-receipts' and public.is_admin());
create policy eco_receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'batch-receipts' and public.is_admin());

-- ═════════ 4. GREEN FLAG ═════════
create table if not exists public.eco_goals (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 2 and 120),
  unit        text not null default '' check (char_length(unit) <= 20),
  target      numeric(12,2) not null default 0 check (target >= 0),
  current     numeric(12,2) not null default 0 check (current >= 0),
  auto        text check (auto is null or auto in ('active_pct', 'classes_pct', 'paper_kg', 'plastic_kg', 'research')),
  sort_order  integer not null default 0
);
drop trigger if exists goals_school on public.eco_goals;
create trigger goals_school before insert or update on public.eco_goals
  for each row execute function public.set_school_id();

create or replace function public.get_goal_auto()
returns table (active_pct numeric, classes_pct numeric, paper_kg numeric, plastic_kg numeric, research bigint)
language sql stable security definer set search_path = public as $$
  with sid as (select public.my_school_id() as id),
  stu as (select p.id, p.points, p.class_name from public.profiles p, sid where p.school_id = sid.id and p.role = 'student'),
  cls as (select c.class_name from public.school_classes c, sid where c.school_id = sid.id),
  rec as (
    select r.material, coalesce(r.class_name, q.class_name) as cn, coalesce(r.verified_amount_kg, r.amount_kg) as kg
    from public.recycling_submissions r left join public.profiles q on q.id = r.student_id, sid
    where r.status = 'approved' and r.school_id = sid.id
  ),
  activec as (
    select distinct class_name as cn from stu where points > 0
    union select distinct cn from rec where cn is not null
  )
  select
    round(100.0 * (select count(*) from stu where points > 0) / greatest((select count(*) from stu), 1), 1),
    round(100.0 * (select count(*) from cls where class_name in (select cn from activec)) / greatest((select count(*) from cls), 1), 1),
    coalesce((select sum(kg) from rec where material = 'paper'), 0),
    coalesce((select sum(kg) from rec where material = 'plastic'), 0),
    (select count(*) from public.eco_research r join stu on stu.id = r.student_id where r.status = 'published')
  where auth.uid() is not null;
$$;

create table if not exists public.committee_members (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  full_name   text not null check (char_length(trim(full_name)) between 2 and 80),
  role_title  text check (role_title is null or char_length(role_title) <= 80),
  class_name  text check (class_name is null or char_length(class_name) <= 20),
  sort_order  integer not null default 0
);
create table if not exists public.committee_meetings (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  meet_date   date not null,
  title       text not null check (char_length(trim(title)) between 2 and 160),
  minutes     text check (minutes is null or char_length(minutes) <= 5000),
  decisions   text check (decisions is null or char_length(decisions) <= 3000)
);
create table if not exists public.action_tasks (
  id          bigint generated always as identity primary key,
  school_id   bigint references public.schools(id) on delete cascade,
  step        text not null default 'action' check (step in ('committee', 'review', 'curriculum', 'action', 'monitoring', 'inform', 'ecocode')),
  title       text not null check (char_length(trim(title)) between 2 and 200),
  owner_name  text check (owner_name is null or char_length(owner_name) <= 80),
  deadline    date,
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  created_at  timestamptz not null default now()
);
drop trigger if exists cm_school on public.committee_members;
create trigger cm_school before insert or update on public.committee_members for each row execute function public.set_school_id();
drop trigger if exists cmt_school on public.committee_meetings;
create trigger cmt_school before insert or update on public.committee_meetings for each row execute function public.set_school_id();
drop trigger if exists at_school on public.action_tasks;
create trigger at_school before insert or update on public.action_tasks for each row execute function public.set_school_id();

-- ═════════ RUXSATLAR (RLS) ═════════
do $$
declare t text;
begin
  foreach t in array array['shop_items', 'recycling_batches', 'fund_projects', 'eco_goals',
                           'committee_members', 'committee_meetings', 'action_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists eco_%s_read on public.%I', t, t);
    execute format('drop policy if exists eco_%s_admin on public.%I', t, t);
    execute format('create policy eco_%s_read on public.%I for select to authenticated using (school_id = public.my_school_id() or public.is_admin())', t, t);
    execute format('create policy eco_%s_admin on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.shop_orders enable row level security;
drop policy if exists eco_orders_own on public.shop_orders;
drop policy if exists eco_orders_admin on public.shop_orders;
create policy eco_orders_own on public.shop_orders for select to authenticated using (student_id = auth.uid());
create policy eco_orders_admin on public.shop_orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update, delete on public.shop_orders to authenticated;

alter table public.fund_votes enable row level security;
drop policy if exists eco_votes_own on public.fund_votes;
create policy eco_votes_own on public.fund_votes for select to authenticated using (student_id = auth.uid());
grant select on public.fund_votes to authenticated;

revoke all on function public.set_school_id(), public.batch_history(), public.shop_order_status() from public, anon, authenticated;
revoke all on function public.my_wallet(), public.buy_shop_item(bigint), public.get_league(date), public.get_fund_summary(),
  public.vote_fund_project(bigint), public.admin_reset_fund_votes(), public.get_goal_auto() from public, anon;
grant execute on function public.my_wallet(), public.buy_shop_item(bigint), public.get_league(date), public.get_fund_summary(),
  public.vote_fund_project(bigint), public.admin_reset_fund_votes(), public.get_goal_auto() to authenticated;

-- ═════════ BOSHLANG'ICH MA'LUMOT (faqat bo'sh bo'lsa) ═════════
insert into public.shop_items (school_id, title, description, icon, price, for_class, sort_order)
select s.id, x.t, x.d, x.i, x.p, x.c, x.o
from public.schools s
cross join (values
  ('Eco Hero nishoni', 'Profilingizga maxsus nishon', '🏅', 100, false, 1),
  ('Timo profil bezagi', 'Timo bilan profil ramkasi', '🐢', 150, false, 2),
  ('Ekologik bloknot', 'Qayta ishlangan qog‘ozdan', '📒', 300, false, 3),
  ('Kitob', 'Tabiat haqida kitob', '📚', 500, false, 4),
  ('Sinf uchun o‘simlik', 'Sinf xonasiga gul', '🌱', 600, true, 5),
  ('Sinf uchun kubok', 'Eng faol sinfga', '🏆', 1500, true, 6)
) as x(t, d, i, p, c, o)
where s.code = 'ECOIXMI' and not exists (select 1 from public.shop_items);

insert into public.eco_goals (school_id, title, unit, target, auto, sort_order)
select s.id, x.t, x.u, x.v, x.a, x.o
from public.schools s
cross join (values
  ('Faol o‘quvchilar', '%', 70, 'active_pct', 1),
  ('Ishtirok etuvchi sinflar', '%', 100, 'classes_pct', 2),
  ('Qog‘oz recycling', 'kg', 500, 'paper_kg', 3),
  ('Plastik recycling', 'kg', 200, 'plastic_kg', 4),
  ('Aralash chiqindilarni kamaytirish', '%', 30, null, 5),
  ('Elektr sarfini kamaytirish', '%', 10, null, 6),
  ('Ekologik tadqiqotlar', 'ta', 15, 'research', 7),
  ('Fanlarga integratsiya', 'fan', 5, null, 8),
  ('Hamkor tashkilotlar', 'ta', 3, null, 9),
  ('Eco Committee yig‘ilishlari', 'ta', 9, null, 10),
  ('O‘quvchilar tashabbuslari', 'ta', 20, null, 11)
) as x(t, u, v, a, o)
where s.code = 'ECOIXMI' and not exists (select 1 from public.eco_goals);

commit;

notify pgrst, 'reload schema';
