# 30sFams — Arsip Pesanan & Reset Operasional

Paket ini adalah **update gabungan** untuk project 30sFams yang sudah menggunakan branding hitam-merah. Di dalamnya terdapat frontend dan backend terbaru untuk fitur detail pesanan/timeline, upload gambar resource, serta fitur arsip dan reset order. File `.env`, data database, `node_modules`, dan folder upload pengguna tidak disertakan.

## Fitur baru pada update ini

### 1. Arsipkan semua order
- Tombol berada pada halaman **Semua Pesanan**.
- Admin harus mengetik persis `RESET 30SFAMS`.
- Semua pesanan yang belum diarsipkan dipindahkan ke menu **Arsip Pesanan**.
- Tidak mengubah status pesanan, stok tersedia, stok dicadangkan, item, catatan, invoice, maupun angka laporan.
- Order yang dibuat setelah reset akan masuk kembali ke daftar aktif. Arsip sebelumnya tetap ada.
- Arsip dapat dibuka detail/invoice dan diekspor ke CSV.
- Admin dapat memulihkan satu pesanan dari arsip ke daftar aktif; status dan stok tidak berubah.

### 2. Batalkan semua order aktif
- Tindakan terpisah dari arsip, dengan konfirmasi `CANCEL 30SFAMS`.
- Hanya membatalkan pesanan aktif berstatus `PENDING` dan `APPROVED` yang belum diarsipkan.
- Untuk status `APPROVED`, seluruh stok cadangan dikembalikan ke stok tersedia dan dicatat sebagai stock movement `RELEASED`.
- `COMPLETED`, `REJECTED`, dan `CANCELLED` tidak diubah.
- Semua perubahan dikerjakan dalam satu transaksi Serializable. Jika ada cadangan stok tidak konsisten atau transaksi bersamaan menyebabkan konflik, transaksi dibatalkan seluruhnya (rollback).
- Tindakan massal tercatat di Activity Log; setiap order yang dibatalkan juga mendapat catatan di status history.

## Sebelum memasang

1. Matikan terminal backend dan frontend dengan `Ctrl + C`.
2. Biarkan Docker Desktop dan container PostgreSQL tetap berjalan.
3. Buat backup database dari folder utama project:

   ```powershell
   docker compose exec -T postgres pg_dump -U postgres -d fivem_resource_portal > .\backup-before-archive.sql
   ```

4. Pastikan file `backup-before-archive.sql` terbentuk dan ukurannya tidak 0 KB.

## Memasang update

1. Ekstrak ZIP.
2. Buka folder `fivem-resource-portal` di dalam hasil ekstrak.
3. Salin folder/file di dalamnya ke folder project aktif:

   `C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal`

4. Pilih **Replace the files in the destination** jika diminta.
5. **Jangan** menghapus atau menimpa file `.env`, `node_modules`, `backend/uploads`, volume PostgreSQL, atau folder migration lama. Paket ini hanya menambahkan migration baru dan memperbarui file aplikasi terkait.
6. Buka terminal backend:

   ```powershell
   cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\backend"
   npm.cmd install multer
   npm.cmd run db:generate
   npm.cmd run db:migrate
   npm.cmd run dev
   ```

   `npm.cmd install multer` aman dijalankan ulang; jika sudah terpasang, npm akan menyelesaikannya tanpa perlu menginstal ulang manual.

7. Buka terminal frontend kedua:

   ```powershell
   cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\frontend"
   npm.cmd install
   npm.cmd run dev
   ```

8. Buka `http://localhost:5173` dan login sebagai Admin.

## Cara menggunakan

- Buka **Semua Pesanan**.
- Untuk mengosongkan daftar operasional tanpa menghilangkan transaksi, klik **Arsipkan semua**, ketik `RESET 30SFAMS`, lalu masukkan alasan.
- Buka menu **Arsip pesanan** untuk melihat arsip lama, membuka detail/invoice, dan export CSV.
- Gunakan **Batalkan order aktif** hanya jika memang ingin membatalkan semua Pending dan Approved. Admin diminta konfirmasi tambahan karena Approved akan mengembalikan stok cadangan.

## Perilaku laporan

Arsip bukan penghapusan. Laporan transaksi tetap menghitung keseluruhan riwayat order. Arsip hanya memisahkan tampilan operasional aktif dan arsip. Karena itu, gunakan filter/periode laporan saat menyusun rekap untuk periode tertentu.

## Pemeriksaan setelah update

1. Pastikan backend aktif dan `/api/health` memberi `{"ok":true,...}`.
2. Pastikan menu **Arsip pesanan** terlihat di sidebar Admin.
3. Buat satu pesanan uji Pending, lalu arsipkan semua: pesanan harus berpindah ke Arsip dan stok tidak berubah.
4. Buat pesanan Approved dan uji **Batalkan order aktif**: stok cadangan harus kembali ke stok tersedia.
5. Uji tombol **Pulihkan** pada satu order arsip; pastikan order kembali ke daftar aktif dan stok tidak berubah.
6. Periksa Activity Log, Order Status History, detail invoice, serta export CSV.
6. Jangan menyatakan siap publish sebelum pengujian ini lulus dan backup/restore benar-benar diuji.

## Batasan saat ini

- Endpoint bulk cancellation bekerja dalam satu transaksi untuk menjaga konsistensi. Jika volume order menjadi sangat besar, proses perlu ditingkatkan menjadi job batch dengan progress tracking.
- Ini masih lingkungan development lokal. Sebelum publish perlu HTTPS, hosting/DB produksi, penyimpanan upload persisten, backup terjadwal, monitoring, pembatasan registrasi, kebijakan sesi, dan pengujian akses publik.
