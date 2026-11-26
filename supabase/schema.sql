-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — YANGI (BO'SH) SUPABASE LOYIHASI UCHUN TO'LIQ BAZA
--
--  Supabase → SQL Editor → New query → shu faylni TO'LIQ qo'ying → Run.
--  Bitta fayl hammasini yaratadi. migrations/ papkasidagi fayllarni bunga
--  qo'shimcha ishga tushirish SHART EMAS (ular eski bazalar uchun).
--
--  Yaratiladi:
--    • maktablar, sinflar, profillar, challenge'lar, topshiriqlar, recycling,
--      tadqiqotlar, tadbirlar, sahifa matnlari
--    • ro'yxatdan o'tganda profil avtomatik yaratilishi
--    • ballarning avtomatik va xavfsiz hisoblanishi (faqat admin tasdiqlaganda)
--    • reyting va statistika funksiyalari
--    • xavfsizlik (RLS) — o'quvchi faqat o'zinikini ko'radi va o'ziga ball yoza olmaydi
--    • rasm saqlash joylari (private)
--    • boshlang'ich maktab: kod ECOIXMI (admin paneldan o'zgartirasiz)
--
--  Qayta ishga tushirish xavfsiz (mavjud ma'lumot o'chirilmaydi).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────── 1. JADVALLAR ─────────────────────────────

create table if not exists public.schools (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 120),
  code        text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  created_at  timestamptz not null default now()
);

create table if not exists public.school_classes (
  id          bigint generated always as identity primary key,
  school_id   bigint not null references public.schools(id) on delete cascade,
  class_name  text not null check (char_length(class_name) between 1 and 20),
  created_at  timestamptz not null default now(),
  unique (school_id, class_name)
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text check (char_length(full_name) <= 80),
  class_name  text check (char_length(class_name) <= 20),
  school_code text,
  school_id   bigint references public.schools(id) on delete set null,
  points      integer not null default 0 check (points >= 0),
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.challenges (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 3 and 150),
  description text not null default '' check (char_length(description) <= 1000),
  category    text not null default 'Boshqa' check (char_length(category) <= 60),
  points      integer not null default 20 check (points between 1 and 500),
  end_date    date,
  created_at  timestamptz not null default now()
);

