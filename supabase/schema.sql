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
