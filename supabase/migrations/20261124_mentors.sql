-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — "MENTORLAR" BO'LIMI (loyihaga yordam bergan domlalar)
--
--  Supabase → SQL Editor → New query → shu faylni to'liq qo'ying → Run.
--  Qayta ishga tushirish xavfsiz.
--
--  • Saytda "Mentorlar" sahifasi: ism, fani/lavozimi, qisqa ma'lumot, rasm
--  • Hamma ko'radi (kirmagan mehmon ham), faqat admin qo'shadi/tahrirlaydi
--  • Rasmlar ochiq "mentor-photos" papkasida saqlanadi
-- ═══════════════════════════════════════════════════════════════════════════

begin;

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

commit;

notify pgrst, 'reload schema';
