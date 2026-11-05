# Ruang Waktu — Proyek, Tugas Tim, Tiket Klien & QA Testing

Aplikasi untuk mengelola **Proyek & Klien**, **Tugas per Proyek**, **Tiket Komplain/Bug Klien**, serta **Test Scenario & Test Case QA**, dengan alur khas: *Test Case gagal → Tiket → Tugas → Verifikasi*.

Produksi: https://ruang-waktu.vercel.app

## Mode data
- **Mode Demo (tanpa login):** data contoh, tersimpan hanya di `localStorage` browser.
- **Akun cloud (setelah login):** Supabase adalah sumber kebenaran. Data diisolasi per akun lewat Row Level Security dan **tidak** di-cache permanen di browser. Saat pertama login dengan workspace cloud yang masih kosong, aplikasi menawarkan untuk mengunggah data dari Mode Demo.

> Belum tersedia: workspace tim bersama (multi-user), peran anggota, dan billing. Paket berbayar di landing page ditandai "Segera hadir".

## Teknologi
- Next.js 15 (App Router, TypeScript), Tailwind CSS v4, `lucide-react`
- Supabase (PostgreSQL + Auth: email/password, Google, GitHub, alur PKCE)
- GitHub Actions: typecheck, unit test, build, audit dependensi; Dependabot

## Struktur
- `src/components/RuangWaktuApp.tsx` — komponen utama (landing, auth, workspace)
- `src/lib/supabase.ts` — klien Supabase, pull data, sinkronisasi berbasis diff (upsert yang berubah + delete yang dihapus, error selalu diperiksa)
- `supabase/schema.sql` — tabel
- `supabase/migrations/` — kebijakan RLS, indeks, batas panjang teks
- `scripts/*.test.mts` — unit test logika sinkronisasi (`npm test`)
- `next.config.mjs` — security headers (CSP, X-Frame-Options, nosniff, dll.)
- `legacy-html/` — versi HTML lama (tidak dideploy)

## Menjalankan di lokal
```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
npm test && npm run typecheck
```
Tanpa variabel Supabase, aplikasi berjalan dalam Mode Demo dan tombol login dinonaktifkan.

## Setup Supabase (wajib untuk produksi)
1. **SQL Editor:** jalankan `supabase/schema.sql` (instalasi baru), lalu `supabase/migrations/20261105000000_harden_rls.sql`. Migrasi aman dijalankan ulang; baca komentar "LANGKAH 0" di dalamnya untuk memeriksa baris tanpa pemilik.
2. **Authentication → URL Configuration:** Site URL `https://ruang-waktu.vercel.app`; Redirect URLs: `https://ruang-waktu.vercel.app` dan `http://localhost:3000`.
3. **Authentication → Providers → Email:** aktifkan *Confirm email*, panjang kata sandi minimal 8.
4. **Google / GitHub:** aktifkan provider dan isi Client ID/Secret bila ingin dipakai.
5. **Vercel env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, opsional `NEXT_PUBLIC_SITE_URL`. Jangan pernah memberi prefiks `NEXT_PUBLIC_` pada `service_role` key.

Catatan PKCE: tautan verifikasi email dan reset kata sandi harus dibuka di browser yang sama dengan tempat permintaan dibuat.
