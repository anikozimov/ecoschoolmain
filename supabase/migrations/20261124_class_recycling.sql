-- ═══════════════════════════════════════════════════════════════════════════
--  ECO SCHOOL — RECYCLING SINFLAR UCHUN, ADMIN/MENTOR KIRITADI
--
--  Supabase → SQL Editor → New query → shu faylni to'liq qo'ying → Run.
--  Qayta ishga tushirish xavfsiz. Eski yozuvlar o'chirilmaydi.
--
--  • O'quvchilar endi recycling yubora olmaydi
--  • Admin yoki mentor sinf nomidan kiritadi: sinf, chiqindi turi, kg
--  • Ball (kg × 25) SINFga yoziladi — sinflar reytingida ko'rinadi
-- ═══════════════════════════════════════════════════════════════════════════

begin;

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

commit;

notify pgrst, 'reload schema';
