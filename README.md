# Ruang Waktu — Project, Task Karyawan, Tiket Klien & QA Testing SaaS

Platform manajemen proyek terpadu (*Hybrid Local-First & Supabase Cloud Sync*) untuk mengelola **Proyek & Klien**, **Tugas Karyawan per Proyek**, **Tiket Komplain/Bug Klien**, serta **CRUD QA Test Skenario & Test Case** lengkap dengan halaman **Landing Page SaaS** dan **Autentikasi OAuth (Google & GitHub)**.

## Arsitektur & Teknologi
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling & Ikon:** Tailwind CSS v4 + CSS Design Tokens (`Inter` & `DM Mono`) + `lucide-react`
- **Database & Cloud Sync:** Supabase PostgreSQL (`@supabase/supabase-js`) dengan Mode Hybrid (otomatis berjalan lokal jika variabel Supabase belum diisi, dan menyinkronkan ke cloud begitu terhubung)
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) untuk validasi TypeScript dan *production build* otomatis
- **Versi HTML/PWA Klasik:** Tersimpan rapi di dalam folder `./legacy-html/`

## Struktur Direktori
- `src/app/layout.tsx` — Root layout Next.js dengan font `Inter` & `DM Mono` serta metadata SEO/PWA
- `src/app/globals.css` — Tailwind CSS & Ruang Waktu Design Tokens (Default Mode Light teduh ramah mata & Mode Dark Emerald)
- `src/app/page.tsx` — Halaman utama aplikasi
- `src/components/RuangWaktuApp.tsx` — Komponen utama ruang kerja interaktif
- `src/lib/supabase.ts` — Klien Supabase & fungsi sinkronisasi Hybrid (`pullStateFromSupabase` / `pushStateToSupabase`)
- `src/types/ruang-waktu.ts` — Definisi tipe TypeScript
- `supabase/schema.sql` — Skema tabel PostgreSQL & kebijakan Row Level Security (RLS) siap pakai
- `.github/workflows/ci.yml` — Pipeline CI/CD GitHub Actions

## Cara Menjalankan di Lokal
```bash
npm install
npm run dev
```
Buka `http://localhost:3000` di browser.

## Cara Menghubungkan Database Supabase
1. Buat project gratis di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor** di dashboard Supabase, lalu jalankan isi file `supabase/schema.sql`.
3. Salin `.env.example` menjadi `.env.local` dan isi `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_ANON_KEY` (atau masukkan langsung melalui menu **Pengaturan → 4. Akun & Database Supabase** di dalam aplikasi).
