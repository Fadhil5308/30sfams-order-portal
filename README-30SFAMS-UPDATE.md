# Update ResourceHub → 30sFams Order Portal

Paket ini menggabungkan patch upload gambar resource dan tema 30sFams. Gunakan paket ini sebagai pengganti patch gambar sebelumnya agar pemasangan cukup satu kali.

## Yang berubah
- Tema antarmuka hitam/charcoal dengan aksen merah crimson.
- Branding login, sidebar, workspace, footer, judul browser, dan favicon menjadi 30sFams.
- Logo sementara 30sFams ditambahkan di `frontend/public/30s-logo.svg`.
- Fitur upload/ganti/hapus gambar resource Admin tetap disertakan.
- Gambar resource disimpan di `backend/uploads/`.

## Lokasi mengubah logo
File logo: `frontend/public/30s-logo.svg`.

Cara mengganti dengan logo asli:
1. Simpan logo asli milik 30sFams sebagai PNG transparan atau SVG.
2. Jika tetap memakai SVG, timpa file `frontend/public/30s-logo.svg` dengan file logo baru dan pertahankan nama tersebut. Tidak perlu mengubah kode.
3. Jika memakai PNG, taruh file sebagai `frontend/public/30s-logo.png`, lalu buka `frontend/src/App.jsx`, cari komponen `BrandLogo`, dan ubah `src="/30s-logo.svg"` menjadi `src="/30s-logo.png"`.
4. Simpan file lalu refresh browser. Jika belum berubah, tekan Ctrl+F5.

## Cara memasang
1. Stop terminal backend dan frontend dengan `Ctrl+C`. Jangan hentikan Docker/PostgreSQL.
2. Ekstrak ZIP ini.
3. Buka folder `fivem-resource-portal` di dalam hasil ekstrak.
4. Salin folder dan file di dalamnya ke folder project kamu:
   `C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal`
5. Jika Windows meminta konfirmasi, pilih Replace untuk file yang sama.
6. Jangan menimpa atau menghapus `backend/.env`, `backend/uploads/`, folder `node_modules`, maupun migration lama. Paket ini tidak menyertakan `.env`.

## Jalankan update backend
Buka terminal PowerShell pertama:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\backend"
npm.cmd install multer
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

`npm.cmd install multer` aman dijalankan lagi jika Multer sudah pernah diinstal. Migration menambahkan field gambar resource. Jika migration gambar sudah diterapkan sebelumnya, Prisma akan menyatakan database sudah sinkron.

## Jalankan frontend
Buka terminal PowerShell kedua:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\frontend"
npm.cmd install
npm.cmd run dev
```

Buka `http://localhost:5173`.

## Mengunggah gambar resource
Login sebagai Admin → Manajemen stok → pada baris resource, klik ikon upload → pilih JPG, JPEG, PNG, WEBP, atau GIF maksimal 5 MB. Gambar akan muncul di katalog User. Tombol tempat sampah menghapus gambar.

## Catatan penyimpanan
Folder `backend/uploads/` menyimpan gambar yang diunggah. Jangan menghapus folder tersebut. Untuk penggunaan publik/produksi, gunakan persistent/object storage dan lakukan backup file gambar. Logo website berada di folder frontend public dan dapat diganti tanpa mengubah database.
