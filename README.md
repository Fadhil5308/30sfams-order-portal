# ResourceHub — FiveM Resource Ordering & Inventory

MVP portal pemesanan dan manajemen inventory resource FiveM. Aplikasi terdiri dari React + Vite (frontend), Express + Prisma 7 (API), dan PostgreSQL (database).

## Fitur yang sudah dibuat

### User
- Registrasi publik dan login menggunakan username/email.
- Role hasil registrasi selalu `USER`; user tidak dapat menaikkan role sendiri.
- Melihat katalog resource, filter kategori, stok tersedia, dan harga satuan.
- Memasukkan beberapa resource ke keranjang dan mengirim pesanan.
- Melihat riwayat/status pesanan dan membatalkan pesanan yang masih Pending.

### Admin
- Login dengan akun admin yang dibuat melalui script seed privat.
- Dashboard ringkasan resource, stok, pesanan, dan nominal.
- Membuat resource, mengubah harga/status aktif, dan menambah/mengurangi stok.
- Melihat dan menyetujui/menolak pesanan.
- Menyelesaikan pesanan atau membatalkan pesanan Approved.
- Laporan kuantitas dan nominal per status/kategori, resource terlaris, pengguna, serta aktivitas admin.

### Kategori awal
`CLASS1`, `CLASS2`, `CLASS3`, `NARKO`, `VEST`, `ATTACHMENT`.

## Aturan stok dan transaksi

Stok disimpan dalam dua kolom:
- `stockAvailable`: stok yang masih bisa dipesan.
- `stockReserved`: stok yang sudah dicadangkan untuk pesanan berstatus Approved.

Alurnya:
1. User mengirim pesanan → status `PENDING`, stok belum berubah.
2. Admin menyetujui → stok tersedia berkurang dan stok dicadangkan bertambah dalam transaksi database.
3. Admin menyelesaikan → stok dicadangkan berkurang; resource dianggap sudah dikeluarkan.
4. Admin membatalkan pesanan Approved → stok dicadangkan dikembalikan ke stok tersedia.
5. Pesanan Pending yang ditolak/dibatalkan tidak mengubah stok.

Pembaruan stok ketika persetujuan memakai conditional update dan transaksi PostgreSQL agar stok tidak dapat dipesan melebihi jumlah tersedia dalam kondisi permintaan bersamaan.

`totalAmount` dihitung dari snapshot harga ketika pesanan dibuat. Nama, kategori, satuan, harga satuan, kuantitas, dan subtotal item juga disimpan sebagai snapshot sehingga perubahan harga resource di kemudian hari tidak mengubah histori pesanan lama.

**Catatan pencatatan nominal:** kolom harga menggunakan IDR sebagai nilai nominal internal. Bila sistem ini hanya membutuhkan kuantitas, isi harga resource dengan `0`. Fitur payment gateway/pembayaran online belum termasuk MVP ini.

## Persyaratan

- Node.js 22.16+ direkomendasikan untuk development lokal (Prisma 7, Vite 7); Node.js 24 LTS juga dapat digunakan.
- npm.
- Docker Desktop (untuk menjalankan PostgreSQL lokal) atau server PostgreSQL.

## Menjalankan di Windows (PowerShell)

Buka terminal pada folder `fivem-resource-portal`.

### 1. Jalankan PostgreSQL lokal

```powershell
docker compose up -d postgres
```

Tunggu container sehat, lalu lanjutkan.

### 2. Atur backend

```powershell
cd backend
Copy-Item .env.example .env
```

Buka `backend/.env`, lalu periksa `DATABASE_URL`, `JWT_SECRET`, dan kredensial admin awal. Untuk pengembangan lokal, `DATABASE_URL` dari contoh sudah sesuai dengan Docker Compose.

Ganti `JWT_SECRET` dengan string acak panjang minimal 32 karakter. Ganti `ADMIN_PASSWORD` dengan password kuat minimal 12 karakter.

```powershell
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

API berjalan pada `http://localhost:4000`. Cek `http://localhost:4000/api/health`.

### 3. Jalankan frontend

Buka terminal PowerShell kedua pada folder project utama:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Buka URL yang muncul, biasanya `http://localhost:5173`.

