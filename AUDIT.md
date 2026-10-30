# Audit ringkas — Ruang Waktu

Tanggal audit: 30 Oktober 2026

## Perbaikan yang diterapkan

- SEO dasar: `title`, deskripsi, tag Open Graph, robots, bahasa dokumen, dan data terstruktur `WebApplication`.
- Aksesibilitas: tautan lewati ke konten, label tombol, status `aria-expanded` pada profil dan sidebar, fokus keyboard yang terlihat, label untuk kontrol fokus, serta penutupan dialog dengan Escape.
- Performa: aplikasi tidak memakai framework atau gambar besar; data dan preferensi hanya disimpan lokal. Font eksternal tetap memiliki fallback sistem.
- Responsif: sidebar menjadi panel overlay di ponsel, kalender dapat digeser horizontal pada layar sempit, modal dibatasi tinggi layar, dan kartu metrik tersusun dua kolom.
- Interaksi: menu profil tertutup ketika pengguna melakukan navigasi, membuka pencarian, menekan Escape, atau mengklik area di luar menu. Tema dan keadaan sidebar disimpan di browser.

## Catatan sebelum publikasi

Open Graph belum memiliki `og:image` karena aplikasi belum mempunyai gambar sosial final. Bila dipublikasikan pada domain, tambahkan URL kanonis dan gambar Open Graph berukuran 1200 × 630 piksel.
