-- ============================================================================
-- RUANG WAKTU — MIGRASI KEAMANAN 2026-11-05
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor (aman dijalankan ulang).
--
-- Memperbaiki:
--   1. Kebijakan RLS lama mengizinkan "or user_id is null", sehingga baris tanpa
--      pemilik dapat dibaca/diubah/dihapus SEMUA user, dan siapa pun dapat
--      menyisipkan baris "milik semua orang".
--   2. Tidak ada indeks user_id (RLS jadi full table scan seiring data tumbuh).
--   3. Tidak ada batas panjang teks (API PostgREST bisa diisi teks berukuran MB).
--
-- LANGKAH 0 (disarankan): cek baris tanpa pemilik sebelum menjalankan migrasi ini.
--   select 'projects' t, count(*) from public.projects where user_id is null
--   union all select 'tasks', count(*) from public.tasks where user_id is null
--   union all select 'tickets', count(*) from public.tickets where user_id is null
--   union all select 'test_scenarios', count(*) from public.test_scenarios where user_id is null
--   union all select 'test_cases', count(*) from public.test_cases where user_id is null
--   union all select 'events', count(*) from public.events where user_id is null;
-- Setelah migrasi, baris dengan user_id null menjadi TIDAK TERLIHAT oleh siapa pun
-- (tidak dihapus). Hapus atau tetapkan pemiliknya secara manual bila perlu.
-- ============================================================================

do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['projects','tasks','tickets','test_scenarios','test_cases','events'] loop
    -- Hapus SEMUA policy lama pada tabel (termasuk yang memuat "user_id is null")
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);

    -- Satu policy per operasi; (select auth.uid()) dievaluasi sekali per query
    execute format($p$create policy %I on public.%I for select to authenticated
      using ((select auth.uid()) = user_id)$p$, t || '_select_own', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check ((select auth.uid()) = user_id)$p$, t || '_insert_own', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)$p$, t || '_update_own', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using ((select auth.uid()) = user_id)$p$, t || '_delete_own', t);

    -- Role anon tidak membutuhkan akses apa pun ke tabel data
    execute format('revoke all on public.%I from anon', t);

    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

-- user_id NOT NULL — dijalankan per tabel, dilewati bila masih ada baris yatim
do $$
declare
  t text;
  has_null boolean;
begin
  foreach t in array array['projects','tasks','tickets','test_scenarios','test_cases','events'] loop
    execute format('select exists (select 1 from public.%I where user_id is null)', t) into has_null;
    if has_null then
      raise notice 'Tabel % masih punya baris dengan user_id null — NOT NULL dilewati. Bersihkan lalu jalankan ulang.', t;
    else
      execute format('alter table public.%I alter column user_id set not null', t);
    end if;
  end loop;
end $$;

-- Batas panjang teks. NOT VALID = hanya berlaku untuk tulis baru, baris lama tidak diperiksa.
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('projects','name',300), ('projects','client_name',300), ('projects','notes',20000),
      ('tasks','title',500), ('tasks','notes',20000), ('tasks','assignee',200),
      ('tickets','title',500), ('tickets','client_name',300), ('tickets','description',20000),
      ('test_scenarios','title',500), ('test_scenarios','description',20000),
      ('test_cases','title',500), ('test_cases','precondition',20000), ('test_cases','steps',20000),
      ('test_cases','expected_result',20000), ('test_cases','actual_result',20000),
      ('events','title',500), ('events','notes',20000)
    ) as v(tbl, col, maxlen)
  loop
    if not exists (select 1 from pg_constraint where conname = c.tbl || '_' || c.col || '_len') then
      execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
        c.tbl, c.tbl || '_' || c.col || '_len', c.col, c.maxlen);
    end if;
  end loop;
end $$;