## Login pertama

- Admin: gunakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` yang telah diatur pada `backend/.env` sebelum `npm run db:seed`.
- User: buat akun dari halaman **Daftar akun**.

Jangan gunakan kredensial contoh untuk deployment publik. Jangan pernah membagikan file `.env` atau mengunggahnya ke GitHub.

## Endpoint API utama

Semua endpoint berada di prefix `/api`.

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| POST | `/auth/register` | Publik | Registrasi role USER |
| POST | `/auth/login` | Publik | Login |
| POST | `/auth/logout` | Login | Logout |
| GET | `/auth/me` | Login | Profil sesi saat ini |
| GET | `/resources` | Login | Katalog resource aktif |
| GET | `/resources?all=true` | Admin | Semua resource termasuk nonaktif |
| POST | `/resources` | Admin | Tambah resource |
| PATCH | `/resources/:id` | Admin | Ubah detail/harga/status |
| PATCH | `/resources/:id/stock` | Admin | Penyesuaian stok |
| POST | `/orders` | User | Buat pesanan Pending |
| GET | `/orders/mine` | User | Riwayat pesanan sendiri |
| POST | `/orders/:id/cancel` | Pemilik pesanan | Batalkan pesanan Pending |
| GET | `/admin/orders` | Admin | Semua pesanan |
| POST | `/admin/orders/:id/approve` | Admin | Setujui dan cadangkan stok |
| POST | `/admin/orders/:id/reject` | Admin | Tolak pesanan Pending |
| POST | `/admin/orders/:id/complete` | Admin | Selesaikan pesanan Approved |
| POST | `/admin/orders/:id/cancel` | Admin | Batalkan dan lepaskan stok bila perlu |
| GET | `/admin/reports` | Admin | Ringkasan transaksi |
| GET | `/admin/users` | Admin | Daftar pengguna |
| GET | `/admin/activity` | Admin | Log aktivitas admin |

## Struktur project

```text
fivem-resource-portal/
├── backend/
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   └── src/
│       ├── lib/
│       ├── middleware/
│       ├── routes/
│       └── server.js
├── frontend/
│   └── src/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── docker-compose.yml
└── README.md
```

## Deployment publik (gambaran)

1. Buat database PostgreSQL terkelola (managed PostgreSQL) dan simpan connection string secara privat.
2. Deploy folder `backend` ke layanan Node.js. Atur `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, `PORT` (mengikuti platform), `FRONTEND_ORIGIN` (origin frontend publik), serta variabel admin seed.
3. Jalankan `npm install` (setelah lockfile dibuat di lingkungan build, gunakan `npm ci`), `npm run db:generate`, lalu `npm run db:deploy` pada proses release/deploy. Buat admin awal dengan `npm run db:seed` satu kali, kemudian hapus/rotasi variabel password seed dari environment deployment.
4. Deploy folder `frontend` sebagai static site. Set `VITE_API_URL` ke URL API publik sebelum build.
5. Gunakan HTTPS pada frontend dan API. Tempatkan frontend/API pada domain yang sama atau subdomain satu site agar cookie sesi `SameSite=Lax` dapat dikirim dengan benar. Atur `FRONTEND_ORIGIN` persis sesuai origin frontend.
6. Aktifkan backup database, pantau log server, batasi akses database hanya dari backend, dan gunakan password admin unik.

Untuk produksi yang lebih serius, tambahkan verifikasi email, reset password, MFA admin, proteksi CSRF sesuai topologi domain, audit trail yang lebih rinci, pagination/filter server-side, backup terjadwal, dan monitoring.

## Batasan MVP saat ini

- Belum ada upload gambar resource; kartu katalog memakai ilustrasi kategori generik.
- Belum ada payment gateway atau bukti pembayaran.
- Pembuatan akun admin hanya melalui seed/deployment, bukan registrasi publik.
- Admin dapat mengedit harga dan mengaktif/nonaktifkan item; penghapusan permanen tidak disediakan agar histori transaksi tetap utuh.
- UI awal menggunakan prompt browser untuk beberapa tindakan admin (penyesuaian stok/harga/catatan). Form dialog khusus dapat ditambahkan pada iterasi UI berikutnya.
