# Update 30sFams — Detail Pesanan, Catatan, Timeline, Invoice, dan Export

Patch ini melengkapi fitur transaksi pada 30sFams Order Portal. Patch dibuat agar dapat digabungkan ke project lokal yang sudah memakai branding 30sFams dan fitur upload gambar.

## Fitur baru

1. **Catatan pemesan saat checkout** — user dapat menulis catatan opsional maksimal 500 karakter. Catatan disimpan di `Order.notes`.
2. **Detail pesanan untuk admin dan user** — menampilkan nomor pesanan, pemesan, tanggal, daftar item, kategori, satuan, kuantitas, snapshot harga, subtotal, total kuantitas, total nominal, catatan user, dan catatan admin.
3. **Riwayat status** — status PENDING, APPROVED, REJECTED, COMPLETED, dan CANCELLED dicatat bersama waktu, pelaku, serta catatan. Perubahan status dan perubahan stok tetap berlangsung dalam transaksi database.
4. **Invoice siap cetak** — tombol `Cetak / Simpan PDF` membuka dialog cetak browser. Pilih `Save as PDF` untuk menyimpan PDF.
5. **Export untuk Excel** — admin dapat mengunduh seluruh baris item pesanan dalam CSV UTF-8 dengan pemisah titik koma. File dapat dibuka di Microsoft Excel. Ekspor memuat catatan user/admin, status, item, jumlah, harga satuan, subtotal, dan total pesanan.

## Penting sebelum memasang

- Stop terminal backend dan frontend dengan `Ctrl+C`.
- Jangan hentikan Docker/PostgreSQL.
- Backup folder project dan database sebelum update.
- Jangan menimpa/menghapus `backend/.env`, `backend/uploads/`, `node_modules/`, volume Docker PostgreSQL, atau migration lama.
- Patch ini tidak menghapus atau mengubah data akun, stok, resource, atau pesanan yang sudah ada.

## Backup database (disarankan)

Jalankan dari folder utama project di PowerShell:

```powershell
docker compose exec -T postgres pg_dump -U postgres -d fivem_resource_portal > .\backup-before-order-detail.sql
```

Pastikan file `backup-before-order-detail.sql` terbentuk dan ukurannya tidak 0 KB. Simpan di lokasi aman.

## Cara memasang patch

1. Ekstrak ZIP ini.
2. Buka folder `fivem-resource-portal` hasil ekstrak.
3. Salin isi folder tersebut ke folder project lokal yang sudah digunakan:
   `C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal`
4. Pilih **Replace** jika Windows meminta konfirmasi untuk file yang sama.
5. Jangan timpa file `.env` lokal. Patch tidak menyertakan file `.env`.

## Jalankan migration dan generate Prisma Client

Buka PowerShell/Terminal VS Code:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\backend"
npm.cmd run db:generate
npm.cmd run db:migrate
```

`db:migrate` akan menerapkan migration baru `20261102100000_add_order_status_history`. Migration hanya membuat tabel riwayat status dan index/relasi yang diperlukan. Migration tidak menghapus tabel atau baris transaksi yang sudah ada.

Jika Prisma meminta nama migration karena folder migration belum ikut tersalin, gunakan nama:

```text
add_order_status_history
```

Lanjutkan backend:

```powershell
npm.cmd run dev
```

Buka terminal kedua untuk frontend:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\frontend"
npm.cmd run dev
```

Buka `http://localhost:5173`.

## Cara menggunakan

### User

1. Login sebagai User.
2. Buka **Katalog Resource**.
3. Tambahkan item dan jumlah ke keranjang.
4. Isi **Catatan untuk admin** bila ada instruksi tambahan (opsional, maksimal 500 karakter).
5. Kirim pesanan.
6. Buka **Pesanan Saya** lalu pilih **Detail** untuk melihat rincian dan timeline.
7. Klik **Cetak / Simpan PDF** bila membutuhkan salinan invoice.

### Admin

1. Login sebagai Admin.
2. Buka **Semua Pesanan**.
3. Klik **Detail** untuk melihat rincian, catatan pemesan, dan timeline.
4. Gunakan aksi setujui/tolak/selesaikan/batalkan sesuai status.
5. Klik **Export Excel (CSV)** untuk mengunduh rekap yang dapat dibuka melalui Microsoft Excel.

## Catatan riwayat transaksi lama

Migration membuat penanda status awal dan snapshot status saat update dipasang untuk pesanan lama. Ini bukan rekonstruksi transisi yang tidak pernah direkam. Detail pesanan lama tetap menampilkan transaksi, status saat ini, catatan, dan item; perpindahan status yang terjadi setelah update akan dicatat lengkap beserta waktu dan pelakunya.

## Pengujian setelah update

- [ ] Checkout dengan catatan kosong.
- [ ] Checkout dengan catatan yang berisi teks dan tanda baca.
- [ ] Buka detail pesanan sebagai user dan pastikan hanya pesanan akun tersebut yang terlihat.
- [ ] Buka detail pesanan sebagai admin dan pastikan username/email pemesan terlihat.
- [ ] Setujui satu pesanan dan pastikan status timeline berubah menjadi APPROVED serta stok tersedia berpindah ke dicadangkan.
- [ ] Selesaikan pesanan dan pastikan timeline berubah menjadi COMPLETED serta stok dicadangkan berkurang.
- [ ] Uji reject/cancel dan periksa catatan admin serta timeline.
- [ ] Cetak invoice dan pilih Save as PDF.
- [ ] Download CSV dan buka dengan Excel.
- [ ] Periksa ulang jumlah stok dan laporan setelah semua pengujian.

## Batasan sebelum publikasi

Patch ini adalah peningkatan aplikasi lokal/staging, bukan bukti bahwa sistem sudah siap menerima akses publik. Sebelum publish, wajib siapkan kredensial database produksi yang kuat, `JWT_SECRET` baru, HTTPS, domain dan CORS yang tepat, persistent/object storage untuk gambar, backup database dan file upload, pembatasan pendaftaran (misalnya hanya anggota yang diundang), logging/monitoring, serta pengujian akses multi-user dan transaksi bersamaan.
