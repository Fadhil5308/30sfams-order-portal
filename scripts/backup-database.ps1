$ErrorActionPreference = 'Stop'

# Jalankan dari folder utama project yang berisi docker-compose.yml.
$backupDir = Join-Path (Get-Location) 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "30sfams-db-$stamp.sql"
$filePath = Join-Path $backupDir $fileName

# cmd.exe menangani redirection agar file dump SQL tidak berubah encoding oleh Windows PowerShell 5.1.
$command = "docker compose exec -T postgres pg_dump -U postgres -d fivem_resource_portal > `"$filePath`""
cmd.exe /c $command
if ($LASTEXITCODE -ne 0) {
  throw 'Backup gagal. Pastikan Docker Desktop dan container PostgreSQL sedang berjalan.'
}
if (!(Test-Path $filePath) -or (Get-Item $filePath).Length -lt 100) {
  throw 'File backup tidak terbentuk dengan benar atau terlalu kecil.'
}
Write-Host "Backup berhasil: $filePath" -ForegroundColor Green