create table if not exists public.challenge_submissions (
  id             bigint generated always as identity primary key,
  challenge_id   bigint not null references public.challenges(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  proof_text     text check (char_length(proof_text) <= 2000),
  proof_url      text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  awarded_points integer not null default 0 check (awarded_points >= 0),
  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,
  submitted_at   timestamptz not null default now()
);

create table if not exists public.recycling_submissions (
  id                 bigint generated always as identity primary key,
  school_id          bigint references public.schools(id) on delete set null,
  student_id         uuid not null references public.profiles(id) on delete cascade,
  material           text not null check (material in ('paper', 'plastic')),
  amount_kg          numeric(6,2) not null check (amount_kg > 0 and amount_kg <= 500),
  verified_amount_kg numeric(6,2) check (verified_amount_kg is null or (verified_amount_kg > 0 and verified_amount_kg <= 500)),
  proof_image        text,
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  awarded_points     integer not null default 0 check (awarded_points >= 0),
  reviewed_by        uuid references auth.users(id) on delete set null,
  reviewed_at        timestamptz,
  submitted_at       timestamptz not null default now()
);

create table if not exists public.eco_research (
  id                bigint generated always as identity primary key,
  student_id        uuid not null references public.profiles(id) on delete cascade,
  team_name         text check (char_length(team_name) <= 120),
  team_members      text check (char_length(team_members) <= 500),
  title             text not null check (char_length(title) between 3 and 200),
  summary           text not null check (char_length(summary) <= 1000),
  content           text not null check (char_length(content) <= 20000),
  sources           text check (char_length(sources) <= 3000),
  status            text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  awarded_points    integer not null default 0 check (awarded_points between 0 and 100),
  reviewer_feedback text check (char_length(reviewer_feedback) <= 1000),
  reviewed_at       timestamptz,
  submitted_at      timestamptz not null default now()
);

create table if not exists public.eco_events (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 2 and 200),
  description text check (char_length(description) <= 2000),
  event_type  text not null default 'event' check (event_type in ('event', 'challenge', 'eco_day')),
  start_date  date not null,
  end_date    date check (end_date is null or end_date >= start_date),
  location    text check (char_length(location) <= 200),
  school_id   bigint references public.schools(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.site_content (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

create index if not exists idx_profiles_school      on public.profiles (school_id, class_name);
create index if not exists idx_ch_sub_student       on public.challenge_submissions (student_id);
create index if not exists idx_ch_sub_status        on public.challenge_submissions (status);
create index if not exists idx_rec_sub_student      on public.recycling_submissions (student_id);
create index if not exists idx_rec_sub_school       on public.recycling_submissions (school_id, status);
create index if not exists idx_research_student     on public.eco_research (student_id);
create index if not exists idx_research_status      on public.eco_research (status);
create index if not exists idx_events_start         on public.eco_events (start_date);

-- ───────────────────────────── 2. YORDAMCHI FUNKSIYALAR ─────────────────────────────

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_school_id()
returns bigint language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid();
$$;

-- Ro'yxatdan o'tganda profil avtomatik yaratiladi
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code   text := upper(trim(coalesce(new.raw_user_meta_data ->> 'school_code', '')));
  v_school bigint;
begin
  select id into v_school from public.schools where code = v_code;
  insert into public.profiles (id, full_name, class_name, school_code, school_id)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80),
    left(upper(trim(coalesce(new.raw_user_meta_data ->> 'class_name', ''))), 20),
    nullif(v_code, ''),
    v_school
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Oddiy foydalanuvchi o'z roli, bali va maktabini o'zgartira olmaydi
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eco.points_sync', true), '') = '1' then
    return new;                         -- ball triggeri (ichki) o'zgartirmoqda
  end if;
  if auth.uid() is not null and not public.is_admin() then
    new.role      := old.role;
    new.points    := old.points;
    new.school_id := old.school_id;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ───────────────────────────── 3. BALLAR (avtomatik) ─────────────────────────────

-- 3a. Topshiriq yaratilganda/tasdiqlanganda ballni HISOBLASH
create or replace function public.prepare_challenge_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.reviewed_by := null; new.reviewed_at := null;
    end if;
    return new;
  end if;
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status <> 'approved' then
      select points into new.awarded_points from public.challenges where id = new.challenge_id;
    end if;
  else
    new.awarded_points := 0;
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now(); new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end $$;

create or replace function public.prepare_recycling_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.verified_amount_kg := null;
      new.reviewed_by := null; new.reviewed_at := null;
      new.school_id := public.my_school_id();
    end if;
    return new;
  end if;
  if new.status = 'approved' then
    new.awarded_points := round(coalesce(new.verified_amount_kg, new.amount_kg) * 25);
  else
    new.awarded_points := 0;
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now(); new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end $$;

create or replace function public.prepare_research()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.reviewer_feedback := null; new.reviewed_at := null;
    end if;
    return new;
  end if;
  new.awarded_points := case when new.status = 'published' then least(100, greatest(0, coalesce(new.awarded_points, 0))) else 0 end;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now();
  end if;
  return new;
end $$;

-- 3b. Ballni profilga YOZISH (tasdiqlash, qaytarish, tahrirlash, o'chirish — hammasi hisobga olinadi)
create or replace function public.sync_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_pts int := 0;
  new_pts int := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status in ('approved', 'published') then
    old_pts := coalesce(old.awarded_points, 0);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status in ('approved', 'published') then
    new_pts := coalesce(new.awarded_points, 0);
  end if;

  perform set_config('eco.points_sync', '1', true);
  if tg_op = 'DELETE' then
    update public.profiles set points = greatest(0, points - old_pts) where id = old.student_id and old_pts <> 0;
  elsif tg_op = 'UPDATE' and old.student_id is distinct from new.student_id then
    update public.profiles set points = greatest(0, points - old_pts) where id = old.student_id;
    update public.profiles set points = points + new_pts where id = new.student_id;
  elsif new_pts <> old_pts then
    update public.profiles set points = greatest(0, points + new_pts - old_pts) where id = new.student_id;
  end if;
  perform set_config('eco.points_sync', '', true);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists prepare_points on public.challenge_submissions;
create trigger prepare_points before insert or update on public.challenge_submissions
  for each row execute function public.prepare_challenge_submission();
drop trigger if exists sync_points on public.challenge_submissions;
create trigger sync_points after insert or update or delete on public.challenge_submissions
  for each row execute function public.sync_points();

drop trigger if exists prepare_points on public.recycling_submissions;
create trigger prepare_points before insert or update on public.recycling_submissions
  for each row execute function public.prepare_recycling_submission();
drop trigger if exists sync_points on public.recycling_submissions;
create trigger sync_points after insert or update or delete on public.recycling_submissions
  for each row execute function public.sync_points();

drop trigger if exists prepare_points on public.eco_research;
create trigger prepare_points before insert or update on public.eco_research
  for each row execute function public.prepare_research();
drop trigger if exists sync_points on public.eco_research;
create trigger sync_points after insert or update or delete on public.eco_research
  for each row execute function public.sync_points();

-- ───────────────────────────── 4. SAYT FUNKSIYALARI (RPC) ─────────────────────────────

-- Ro'yxatdan o'tishda maktab kodi bo'yicha sinflar
create or replace function public.get_school_classes_by_code(input_school_code text)
returns table (class_name text)
language sql stable security definer set search_path = public as $$
  select c.class_name
  from public.school_classes c
  join public.schools s on s.id = c.school_id
  where s.code = upper(trim(input_school_code))
  order by nullif(regexp_replace(c.class_name, '\D', '', 'g'), '')::int nulls last, c.class_name;
$$;

-- Umumiy natijalar (tizimga kirgan bo'lsa — o'z maktabi, aks holda barcha maktablar)
create or replace function public.get_school_overall_impact()
returns table (
  paper_kg numeric, plastic_kg numeric, recycling_kg numeric, recycling_points bigint,
  approved_challenges bigint, challenge_points bigint, total_points bigint, active_students bigint
)
language sql stable security definer set search_path = public as $$
  with scope as (select public.my_school_id() as sid),
  rec as (
    select r.* from public.recycling_submissions r, scope
    where r.status = 'approved' and (scope.sid is null or r.school_id = scope.sid)
  ),
  ch as (
    select cs.* from public.challenge_submissions cs
    join public.profiles p on p.id = cs.student_id, scope
    where cs.status = 'approved' and (scope.sid is null or p.school_id = scope.sid)
  ),
  st as (
    select p.* from public.profiles p, scope
    where p.role = 'student' and (scope.sid is null or p.school_id = scope.sid)
  )
  select
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec where material = 'paper'), 0),
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec where material = 'plastic'), 0),
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec), 0),
    coalesce((select sum(awarded_points) from rec), 0)::bigint,
    (select count(*) from ch),
    coalesce((select sum(awarded_points) from ch), 0)::bigint,
    coalesce((select sum(points) from st), 0)::bigint,
    (select count(*) from st where points > 0);
$$;

