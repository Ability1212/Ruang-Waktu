-- ============================================================================
-- RUANG WAKTU — SUPABASE POSTGRESQL SCHEMA (PROJECTS, TASKS, TICKETS, QA)
-- Jalankan skrip ini di menu "SQL Editor" pada Dashboard Supabase Anda.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. TABEL PROJECTS (PROYEK & KLIEN)
create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  client_name text default '',
  lead text default '',
  deadline text default '',
  status text not null default 'Berjalan',
  notes text default '',
  created_at timestamptz not null default now()
);

-- 2. TABEL TASKS (TUGAS TIM PER PROYEK + TAUTAN TIKET & TEST CASE)
create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  due_date text default '',
  priority text not null default 'Sedang',
  project text default 'Umum',
  assignee text default 'Belum ditugaskan',
  assignee_role text default 'Engineer',
  status text not null default 'Todo',
  notes text default '',
  completed boolean not null default false,
  ticket_code text default '',
  test_case_code text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TABEL TICKETS (TIKET KOMPLAIN & BUG DARI KLIEN + SLA & TAUTAN)
-- Alur status: Open -> Investigasi -> Diperbaiki -> Terverifikasi -> Ditutup
create table if not exists public.tickets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  client_name text not null,
  project text not null,
  category text not null default 'Komplain',
  severity text not null default 'Tinggi',
  status text not null default 'Open',
  assignee text default '',
  created_at_date text not null,
  sla_deadline text default '',
  linked_task_id text default '',
  linked_test_case_code text default '',
  description text default '',
  created_at timestamptz not null default now()
);

-- 4. TABEL TEST SCENARIOS (SKENARIO PENGUJIAN QA)
create table if not exists public.test_scenarios (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  project text not null,
  module_name text default '',
  description text default '',
  created_at timestamptz not null default now()
);

-- 5. TABEL TEST CASES (DETAIL LANGKAH PENGUJIAN QA + TAUTAN TIKET & TUGAS)
create table if not exists public.test_cases (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scenario_id text not null,
  code text not null,
  title text not null,
  precondition text default '',
  steps text default '',
  expected_result text default '',
  actual_result text default '',
  status text not null default 'Pending',
  tester text default '',
  priority text not null default 'Sedang',
  linked_ticket_code text default '',
  linked_task_id text default '',
  created_at timestamptz not null default now()
);

-- 6. TABEL EVENTS (JADWAL SPRINT / RILIS / RAPAT)
create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date text not null,
  start_time text default '',
  end_time text default '',
  category text default 'Rapat',
  notes text default '',
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY, INDEKS & BATAS PANJANG TEKS
-- Kebijakan RLS, indeks user_id, dan constraint panjang teks didefinisikan di
--   supabase/migrations/20261105000000_harden_rls.sql
-- Untuk instalasi baru: jalankan file ini, LALU jalankan file migrasi tersebut.
-- PENTING: jangan pernah menambahkan "or user_id is null" pada policy — itu membuat
-- baris tanpa pemilik dapat dibaca dan diubah oleh semua user.
