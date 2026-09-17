# AURA Sport Manager — Versi Realtime (Supabase)

Versi ini sudah diubah dari `localStorage` (data per-browser) menjadi **Supabase**
(data bersama + realtime), supaya semua orang yang membuka link yang sama
melihat perubahan yang sama secara langsung.

## Cara Kerja (penting untuk dipahami)

- Seluruh data (pemain, pertandingan, keuangan) disimpan dalam **satu baris**
  di tabel `sport_manager_state`, sebagai JSON — mirip cara kerja sebelumnya
  di localStorage, hanya lokasinya sekarang di database bersama.
- Setiap kali ada perubahan (tambah pemain, update skor, dll), seluruh state
  ditulis ulang ke baris itu, lalu Supabase Realtime otomatis mengirim
  perubahan itu ke semua browser lain yang sedang terbuka.
- **Catatan jujur soal batasan**: karena satu baris JSON ditulis ulang penuh
  setiap kali (bukan per-baris/per-pemain), kalau dua orang mengklik tombol
  di detik yang persis sama, salah satu perubahan bisa tertimpa (siapa yang
  nulis terakhir yang menang). Untuk pemakaian normal komunitas badminton
  (satu-dua admin yang pegang skor), ini praktis tidak akan jadi masalah.
- Timer pertandingan (stopwatch) tetap jalan lokal di tiap browser berdasarkan
  status `isRunning` — bukan di-tick per detik ke server (supaya tidak boros
  koneksi). Basis waktunya tersinkron saat tombol Start/Pause ditekan.
- Tool ini **tidak pakai login** — siapa pun yang punya link bisa baca &
  ubah data, persis seperti sifat aslinya sebagai alat internal komunitas.

## Langkah 1 — Buat Project Supabase Baru

1. Buka https://supabase.com/dashboard → **New Project**
2. Isi nama project (misalnya `aura-sport-manager`), pilih region terdekat
   (misal Singapore), dan buat password database (simpan, tidak akan dipakai
   langsung di sini tapi baik untuk disimpan)
3. Tunggu sampai project selesai dibuat (±2 menit)

## Langkah 2 — Jalankan Skema Database

1. Di dashboard project, buka **SQL Editor** → **New query**
2. Copy seluruh isi file `schema.sql` yang ada di paket ini, paste, lalu **Run**
3. Pastikan tidak ada error — akan muncul tabel `sport_manager_state` di **Table Editor**

## Langkah 3 — Ambil Project URL & Anon Key

1. Di dashboard, buka **Settings** → **API**
2. Salin **Project URL** dan **anon public key**
3. Buka file `index.html`, cari dua baris ini di bagian atas `<script>`:
   ```js
   const SUPABASE_URL = 'GANTI_DENGAN_SUPABASE_PROJECT_URL';
   const SUPABASE_ANON_KEY = 'GANTI_DENGAN_SUPABASE_ANON_KEY';
   ```
4. Ganti dengan nilai asli dari dashboard, simpan file

> `anon key` ini memang didesain untuk ditempel langsung di kode sisi client
> (aman dipublikasikan) — akses datanya diatur lewat RLS policy yang sudah
> diset di `schema.sql`.

## Langkah 4 — Tambahkan Logo (opsional tapi disarankan)

File `index.html` merujuk ke `1000748590.png` sebagai logo header. Sertakan
file gambar itu di folder yang sama dengan nama persis itu, atau ganti baris
`<img src="1000748590.png" ...>` ke path logo lain yang kamu punya — kalau
tidak, logo akan tampil rusak/kosong (fitur lain tetap jalan normal).

## Langkah 5 — Push ke GitHub

```bash
mkdir aura-sport-manager
cd aura-sport-manager
# taruh index.html (dan logo, jika ada) di folder ini
git init
git add .
git commit -m "Initial commit - AURA Sport Manager (Supabase realtime)"
git branch -M main
git remote add origin https://github.com/USERNAME/aura-sport-manager.git
git push -u origin main
```
(Ganti `USERNAME` dengan username GitHub kamu, dan buat repo kosong dulu di
github.com/new sebelum push.)

## Langkah 6 — Deploy ke Vercel

1. Buka https://vercel.com/new
2. Pilih **Import** repo `aura-sport-manager` yang barusan dibuat
3. Karena ini cuma file HTML statis (tanpa framework), Vercel akan otomatis
   mendeteksinya sebagai static site — tidak perlu setting build command apa pun
4. Klik **Deploy**
5. Setelah selesai, kamu dapat link publik (misal `aura-sport-manager.vercel.app`)
   yang bisa dibagikan — semua orang yang membukanya akan melihat data yang
   sama, update secara realtime.

## Testing Cepat

Buka link yang sama di dua tab/dua device berbeda, lalu tambah satu pemain di
salah satunya — di tab lain seharusnya pemain itu langsung muncul tanpa
refresh.
