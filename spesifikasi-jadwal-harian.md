# Spesifikasi Awal — Aplikasi Jadwal Keseharian

## 1. Tujuan
Membuat website sederhana untuk menyusun kegiatan harian, melihat agenda berdasarkan waktu, menandai kegiatan selesai, dan mencatat tugas yang perlu ditindaklanjuti. Aplikasi ditujukan untuk penggunaan pribadi dan nyaman dipakai di ponsel maupun komputer.

## 2. Pengguna dan kebutuhan utama
Pengguna ingin dapat:
- Menambahkan kegiatan dengan nama, tanggal, jam mulai, dan durasi atau jam selesai.
- Melihat jadwal hari ini secara berurutan menurut waktu.
- Menambahkan tugas tanpa jam tertentu, lalu menandainya selesai.
- Mengubah atau menghapus kegiatan/tugas.
- Berpindah tanggal untuk melihat agenda hari lain.
- Tetap melihat data setelah halaman ditutup dan dibuka kembali.

## 3. Fitur versi pertama (MVP)
### Jadwal kegiatan
- Buat, ubah, dan hapus kegiatan.
- Kolom: judul (wajib), tanggal (wajib), waktu mulai (opsional), waktu selesai (opsional), kategori (opsional), catatan (opsional).
- Tampilan agenda harian yang diurutkan berdasarkan waktu; kegiatan tanpa jam ditempatkan pada bagian “Tanpa waktu”.
- Penanda kegiatan yang sudah lewat dan kegiatan yang sedang berlangsung berdasarkan waktu lokal perangkat.

### Todo/tugas
- Buat, ubah, dan hapus tugas.
- Kolom: judul (wajib), tanggal jatuh tempo (opsional), prioritas (Rendah/Sedang/Tinggi), catatan (opsional), status selesai.
- Tandai selesai/belum selesai.
- Filter sederhana: Semua, Belum selesai, Selesai.

### Navigasi dan penyimpanan
- Beranda menampilkan agenda hari ini dan ringkasan tugas.
- Navigasi tanggal: Hari ini, tanggal sebelumnya/berikutnya, dan pemilih tanggal.
- Data disimpan di browser (localStorage) untuk versi awal; tidak perlu akun atau server.
- Konfirmasi sebelum menghapus item dan keadaan kosong yang memberi petunjuk untuk menambah item.

## 4. Halaman dan komponen
1. **Beranda / Hari Ini** — tanggal aktif, tombol tambah, agenda, daftar tugas, ringkasan jumlah tugas.
2. **Form kegiatan** — judul, tanggal, jam, kategori, catatan; validasi input.
3. **Form tugas** — judul, jatuh tempo, prioritas, catatan.
4. **Navigasi tanggal** — kontrol sebelumnya/berikutnya, tombol Hari ini, pemilih tanggal.
5. **Pesan status** — sukses menyimpan, konfirmasi penghapusan, dan pesan saat belum ada data.

Form kegiatan dan tugas dapat berupa dialog/modal agar pengguna tetap berada di halaman agenda.

## 5. Struktur data yang disarankan
- **Kegiatan:** `id`, `title`, `date`, `startTime`, `endTime`, `category`, `notes`, `createdAt`, `updatedAt`.
- **Tugas:** `id`, `title`, `dueDate`, `priority`, `notes`, `completed`, `createdAt`, `updatedAt`.
- Tanggal disimpan sebagai `YYYY-MM-DD`; waktu sebagai `HH:mm`. Item memakai ID unik agar dapat diedit dan dihapus dengan aman.

## 6. Rancangan pengalaman dan tampilan
- Bahasa antarmuka: Indonesia.
- Tampilan bersih, ringan, responsif, dan mudah digunakan dengan sentuhan maupun mouse.
- Agenda berbentuk daftar waktu; tugas berbentuk daftar dengan kotak centang.
- Prioritas dan kategori memakai label warna dengan teks yang tetap terbaca.
- Aksi utama “Tambah kegiatan” dan “Tambah tugas” terlihat jelas.
- Pertimbangkan aksesibilitas: label form, fokus keyboard, kontras teks, dan tombol dengan nama yang jelas.

## 7. Aturan dan validasi
- Judul tidak boleh kosong.
- Bila jam mulai dan selesai diisi, jam selesai harus setelah jam mulai.
- Tanggal/jam mengikuti zona waktu lokal perangkat.
- Penghapusan meminta konfirmasi.
- Data tidak boleh hilang saat berpindah tanggal atau memuat ulang halaman.

## 8. Di luar cakupan versi pertama
Akun dan sinkronisasi cloud, kolaborasi, notifikasi push, integrasi kalender eksternal, lampiran, serta pengulangan otomatis (misalnya setiap hari/minggu). Fitur-fitur ini dapat dipertimbangkan setelah alur dasar digunakan.

## 9. Kriteria selesai versi pertama
- Pengguna dapat membuat, melihat, mengubah, dan menghapus kegiatan serta tugas.
- Agenda untuk tanggal yang dipilih tampil benar dan terurut.
- Tugas dapat ditandai selesai dan difilter.
- Data bertahan setelah halaman dimuat ulang pada browser yang sama.
- Form memberi validasi yang jelas.
- Tampilan dapat digunakan pada layar ponsel dan desktop.

## 10. Asumsi implementasi awal
- Aplikasi berupa website satu halaman.
- Tidak membutuhkan login; data hanya tersimpan pada browser/perangkat yang digunakan.
- Pengguna memakai satu zona waktu lokal.
- Nama kerja aplikasi: **Jadwal Harian**.
- Teknologi implementasi dapat dipilih saat tahap pembangunan; utamakan dependensi ringan dan cara menjalankan yang jelas.

## 11. Keputusan yang dapat ditinjau nanti
Sebelum atau saat implementasi, pilihan visual (warna/tema), kebutuhan pengulangan kegiatan, dan apakah data perlu diekspor atau disinkronkan dapat disesuaikan. Spesifikasi ini mengasumsikan versi awal lokal tanpa akun agar aplikasi tetap sederhana dan langsung bisa dipakai.
