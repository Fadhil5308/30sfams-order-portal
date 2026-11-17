# Database and file backup

A complete 30sFams backup must cover the production PostgreSQL database and the resource-image object-storage bucket. GitHub contains source code, while Vercel stores environment configuration separately.

> **Important:** The repository script `scripts/backup-database.ps1` backs up only the local Docker PostgreSQL database. It does not back up the production Neon database or object-storage images.

## What must be backed up

| Component | Contains | Backup method |
|---|---|---|
| Neon PostgreSQL | Members, roles, resources, stock, orders, order items, status history, stock movements, favorites, notifications, notes, finance ledger, and activity logs | `pg_dump` |
| Object storage | Uploaded resource image objects | AWS CLI `aws s3 sync` |
| Source code | Application source and migration history | GitHub; optionally clone a local copy |
| Vercel configuration | Environment variables and deployment settings | Secure export/record kept outside Git |

A PostgreSQL dump does not include object-storage files. Back up both.

## 1. Back up local Docker PostgreSQL (development only)

Run from the repository root:

```powershell
./scripts/backup-database.ps1
```

The script creates a timestamped SQL file under `backups/`. Confirm that the file exists and is not empty. Copy it to a separate disk or secure cloud location.

## 2. Back up production Neon PostgreSQL

Install PostgreSQL command-line tools (`pg_dump` and `pg_restore`). In Neon, select the production project/branch/database and copy its **direct/unpooled** connection string. Use a direct connection for `pg_dump` and restore operations.

Run from PowerShell:

```powershell
$backupDir = "D:/30sFams-Backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Enter the connection string privately; do not save it in a script or commit it.
$secureUrl = Read-Host "Neon direct (unpooled) connection string" -AsSecureString
$databaseUrl = [System.Net.NetworkCredential]::new("", $secureUrl).Password

$dumpFile = Join-Path $backupDir "30sfams-neon-$stamp.dump"
pg_dump --format=custom --no-owner --no-acl --dbname="$databaseUrl" --file="$dumpFile"

if ($LASTEXITCODE -ne 0 -or !(Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
  throw "Database backup failed or produced an empty file."
}

Write-Host "Database backup created: $dumpFile"
Remove-Variable databaseUrl, secureUrl
```

Keep the dump in a protected location. If your PostgreSQL tools do not recognize the connection string format, update the tools before trying again; do not switch to a production reset as a workaround.

## 3. Back up resource images

Resource images are stored separately in the configured private S3-compatible bucket. Install AWS CLI and create/use a storage credential with read-only access for backup.

The following values must come from your storage provider and Vercel configuration:
- Bucket name.
- S3 endpoint URL.
- Storage region.
- Read-only access key and secret key.

Set the credentials for the current PowerShell session (do not paste them into this document or save them in a script):

```powershell
$env:AWS_ACCESS_KEY_ID = Read-Host "Storage access key ID"
$secureSecret = Read-Host "Storage secret access key" -AsSecureString
$env:AWS_SECRET_ACCESS_KEY = [System.Net.NetworkCredential]::new("", $secureSecret).Password

$bucket = Read-Host "Bucket name"
$endpoint = Read-Host "S3 endpoint URL"
$region = Read-Host "Storage region"

$imageDir = "D:/30sFams-Backups/resource-images"
New-Item -ItemType Directory -Force -Path $imageDir | Out-Null

aws s3 sync "s3://$bucket" "$imageDir" --endpoint-url "$endpoint" --region "$region"
if ($LASTEXITCODE -ne 0) { throw "Object-storage backup failed." }

Remove-Item Env:AWS_ACCESS_KEY_ID
Remove-Item Env:AWS_SECRET_ACCESS_KEY
Remove-Variable secureSecret
```

Keep the folder structure and object keys intact. The database stores references to image keys; restoring objects with the original keys allows those references to work again.

## 4. Back up source code and deployment settings

### Source code

The GitHub repository retains source code and commit history. Make an additional local copy if needed:

```powershell
git clone https://github.com/Fadhil5308/30sfams-order-portal.git D:/30sFams-Backups/source-code
```

### Vercel environment variables

After linking the local folder to the correct Vercel project, environment variables can be exported with:

```powershell
vercel login
vercel link
vercel env pull .env.production.local --environment=production
```

The exported file contains secrets. Store it only in an encrypted or access-controlled backup location. Do not put it in the repository or share it in chat. Remove the local export when it is no longer needed.

## Recommended schedule

| Backup target | Minimum recommended schedule |
|---|---|
| Production Neon database | Daily and before every schema migration |
| Object-storage bucket | Weekly and after important image changes |
| GitHub source code | Every code change through commits |
| Vercel environment/configuration | After each configuration change |

Keep multiple generations (for example, 7 daily and 4 weekly copies) and keep at least one copy outside the development computer. Check the file sizes and confirm each backup command exits successfully.

## Restore test

Do not test restoration by overwriting the production database or the live image bucket.

1. Create a separate, empty test database in Neon or another PostgreSQL environment.
2. Restore the dump into that empty database:

```powershell
$secureRestoreUrl = Read-Host "Direct connection string for the NEW empty restore database" -AsSecureString
$restoreUrl = [System.Net.NetworkCredential]::new("", $secureRestoreUrl).Password

pg_restore --no-owner --no-acl --dbname="$restoreUrl" "D:/30sFams-Backups/30sfams-neon-YYYYMMDD-HHMMSS.dump"
if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }

Remove-Variable restoreUrl, secureRestoreUrl
```

Replace the example dump filename with the actual backup file.

3. Restore images to a separate test bucket using `aws s3 sync`, preserving original object keys.
4. Point a staging copy of the application to the restored database and test login, member records, resources, orders, stock movements, images, and finance entries.
5. Do not switch production to the restored database until the test data has been reviewed and the recovery decision is approved.

## Incident recovery principles

- Stop risky write operations when data integrity is in doubt.
- Preserve current database state, logs, and existing backups before attempting recovery.
- Prefer restoring to a separate database first.
- Remember that database and image storage must be restored as a matched set.
- A backup is not proven usable until a restore test succeeds.