-- O'quvchilar reytingi (o'z maktabi)
create or replace function public.get_school_leaderboard()
returns table (student_id uuid, full_name text, class_name text, points integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.class_name, p.points
  from public.profiles p
  where auth.uid() is not null
    and p.role = 'student'
    and p.school_id = public.my_school_id()
  order by p.points desc, p.full_name
  limit 500;
$$;

-- Sinflar reytingi (o'z maktabi)
create or replace function public.get_school_class_leaderboard()
returns table (class_name text, student_count bigint, total_points bigint, recycling_kg numeric, approved_challenges bigint)
language sql stable security definer set search_path = public as $$
  select
    p.class_name,
    count(*) as student_count,
    coalesce(sum(p.points), 0)::bigint as total_points,
    coalesce((select sum(coalesce(r.verified_amount_kg, r.amount_kg))
              from public.recycling_submissions r
              join public.profiles q on q.id = r.student_id
              where r.status = 'approved' and q.school_id = public.my_school_id() and q.class_name = p.class_name), 0) as recycling_kg,
    (select count(*) from public.challenge_submissions cs
       join public.profiles q on q.id = cs.student_id
       where cs.status = 'approved' and q.school_id = public.my_school_id() and q.class_name = p.class_name) as approved_challenges
  from public.profiles p
  where auth.uid() is not null
    and p.role = 'student'
    and p.school_id = public.my_school_id()
    and coalesce(p.class_name, '') <> ''
  group by p.class_name
  order by total_points desc;
$$;

-- ───────────────────────────── 5. ADMIN: MAKTAB VA SINFLAR ─────────────────────────────

create or replace function public.admin_list_schools()
returns table (id text, name text, code text, students bigint, classes bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  return query
    select s.id::text, s.name, s.code,
           (select count(*) from public.profiles p where p.school_id = s.id),
           (select count(*) from public.school_classes c where c.school_id = s.id)
    from public.schools s order by s.name;
end $$;

create or replace function public.admin_save_school(p_id text, p_name text, p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_id   bigint;
  v_name text := trim(coalesce(p_name, ''));
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  if char_length(v_name) < 3 then raise exception 'Maktab nomini kiriting (kamida 3 belgi).'; end if;
  if v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'Kod 3–32 belgidan iborat bo''lsin: lotin harflari, raqamlar, - yoki _.';
  end if;
  if exists (select 1 from public.schools where code = v_code and (p_id is null or id::text <> p_id)) then
    raise exception 'Bu kod boshqa maktabda band.';
  end if;
  if p_id is null then
    insert into public.schools (name, code) values (v_name, v_code) returning id into v_id;
  else
    update public.schools set name = v_name, code = v_code where id::text = p_id returning id into v_id;
    if v_id is null then raise exception 'Maktab topilmadi.'; end if;
    update public.profiles set school_code = v_code where school_id = v_id;
  end if;
  return v_id::text;
end $$;

create or replace function public.admin_delete_school(p_id text)
returns void language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  select count(*) into n from public.profiles where school_id::text = p_id;
  if n > 0 then raise exception 'Bu maktabda % ta foydalanuvchi bor — avval ularni boshqa maktabga o''tkazing.', n; end if;
  delete from public.schools where id::text = p_id;
  if not found then raise exception 'Maktab topilmadi.'; end if;
end $$;

create or replace function public.admin_list_classes(p_school_id text)
returns table (id text, class_name text, students bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  return query
    select c.id::text, c.class_name,
           (select count(*) from public.profiles p where p.school_id = c.school_id and p.class_name = c.class_name)
    from public.school_classes c
    where c.school_id::text = p_school_id
    order by nullif(regexp_replace(c.class_name, '\D', '', 'g'), '')::int nulls last, c.class_name;
end $$;

create or replace function public.admin_add_classes(p_school_id text, p_names text)
returns int language plpgsql security definer set search_path = public as $$
declare v text; v_school bigint; added int := 0;
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  select id into v_school from public.schools where id::text = p_school_id;
  if v_school is null then raise exception 'Maktab topilmadi.'; end if;
  foreach v in array regexp_split_to_array(coalesce(p_names, ''), '[,;\n]+') loop
    v := upper(trim(v));
    continue when v = '';
    if char_length(v) > 20 then raise exception 'Sinf nomi juda uzun: %', v; end if;
    insert into public.school_classes (school_id, class_name) values (v_school, v) on conflict do nothing;
    if found then added := added + 1; end if;
  end loop;
  return added;
end $$;

create or replace function public.admin_rename_class(p_id text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_new text := upper(trim(coalesce(p_name, ''))); v_old text; v_school bigint;
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  if v_new = '' or char_length(v_new) > 20 then raise exception 'Sinf nomi 1–20 belgi bo''lsin.'; end if;
  select class_name, school_id into v_old, v_school from public.school_classes where id::text = p_id;
  if v_old is null then raise exception 'Sinf topilmadi.'; end if;
  if v_old = v_new then return; end if;
  if exists (select 1 from public.school_classes where school_id = v_school and class_name = v_new) then
    raise exception 'Bu maktabda % sinfi allaqachon bor.', v_new;
  end if;
  update public.school_classes set class_name = v_new where id::text = p_id;
  update public.profiles set class_name = v_new where school_id = v_school and class_name = v_old;
end $$;

create or replace function public.admin_delete_class(p_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_school bigint; n bigint;
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q'; end if;
  select class_name, school_id into v_name, v_school from public.school_classes where id::text = p_id;
  if v_name is null then raise exception 'Sinf topilmadi.'; end if;
  select count(*) into n from public.profiles where school_id = v_school and class_name = v_name;
  if n > 0 then raise exception 'Bu sinfda % ta o''quvchi bor — avval ularni boshqa sinfga o''tkazing.', n; end if;
  delete from public.school_classes where id::text = p_id;
end $$;

-- Funksiyalarga ruxsat
revoke all on function public.is_admin(), public.my_school_id(), public.handle_new_user(),
  public.admin_list_schools(), public.admin_save_school(text, text, text), public.admin_delete_school(text),
  public.admin_list_classes(text), public.admin_add_classes(text, text), public.admin_rename_class(text, text),
  public.admin_delete_class(text), public.get_school_leaderboard(), public.get_school_class_leaderboard()
  from public, anon;
grant execute on function public.is_admin(), public.my_school_id(),
  public.admin_list_schools(), public.admin_save_school(text, text, text), public.admin_delete_school(text),
  public.admin_list_classes(text), public.admin_add_classes(text, text), public.admin_rename_class(text, text),
  public.admin_delete_class(text), public.get_school_leaderboard(), public.get_school_class_leaderboard()
  to authenticated;
grant execute on function public.get_school_classes_by_code(text), public.get_school_overall_impact() to anon, authenticated;

-- ───────────────────────────── 6. XAVFSIZLIK (RLS) ─────────────────────────────

alter table public.schools               enable row level security;
alter table public.school_classes        enable row level security;
alter table public.profiles              enable row level security;
alter table public.challenges            enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.recycling_submissions enable row level security;
alter table public.eco_research          enable row level security;
alter table public.eco_events            enable row level security;
alter table public.site_content          enable row level security;

grant select on public.site_content to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

do $$
declare r record;
begin
  -- shu fayl yaratgan eski siyosatlarni tozalaymiz (qayta ishga tushirish uchun)
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and policyname like 'eco_%' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Maktab va sinflar: tizimga kirganlar ko'radi, admin boshqaradi
create policy eco_schools_read   on public.schools        for select to authenticated using (true);
create policy eco_schools_admin  on public.schools        for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy eco_classes_read   on public.school_classes for select to authenticated using (true);
create policy eco_classes_admin  on public.school_classes for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profil: o'zinikini ko'radi; admin hammasini ko'radi va tahrirlaydi
create policy eco_profiles_own   on public.profiles for select to authenticated using (id = auth.uid());
create policy eco_profiles_admin on public.profiles for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Challenge'lar: hamma ko'radi, admin boshqaradi
create policy eco_challenges_read  on public.challenges for select to authenticated using (true);
create policy eco_challenges_admin on public.challenges for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Challenge topshiriqlari: o'zinikini ko'radi va yuboradi; tasdiqlash faqat admin
create policy eco_chsub_own_read   on public.challenge_submissions for select to authenticated using (student_id = auth.uid());
create policy eco_chsub_own_insert on public.challenge_submissions for insert to authenticated with check (student_id = auth.uid());
create policy eco_chsub_admin      on public.challenge_submissions for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Recycling: o'zinikini ko'radi va yuboradi; tasdiqlash faqat admin
create policy eco_rec_own_read   on public.recycling_submissions for select to authenticated using (student_id = auth.uid());
create policy eco_rec_own_insert on public.recycling_submissions for insert to authenticated with check (student_id = auth.uid());
create policy eco_rec_admin      on public.recycling_submissions for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tadqiqotlar: nashr qilinganlarni hamma ko'radi; o'zinikini ko'radi va yuboradi; admin boshqaradi
create policy eco_research_read       on public.eco_research for select to authenticated using (status = 'published' or student_id = auth.uid());
create policy eco_research_own_insert on public.eco_research for insert to authenticated with check (student_id = auth.uid());
create policy eco_research_admin      on public.eco_research for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tadbirlar: hamma ko'radi, admin boshqaradi
create policy eco_events_read  on public.eco_events for select to authenticated using (true);
create policy eco_events_admin on public.eco_events for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Sahifa matnlari: hamma ko'radi (kirmaganlar ham), admin o'zgartiradi
create policy eco_content_read  on public.site_content for select to anon, authenticated using (true);
create policy eco_content_admin on public.site_content for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── 7. RASMLAR (Storage) ─────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('challenge-proofs', 'challenge-proofs', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']),
  ('recycling-proofs', 'recycling-proofs', false, 5242880,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists eco_proofs_insert on storage.objects;
drop policy if exists eco_proofs_read   on storage.objects;
drop policy if exists eco_proofs_delete on storage.objects;

-- O'quvchi faqat o'z papkasiga (user-id/...) yuklaydi
create policy eco_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('challenge-proofs', 'recycling-proofs') and (storage.foldername(name))[1] = auth.uid()::text);
-- O'zinikini yoki admin hammasini ko'radi
create policy eco_proofs_read on storage.objects for select to authenticated
  using (bucket_id in ('challenge-proofs', 'recycling-proofs') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- O'zinikini (xato bo'lsa) yoki admin o'chiradi
create policy eco_proofs_delete on storage.objects for delete to authenticated
  using (bucket_id in ('challenge-proofs', 'recycling-proofs') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ───────────────────────────── 8. BOSHLANG'ICH MA'LUMOTLAR ─────────────────────────────

-- Birinchi maktab (nomi va kodini keyin admin paneldan o'zgartirasiz)
insert into public.schools (name, code) values ('ECO SCHOOL', 'ECOIXMI') on conflict (code) do nothing;

insert into public.school_classes (school_id, class_name)
select s.id, g || '-' || l
from public.schools s, generate_series(5, 11) g, unnest(array['A', 'B']) l
where s.code = 'ECOIXMI'
on conflict do nothing;

-- Namuna challenge'lar (faqat jadval bo'sh bo'lsa)
insert into public.challenges (title, description, category, points)
select * from (values
  ('Plastiksiz bir hafta', 'Bir hafta davomida bir martalik plastik idishlardan foydalanmang — suvni o‘z idishingizda olib yuring.', 'Chiqindilar', 30),
  ('Chiroqni o‘chir!', 'Tanaffusda va darsdan keyin sinf chiroqlari hamda proyektor o‘chirilishini nazorat qiling.', 'Energiya', 15),
  ('Qog‘ozni asraymiz', 'Bir oy davomida daftarning ikki tomoniga yozing va eski qog‘ozni recyclingga topshiring.', 'Resurslar', 20)
) as v(title, description, category, points)
where not exists (select 1 from public.challenges);

-- ───────────────────────────── 9. LOGIN, MENTOR, BOSH ADMIN ─────────────────────────────

-- ── 1. Ustunlar va cheklovlar ──
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists is_owner boolean not null default false;

alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (username is null or username ~ '^[a-z0-9_.]{3,24}$');
create unique index if not exists profiles_username_key on public.profiles (username);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'mentor', 'admin'));

-- ── 2. Yordamchi funksiyalar ──
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_owner and role = 'admin');
$$;

-- Ro'yxatdan o'tganda profil + login yoziladi
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code   text := upper(trim(coalesce(new.raw_user_meta_data ->> 'school_code', '')));
  v_user   text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_school bigint;
begin
  select id into v_school from public.schools where code = v_code;
  if v_user !~ '^[a-z0-9_.]{3,24}$' then v_user := null; end if;
  insert into public.profiles (id, full_name, class_name, school_code, school_id, username)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80),
    left(upper(trim(coalesce(new.raw_user_meta_data ->> 'class_name', ''))), 20),
    nullif(v_code, ''),
    v_school,
    v_user
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Profil himoyasi:
--  • oddiy foydalanuvchi o'z roli, bali, maktabini o'zgartira olmaydi
--  • login va "bosh admin" belgisini sayt orqali hech kim o'zgartira olmaydi
--  • bosh adminning rolini sayt orqali hech kim (o'zi ham) o'zgartira olmaydi
--  • adminlarning rolini faqat bosh admin o'zgartiradi
--  (SQL Editor'da auth.uid() bo'sh — u yerdan hammasi mumkin)
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eco.points_sync', true), '') = '1' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  new.is_owner := old.is_owner;
  new.username := old.username;
  if new.role is distinct from old.role then
    if old.is_owner then
      raise exception 'Bosh adminning rolini o''zgartirib bo''lmaydi' using errcode = '42501';
    end if;
    if (old.role = 'admin' or new.role = 'admin') and not public.is_owner() then
      raise exception 'Adminlarni faqat bosh admin tayinlaydi yoki olib tashlaydi' using errcode = '42501';
    end if;
  end if;
  if not public.is_admin() then
    new.role      := old.role;
    new.points    := old.points;
    new.school_id := old.school_id;
  end if;
  return new;
end $$;

-- Bosh admin profilini sayt orqali o'chirib bo'lmaydi
create or replace function public.protect_owner_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_owner and auth.uid() is not null then
    raise exception 'Bosh adminni o''chirib bo''lmaydi' using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists protect_owner_delete on public.profiles;
create trigger protect_owner_delete
  before delete on public.profiles
  for each row execute function public.protect_owner_delete();

-- ── 3. Tekshiruv: admin VA mentor ball bera oladi ──
create or replace function public.prepare_challenge_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.reviewed_by := null; new.reviewed_at := null;
    end if;
    return new;
  end if;
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status <> 'approved' then
      select points into new.awarded_points from public.challenges where id = new.challenge_id;
    end if;
  else
    new.awarded_points := 0;
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now(); new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end $$;

create or replace function public.prepare_recycling_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.verified_amount_kg := null;
      new.reviewed_by := null; new.reviewed_at := null;
      new.school_id := public.my_school_id();
    end if;
    return new;
  end if;
  if new.status = 'approved' then
    new.awarded_points := round(coalesce(new.verified_amount_kg, new.amount_kg) * 25);
  else
    new.awarded_points := 0;
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now(); new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end $$;

create or replace function public.prepare_research()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.awarded_points := 0; new.reviewer_feedback := null; new.reviewed_at := null;
    end if;
    return new;
  end if;
  new.awarded_points := case when new.status = 'published' then least(100, greatest(0, coalesce(new.awarded_points, 0))) else 0 end;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now();
  end if;
  return new;
end $$;

-- ── 4. Parolni tiklash (email yo'qligi uchun) ──
--  • admin — o'quvchi va mentor parolini tiklaydi
--  • bosh admin — adminlar parolini ham (boshqa bosh adminnikini emas)
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  t public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Ruxsat yo''q' using errcode = '42501';
  end if;
  if char_length(coalesce(p_password, '')) < 8 or char_length(p_password) > 72 then
    raise exception 'Parol 8–72 ta belgidan iborat bo''lishi kerak';
  end if;
  select * into t from public.profiles where id = p_user;
  if not found then
    raise exception 'Foydalanuvchi topilmadi';
  end if;
  if t.is_owner and p_user <> auth.uid() then
    raise exception 'Bosh adminning parolini o''zgartirib bo''lmaydi' using errcode = '42501';
  end if;
  if t.role = 'admin' and p_user <> auth.uid() and not public.is_owner() then
    raise exception 'Admin parolini faqat bosh admin tiklaydi' using errcode = '42501';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
end $$;

revoke all on function public.is_staff(), public.is_owner(), public.admin_set_password(uuid, text),
  public.protect_owner_delete() from public, anon;
grant execute on function public.is_staff(), public.is_owner(), public.admin_set_password(uuid, text) to authenticated;

-- ── 5. Ruxsatlar (RLS): mentor tekshiruv bo'limlarini ko'radi ──
drop policy if exists eco_profiles_staff_read on public.profiles;
create policy eco_profiles_staff_read on public.profiles for select to authenticated using (public.is_staff());

drop policy if exists eco_chsub_staff on public.challenge_submissions;
create policy eco_chsub_staff on public.challenge_submissions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists eco_rec_staff on public.recycling_submissions;
create policy eco_rec_staff on public.recycling_submissions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists eco_research_staff on public.eco_research;
create policy eco_research_staff on public.eco_research for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists eco_proofs_read on storage.objects;
create policy eco_proofs_read on storage.objects for select to authenticated
  using (bucket_id in ('challenge-proofs', 'recycling-proofs')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));


-- ───────────────────────────── 10. SINF RECYCLING ─────────────────────────────

-- ── 1. Jadval: sinf yozuvi uchun ustunlar ──
alter table public.recycling_submissions alter column student_id drop not null;
alter table public.recycling_submissions add column if not exists class_name text;
alter table public.recycling_submissions add column if not exists note text;

alter table public.recycling_submissions drop constraint if exists recycling_owner_check;
alter table public.recycling_submissions add constraint recycling_owner_check
  check (student_id is not null or char_length(coalesce(class_name, '')) between 1 and 20);
alter table public.recycling_submissions drop constraint if exists recycling_note_check;
alter table public.recycling_submissions add constraint recycling_note_check
  check (note is null or char_length(note) <= 300);

create index if not exists idx_rec_sub_class on public.recycling_submissions (school_id, class_name);

-- ── 2. Ruxsatlar: o'quvchi yubora olmaydi, maktab natijalarini ko'radi ──
drop policy if exists eco_rec_own_insert on public.recycling_submissions;

drop policy if exists eco_rec_school_read on public.recycling_submissions;
create policy eco_rec_school_read on public.recycling_submissions for select to authenticated
  using (status = 'approved' and student_id is null and school_id = public.my_school_id());

-- ── 3. Kiritishdagi qoidalar ──
create or replace function public.prepare_recycling_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Saytdan faqat admin yoki mentor kiritadi (SQL Editor'da auth.uid() bo'sh — ruxsat)
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      raise exception 'Recyclingni faqat Eco Team (admin yoki mentor) kiritadi' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.class_name is not null then
    new.class_name := upper(trim(new.class_name));
  end if;
  new.note := nullif(trim(coalesce(new.note, '')), '');

  if tg_op = 'INSERT' then
    new.school_id := coalesce(public.my_school_id(), new.school_id);
    -- Admin hech qaysi maktabga bog'lanmagan bo'lsa va maktab bitta bo'lsa — o'sha
    if new.school_id is null and (select count(*) from public.schools) = 1 then
      select id into new.school_id from public.schools limit 1;
    end if;
    if new.student_id is null then
      if not exists (select 1 from public.school_classes c
                     where c.school_id = new.school_id and c.class_name = new.class_name) then
        raise exception 'Bunday sinf topilmadi: %', new.class_name;
      end if;
      -- Eco Team o'zi o'lchab kiritadi — darhol tasdiqlangan
      new.status := 'approved';
      new.verified_amount_kg := coalesce(new.verified_amount_kg, new.amount_kg);
      new.reviewed_at := now();
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    end if;
  end if;

  if new.status = 'approved' then
    new.awarded_points := round(coalesce(new.verified_amount_kg, new.amount_kg) * 25);
  else
    new.awarded_points := 0;
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_at := now(); new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
  end if;
  return new;
end $$;

-- ── 4. Sinflar ro'yxati (admin va mentor formasi uchun) ──
create or replace function public.get_my_school_classes()
returns table (class_name text)
language sql stable security definer set search_path = public as $$
  select c.class_name
  from public.school_classes c
  where auth.uid() is not null and c.school_id = public.my_school_id()
  order by nullif(regexp_replace(c.class_name, '\D', '', 'g'), '')::int nulls last, c.class_name;
$$;

-- ── 5. Sinflar bo'yicha recycling natijalari (sayt sahifasi uchun) ──
create or replace function public.get_class_recycling()
returns table (class_name text, paper_kg numeric, plastic_kg numeric, total_kg numeric, points bigint, entries bigint)
language sql stable security definer set search_path = public as $$
  select x.cls,
         coalesce(sum(x.kg) filter (where x.material = 'paper'), 0),
         coalesce(sum(x.kg) filter (where x.material = 'plastic'), 0),
         coalesce(sum(x.kg), 0),
         coalesce(sum(x.pts), 0)::bigint,
         count(*)
  from (
    select coalesce(r.class_name, q.class_name) as cls, r.material,
           coalesce(r.verified_amount_kg, r.amount_kg) as kg, r.awarded_points as pts
    from public.recycling_submissions r
    left join public.profiles q on q.id = r.student_id
    where auth.uid() is not null and r.status = 'approved' and r.school_id = public.my_school_id()
  ) x
  where coalesce(x.cls, '') <> ''
  group by x.cls
  order by 4 desc, 1;
$$;

-- ── 6. Sinflar reytingi: sinfga yozilgan recycling ballari ham qo'shiladi ──
create or replace function public.get_school_class_leaderboard()
returns table (class_name text, student_count bigint, total_points bigint, recycling_kg numeric, approved_challenges bigint)
language sql stable security definer set search_path = public as $$
  with sid as (select public.my_school_id() as id),
  cls as (
    select c.class_name as cn from public.school_classes c, sid where c.school_id = sid.id
    union
    select p.class_name from public.profiles p, sid
    where p.school_id = sid.id and p.role = 'student' and coalesce(p.class_name, '') <> ''
  ),
  st as (
    select p.class_name as cn, count(*) as n, coalesce(sum(p.points), 0) as pts
    from public.profiles p, sid
    where p.school_id = sid.id and p.role = 'student'
    group by p.class_name
  ),
  rec as (
    select coalesce(r.class_name, q.class_name) as cn,
           sum(coalesce(r.verified_amount_kg, r.amount_kg)) as kg,
           sum(case when r.student_id is null then r.awarded_points else 0 end) as cls_pts
    from public.recycling_submissions r
    left join public.profiles q on q.id = r.student_id
    cross join sid
    where r.status = 'approved' and r.school_id = sid.id
    group by 1
  ),
  ch as (
    select q.class_name as cn, count(*) as n
    from public.challenge_submissions cs
    join public.profiles q on q.id = cs.student_id
    cross join sid
    where cs.status = 'approved' and q.school_id = sid.id
    group by q.class_name
  )
  select cls.cn,
         coalesce(st.n, 0)::bigint,
         (coalesce(st.pts, 0) + coalesce(rec.cls_pts, 0))::bigint,
         coalesce(rec.kg, 0),
         coalesce(ch.n, 0)::bigint
  from cls
  left join st  on st.cn  = cls.cn
  left join rec on rec.cn = cls.cn
  left join ch  on ch.cn  = cls.cn
  where auth.uid() is not null
  order by 3 desc, 1;
$$;

-- ── 7. Umumiy natijalar: sinf recycling ballari ham hisobga olinadi ──
create or replace function public.get_school_overall_impact()
returns table (
  paper_kg numeric, plastic_kg numeric, recycling_kg numeric, recycling_points bigint,
  approved_challenges bigint, challenge_points bigint, total_points bigint, active_students bigint
)
language sql stable security definer set search_path = public as $$
  with scope as (select public.my_school_id() as sid),
  rec as (
    select r.* from public.recycling_submissions r, scope
    where r.status = 'approved' and (scope.sid is null or r.school_id = scope.sid)
  ),
  ch as (
    select cs.* from public.challenge_submissions cs
    join public.profiles p on p.id = cs.student_id, scope
    where cs.status = 'approved' and (scope.sid is null or p.school_id = scope.sid)
  ),
  st as (
    select p.* from public.profiles p, scope
    where p.role = 'student' and (scope.sid is null or p.school_id = scope.sid)
  )
  select
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec where material = 'paper'), 0),
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec where material = 'plastic'), 0),
    coalesce((select sum(coalesce(verified_amount_kg, amount_kg)) from rec), 0),
    coalesce((select sum(awarded_points) from rec), 0)::bigint,
    (select count(*) from ch),
    coalesce((select sum(awarded_points) from ch), 0)::bigint,
    (coalesce((select sum(points) from st), 0)
     + coalesce((select sum(awarded_points) from rec where student_id is null), 0))::bigint,
    (select count(*) from st where points > 0);
$$;

revoke all on function public.get_my_school_classes(), public.get_class_recycling() from public, anon;
grant execute on function public.get_my_school_classes(), public.get_class_recycling(),
  public.get_school_class_leaderboard(), public.get_school_overall_impact() to authenticated;
grant execute on function public.get_school_overall_impact() to anon;



-- ───────────────────────────── 11. MENTORLAR (domlalar) ─────────────────────────────

create table if not exists public.mentors (
  id          bigint generated always as identity primary key,
  full_name   text not null check (char_length(trim(full_name)) between 2 and 80),
  subject     text check (subject is null or char_length(subject) <= 80),
  bio         text check (bio is null or char_length(bio) <= 500),
  photo_url   text check (photo_url is null or (char_length(photo_url) <= 500 and photo_url ~ '^https://')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.mentors enable row level security;

drop policy if exists eco_mentors_read  on public.mentors;
drop policy if exists eco_mentors_admin on public.mentors;
create policy eco_mentors_read  on public.mentors for select to anon, authenticated using (true);
create policy eco_mentors_admin on public.mentors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.mentors to anon, authenticated;
grant insert, update, delete on public.mentors to authenticated;

-- Rasmlar: ochiq papka, yuklash/o'chirish faqat admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('mentor-photos', 'mentor-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists eco_mentor_photos_insert on storage.objects;
drop policy if exists eco_mentor_photos_update on storage.objects;
drop policy if exists eco_mentor_photos_delete on storage.objects;
create policy eco_mentor_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'mentor-photos' and public.is_admin());
create policy eco_mentor_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'mentor-photos' and public.is_admin());
create policy eco_mentor_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'mentor-photos' and public.is_admin());


-- ───────────────────────────── 12. O'YIN, RECYCLING PARTIYALARI, GREEN FLAG ─────────────────────────────

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


-- ───────────────────────────── 13. VOLONTYORLAR, TIMO DUNYOSI O'YINI ─────────────────────────────
-- ═════════ 1. VOLONTYOR ROLI ═════════
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'mentor', 'admin', 'volunteer'));

