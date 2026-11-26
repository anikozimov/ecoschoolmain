-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — TIMO: SHAXSIY YORDAMCHI VA VIRTUAL BOG'
--
--  Supabase → SQL Editor → New query → shu faylni to'liq qo'ying → Run.
--  Qayta ishga tushirish xavfsiz. Mavjud ma'lumotlar o'chirilmaydi.
--  (20261127_volunteers_game.sql dan keyin ishga tushiring.)
--
--  • Bog' elementlari tasdiqlangan ishlar soniga qarab ochiladi:
--    challenge (tasdiqlangan) + tadqiqot (nashr) + volontyorlik (tasdiqlangan).
--  • Hisob faqat serverda yuritiladi — o'quvchi uni o'zi o'zgartira olmaydi.
--  • Hech narsa kamaymaydi: ochilgan element yo'qolmaydi, faol bo'lmaslik jazolanmaydi.
--  • Timo kiyimi darajaga (XP) qarab ochiladi va server tomonda tekshiriladi.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

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

notify pgrst, 'reload schema';
