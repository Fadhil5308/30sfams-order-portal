# 30sFams update — pendaftaran, periode pembelanjaan, kas gang, dan USD

Paket ini adalah **overlay source code** untuk project 30sFams yang sudah berjalan. Paket sengaja tidak menyertakan `package.json`, `package-lock.json`, `.env`, `node_modules`, folder `backend/uploads`, atau database/volume Docker. Pertahankan file lokal tersebut.

## Perubahan

1. **Pendaftaran publik dengan persetujuan admin**
   - Siapa pun dapat mengirim pendaftaran dari halaman login.
   - Akun baru berstatus `PENDING` dan tidak dapat login sampai admin menyetujuinya.
   - Admin melihat permintaan di menu **Pengguna** lalu memilih **Setujui** atau **Tolak**.
   - Akun lama otomatis mendapat status `APPROVED` melalui nilai default migration sehingga akun yang sudah ada tetap dapat login.

2. **Total pembelanjaan per periode**
   - Admin mengatur nama periode, tanggal mulai, dan tanggal akhir di menu **Keuangan & kas gang**.
   - Yang dihitung adalah pesanan `COMPLETED` berdasarkan `completedAt`, termasuk pesanan yang sudah diarsipkan.
   - Tombol reset menutup periode lama dan memulai periode baru dari waktu reset. Riwayat periode lama dan total sepanjang masa tetap ada.
   - Total sepanjang masa menghitung seluruh order `COMPLETED` dan tidak ikut di-reset.
   - Order lama yang `completedAt`-nya kosong tidak dimasukkan ke total periode karena tanggal penyelesaiannya tidak tercatat. Nilainya tetap termasuk dalam total sepanjang masa.

3. **Kas gang — khusus admin**
   - Endpoint dan halaman kas dilindungi `requireAuth` + `requireAdmin`; user biasa tidak bisa melihatnya.
   - Admin memasukkan saldo awal satu kali sesuai uang kas riil saat fitur mulai digunakan.
   - Setiap order baru menambah kas **ketika admin menandai pesanan `COMPLETED` setelah penyerahan**, bukan saat masih Pending/Approved.
   - Pengeluaran dicatat manual oleh admin dengan nominal, kategori, dan keterangan. Pengeluaran yang melebihi saldo ditolak.
   - Order yang selesai sebelum fitur kas diaktifkan **tidak otomatis ditambahkan** ke ledger. Masukkan saldo awal sesuai saldo kas nyata saat ini agar tidak terjadi hitung ganda.
   - Setelah saldo awal dibuat, endpoint penyelesaian order mewajibkan ledger kas sudah diinisialisasi.

4. **USD**
   - Tampilan nominal memakai format `$1,234.00` dan label ekspor menyebut USD.
   - **Ini hanya mengubah format/simbol tampilan, bukan mengonversi nilai angka dalam database.** Harga lama, total order lama, invoice lama, dan saldo angka yang sudah tersimpan tetap sama. Periksa dan ubah harga resource menjadi nominal USD yang benar sebelum menerima order baru. Jangan menganggap angka lama dalam rupiah sudah dikonversi ke dolar.

## Pemasangan di Windows

### 1. Backup database

Matikan terminal backend dan frontend dengan `Ctrl + C`. Biarkan Docker Desktop/PostgreSQL tetap berjalan. Buka PowerShell dari folder project utama (folder yang memiliki `docker-compose.yml`), lalu jalankan:

```powershell
docker compose exec -T postgres pg_dump -U postgres -d fivem_resource_portal > .\backup-before-finance-registration-usd.sql
```

Pastikan file `backup-before-finance-registration-usd.sql` terbentuk dan ukurannya bukan 0 KB. Simpan juga salinan di luar folder project.

### 2. Salin source update

Ekstrak ZIP ini. Buka folder `fivem-resource-portal` di dalam hasil ekstrak, lalu salin folder/file di dalamnya ke folder project lokal:

```text
C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal
```

Pilih **Replace** jika diminta. Jangan hapus atau mengganti `.env`, `package.json`, `package-lock.json`, `node_modules`, `backend/uploads`, atau volume Docker.

### 3. Update backend dan database

Buka terminal backend:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\backend"
npm.cmd install multer
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

Jika `multer` sudah terpasang, perintah install aman dijalankan lagi. Migration ini menambah struktur baru tanpa menghapus akun, order, resource, atau stok. **Jangan jalankan `db:reset`, `migrate reset`, atau menghapus volume PostgreSQL.**

### 4. Update frontend

Buka terminal kedua:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\frontend"
npm.cmd run dev
```

Buka `http://localhost:5173`.

## Pengaturan pertama setelah update

1. Login menggunakan akun admin yang sudah ada. Tidak perlu menjalankan seed lagi.
2. Buka menu **Pengguna**. Coba daftarkan satu akun uji dari halaman login pada browser Incognito. Akun tersebut harus muncul berstatus **Menunggu persetujuan**. Admin menyetujui atau menolaknya di menu Pengguna.
3. Buka menu **Keuangan & kas gang**. Buat periode pembelanjaan dengan tanggal dan rentang yang diinginkan.
4. Masukkan **saldo awal kas sesuai jumlah uang kas riil saat ini**. Masukkan `0.00` bila memang kas saat ini nol. Ini hanya dapat disetel sekali.
5. Setelah saldo awal tersimpan, uji satu order kecil: user mengirim order → admin menyetujui → admin menyerahkan dan menandai Completed. Pesanan harus muncul sebagai pemasukan kas dan meningkatkan total pembelanjaan periode serta total sepanjang masa.
6. Uji pengeluaran dengan nilai kecil. Saldo kas harus berkurang dan entri pengeluaran muncul di buku kas.
7. Uji reset periode: periode lama berpindah ke riwayat, periode baru dimulai dari waktu reset, sedangkan total sepanjang masa tidak berubah.

## Catatan keselamatan

- Lakukan uji coba transaksi kecil terlebih dahulu.
- Jangan bagikan isi `.env`, `JWT_SECRET`, atau password admin.
- Paket ini sudah diperiksa sintaks JavaScript dan JSX secara statis, tetapi migration dan integrasi database tetap harus dijalankan pada komputer lokal kamu. Jika perintah `db:migrate` menghasilkan error, hentikan langkah berikutnya dan kirim pesan error lengkapnya. Jangan melakukan reset database.