create or replace function public.is_volunteer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'volunteer');
$$;

create table if not exists public.volunteer_logs (
  id                bigint generated always as identity primary key,
  student_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  school_id         bigint references public.schools(id) on delete cascade,
  work_date         date not null default current_date,
  title             text not null check (char_length(trim(title)) between 3 and 160),
  description       text check (description is null or char_length(description) <= 2000),
  hours             numeric(5,2) not null check (hours > 0 and hours <= 12),
  approved_hours    numeric(5,2) check (approved_hours is null or (approved_hours >= 0 and approved_hours <= 12)),
  proof_url         text check (proof_url is null or char_length(proof_url) <= 300),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  awarded_points    integer not null default 0 check (awarded_points between 0 and 100),
  reviewer_feedback text check (reviewer_feedback is null or char_length(reviewer_feedback) <= 1000),
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  submitted_at      timestamptz not null default now()
);
create index if not exists volunteer_logs_student_idx on public.volunteer_logs (student_id);
create index if not exists volunteer_logs_status_idx on public.volunteer_logs (status);

-- Yozish qoidalari: volontyor faqat "kutilmoqda" holatida, o'z nomidan yozadi
create or replace function public.prepare_volunteer_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.student_id := old.student_id;
    new.school_id  := old.school_id;
    new.submitted_at := old.submitted_at;
  end if;

  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if not public.is_volunteer() then
        raise exception 'Faqat volontyorlar ish soatini yubora oladi' using errcode = '42501';
      end if;
      new.student_id := auth.uid();
      new.school_id  := public.my_school_id();
      new.submitted_at := now();
    elsif old.status <> 'pending' then
      raise exception 'Tekshirilgan yozuvni o''zgartirib bo''lmaydi' using errcode = '42501';
    end if;
    if new.work_date > current_date then
      raise exception 'Kelajakdagi sana kiritib bo''lmaydi';
    end if;
    new.status := 'pending';
    new.awarded_points := 0;
    new.approved_hours := null;
    new.reviewer_feedback := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- Admin
  if new.school_id is null then
    new.school_id := (select school_id from public.profiles where id = new.student_id);
  end if;
  if new.status = 'approved' then
    new.approved_hours := least(new.hours, coalesce(new.approved_hours, new.hours));
    new.awarded_points := least(100, greatest(0, coalesce(new.awarded_points, 0)));
  else
    new.approved_hours := null;
    new.awarded_points := 0;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'pending' then null else now() end;
    new.reviewed_by := case when new.status = 'pending' then null else auth.uid() end;
  end if;
  return new;
