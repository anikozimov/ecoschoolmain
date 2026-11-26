-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — VOLONTYORLAR va "TIMO DUNYOSI" O'YINI
--
--  Supabase → SQL Editor → New query → shu faylni to'liq qo'ying → Run.
--  Qayta ishga tushirish xavfsiz. Mavjud ma'lumotlar o'chirilmaydi.
--
--  1) Yangi rol: volunteer (volontyor). Admin "Foydalanuvchilar"da tayinlaydi.
--     Volontyor qilgan ishini + necha soat ishlaganini yuboradi, admin tekshiradi:
--     tasdiqlansa soat hisobga olinadi va (ixtiyoriy) ball beriladi.
--  2) Timo dunyosi o'yini: eng yaxshi natija saqlanadi, kuniga 1 marta
--     kichik mukofot (ko'pi bilan 10 ball) beriladi.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

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

commit;

notify pgrst, 'reload schema';