end $$;

drop trigger if exists prepare_volunteer on public.volunteer_logs;
create trigger prepare_volunteer before insert or update on public.volunteer_logs
  for each row execute function public.prepare_volunteer_log();
-- Ball profilga mavjud umumiy funksiya orqali yoziladi (tasdiq/qaytarish/o'chirish)
drop trigger if exists sync_points on public.volunteer_logs;
create trigger sync_points after insert or update or delete on public.volunteer_logs
  for each row execute function public.sync_points();

alter table public.volunteer_logs enable row level security;
drop policy if exists eco_vol_own_read on public.volunteer_logs;
drop policy if exists eco_vol_own_insert on public.volunteer_logs;
drop policy if exists eco_vol_own_update on public.volunteer_logs;
drop policy if exists eco_vol_own_delete on public.volunteer_logs;
drop policy if exists eco_vol_admin on public.volunteer_logs;
create policy eco_vol_own_read on public.volunteer_logs for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
create policy eco_vol_own_insert on public.volunteer_logs for insert to authenticated
  with check (student_id = auth.uid() and public.is_volunteer());
create policy eco_vol_own_update on public.volunteer_logs for update to authenticated
  using (student_id = auth.uid() and status = 'pending') with check (student_id = auth.uid());
create policy eco_vol_own_delete on public.volunteer_logs for delete to authenticated
  using (student_id = auth.uid() and status = 'pending');
create policy eco_vol_admin on public.volunteer_logs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.volunteer_logs to authenticated;

-- Ish rasmlari (yopiq papka: faqat egasi va admin ko'radi)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('volunteer-proofs', 'volunteer-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists eco_vol_proofs_insert on storage.objects;
drop policy if exists eco_vol_proofs_read on storage.objects;
drop policy if exists eco_vol_proofs_delete on storage.objects;
create policy eco_vol_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'volunteer-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy eco_vol_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'volunteer-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy eco_vol_proofs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'volunteer-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Volontyorlar reytingi (faqat tasdiqlangan soatlar)
create or replace function public.get_volunteer_board()
returns table (student_id uuid, full_name text, hours numeric, entries bigint, points bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name,
         coalesce(sum(v.approved_hours), 0),
         count(v.id),
         coalesce(sum(v.awarded_points), 0)::bigint
  from public.profiles p
  left join public.volunteer_logs v on v.student_id = p.id and v.status = 'approved'
  where p.role = 'volunteer'
    and (p.school_id = public.my_school_id() or public.my_school_id() is null)
    and auth.uid() is not null
  group by p.id, p.full_name
  order by 3 desc, 2;
$$;

-- Bitta volontyorning jami tasdiqlangan soati (profil va sertifikat uchun)
create or replace function public.my_volunteer_hours(p_user uuid default null)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(approved_hours), 0) from public.volunteer_logs
  where status = 'approved'
    and student_id = coalesce(p_user, auth.uid())
    and (coalesce(p_user, auth.uid()) = auth.uid() or public.is_staff());
$$;

-- ═════════ 2. TIMO DUNYOSI O'YINI ═════════
create table if not exists public.game_scores (
  student_id       uuid primary key references public.profiles(id) on delete cascade,
  best             integer not null default 0 check (best between 0 and 100000),
  plays            integer not null default 0,
  last_reward_date date,
  updated_at       timestamptz not null default now()
);
alter table public.game_scores enable row level security;
drop policy if exists eco_game_own on public.game_scores;
create policy eco_game_own on public.game_scores for select to authenticated using (student_id = auth.uid());
grant select on public.game_scores to authenticated;

-- O'yin natijasini saqlash. Qaytaradi: eng yaxshi natija, bugungi mukofot (0 — berilmagan)
create or replace function public.submit_game_score(p_score integer)
returns table (best integer, reward integer, rewarded_today boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_score  integer := least(greatest(coalesce(p_score, 0), 0), 20000);
  v_reward integer := 0;
  v_row    public.game_scores;
begin
  if auth.uid() is null then
    raise exception 'Avval kiring' using errcode = '42501';
  end if;

  insert into public.game_scores (student_id) values (auth.uid()) on conflict (student_id) do nothing;
  select * into v_row from public.game_scores where student_id = auth.uid() for update;

  -- Kuniga bir marta: 100 ochkoga 1 ball, ko'pi bilan 10 ball (kamida 100 ochko kerak)
  if v_score >= 100 and (v_row.last_reward_date is null or v_row.last_reward_date < current_date) then
    v_reward := least(10, v_score / 100);
  end if;

  update public.game_scores g
     set best = greatest(g.best, v_score),
         plays = g.plays + 1,
         last_reward_date = case when v_reward > 0 then current_date else g.last_reward_date end,
         updated_at = now()
   where g.student_id = auth.uid()
  returning * into v_row;

  if v_reward > 0 then
    perform set_config('eco.points_sync', '1', true);
    update public.profiles set points = points + v_reward where id = auth.uid();
    perform set_config('eco.points_sync', '', true);
  end if;

  return query select v_row.best, v_reward, (v_row.last_reward_date = current_date);
end $$;

-- Maktab bo'yicha eng yaxshi o'yinchilar
create or replace function public.get_game_top()
returns table (student_id uuid, full_name text, class_name text, best integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.class_name, g.best
  from public.game_scores g
  join public.profiles p on p.id = g.student_id
  where g.best > 0
    and auth.uid() is not null
    and (p.school_id = public.my_school_id() or public.my_school_id() is null)
  order by g.best desc, g.updated_at
  limit 10;
$$;

revoke all on function public.is_volunteer(), public.get_volunteer_board(), public.my_volunteer_hours(uuid),
  public.submit_game_score(integer), public.get_game_top() from public, anon;
grant execute on function public.is_volunteer(), public.get_volunteer_board(), public.my_volunteer_hours(uuid),
  public.submit_game_score(integer), public.get_game_top() to authenticated;

-- ───────────────────────────── 14. TIMO: SHAXSIY YORDAMCHI VA VIRTUAL BOG' ─────────────────────────────


create table if not exists public.timo_profiles (
  student_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  outfit     text not null default 'none' check (outfit in ('none', 'leaf', 'cap', 'explorer', 'grad', 'crown')),
  updated_at timestamptz not null default now()
);

alter table public.timo_profiles enable row level security;
drop policy if exists eco_timo_own on public.timo_profiles;
create policy eco_timo_own on public.timo_profiles for select to authenticated using (student_id = auth.uid());
-- Yozish faqat set_timo_outfit() orqali (to'g'ridan-to'g'ri insert/update yo'q)
revoke insert, update, delete on public.timo_profiles from authenticated, anon;
grant select on public.timo_profiles to authenticated;

-- Kiyim uchun kerakli XP (lib/timo.ts bilan bir xil)
create or replace function public.timo_outfit_min(p_outfit text)
returns integer language sql immutable as $$
  select case p_outfit
    when 'none' then 0 when 'leaf' then 100 when 'cap' then 300
    when 'explorer' then 700 when 'grad' then 1500 when 'crown' then 3000
    else null end;
$$;

-- Timo holati: ishlar soni, XP va tanlangan kiyim
create or replace function public.get_timo_state()
returns table (tasks integer, challenges integer, research integer, volunteer integer, xp integer, outfit text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ch  integer := 0;
  v_rs  integer := 0;
  v_vol integer := 0;
  v_xp  integer := 0;
  v_out text := 'none';
begin
  if v_uid is null then
    raise exception 'Avval kiring' using errcode = '42501';
  end if;
  select count(*) into v_ch from public.challenge_submissions where student_id = v_uid and status = 'approved';
  select count(*) into v_rs from public.eco_research where student_id = v_uid and status = 'published';
  if to_regclass('public.volunteer_logs') is not null then
    execute 'select count(*) from public.volunteer_logs where student_id = $1 and status = ''approved'''
      into v_vol using v_uid;
  end if;
  select coalesce(points, 0) into v_xp from public.profiles where id = v_uid;
  select t.outfit into v_out from public.timo_profiles t where t.student_id = v_uid;
  -- Daraja keyinroq tushgan bo'lsa (ball qaytarilgan), kiyim ko'rinmaydi, lekin saqlanib qoladi
  if v_out is null or public.timo_outfit_min(v_out) > v_xp then
    v_out := 'none';
  end if;
  return query select v_ch + v_rs + v_vol, v_ch, v_rs, v_vol, v_xp, v_out;
end $$;

-- Kiyimni tanlash (faqat ochilgan bo'lsa)
create or replace function public.set_timo_outfit(p_outfit text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_min integer := public.timo_outfit_min(p_outfit);
  v_xp  integer;
begin
  if auth.uid() is null then
    raise exception 'Avval kiring' using errcode = '42501';
  end if;
  if v_min is null then
    raise exception 'Bunday kiyim yo''q';
  end if;
  select coalesce(points, 0) into v_xp from public.profiles where id = auth.uid();
  if v_xp < v_min then
    raise exception 'Bu kiyim hali ochilmagan' using errcode = '42501';
  end if;
  insert into public.timo_profiles (student_id, outfit, updated_at)
  values (auth.uid(), p_outfit, now())
  on conflict (student_id) do update set outfit = excluded.outfit, updated_at = now();
  return p_outfit;
end $$;

revoke all on function public.get_timo_state(), public.set_timo_outfit(text), public.timo_outfit_min(text) from public, anon;
grant execute on function public.get_timo_state(), public.set_timo_outfit(text), public.timo_outfit_min(text) to authenticated;


commit;

-- Supabase API yangi jadval va funksiyalarni darhol ko'rishi uchun
notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════
--  BIRINCHI (BOSH) ADMINNI TAYINLASH — saytda ro'yxatdan o'tganingizdan KEYIN, alohida.
--  Login bilan ro'yxatdan o'tgan bo'lsangiz (masalan "naiden"):
--
--    update public.profiles set role = 'admin', is_owner = true where username = 'naiden';
--
--  Bosh adminni sayt orqali hech kim adminlikdan ololmaydi va o'chira olmaydi.
-- ═══════════════════════════════════════════════════════════════════════════
