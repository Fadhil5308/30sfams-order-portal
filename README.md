# 30sFams Order Portal

A web-based ordering, inventory, and operations portal for 30sFams FiveM supplies.

**Production:** [https://30sfams-order-portal-vert.vercel.app](https://30sfams-order-portal-vert.vercel.app)

The application uses a React/Vite frontend, an Express API, Prisma ORM, Neon PostgreSQL, and S3-compatible object storage for resource images. The repository is configured for deployment on Vercel.

---

## Contents

- [Features](#features)
- [Roles and access](#roles-and-access)
- [Order and stock workflow](#order-and-stock-workflow)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Production deployment](#production-deployment)
- [Database migrations](#database-migrations)
- [Backup and recovery](#backup-and-recovery)
- [API overview](#api-overview)
- [Operational and security notes](#operational-and-security-notes)

## Features

### Member

- Public registration with username, email, and password. New registrations remain pending until approved by a Super Admin.
- Sign in with either username or email.
- Browse the resource catalog, search and filter resources, and check available stock and prices.
- Create orders with multiple items, quantities, and an optional note for the administrator.
- View personal orders, order details, status history, and printable invoices (Print / Save as PDF).
- Cancel eligible Pending orders.
- Reorder previously completed orders using current resource prices and stock availability.
- Save and manage favorite resources.
- Receive in-app notifications when account or order status changes.
- Change the account password. New passwords must contain at least 12 characters.
- Super Admin accounts can also place orders under their own account.

### Super Admin

The database role is \`ADMIN\`; the application displays it as **Super Admin**.

- Overview dashboard with order summaries, inventory totals, recent orders, and low-stock alerts.
- Resource inventory management: create resources, edit details and prices, activate/deactivate resources, and adjust stock.
- Resource image upload, replacement, and removal.
- Minimum stock thresholds and low-stock indicators.
- Stock movement history for restocks, adjustments, reservations, releases, and completed handovers.
- Dedicated **Stash** for items in the \`OTHER\` category.
- Order management: inspect order details, approve, reject, complete, cancel, archive, restore, and perform supported bulk actions.
- Member management: create members, approve/reject registrations, activate/deactivate accounts, update roles and ranks, and soft-delete members.
- Member statistics, order reports, stock activity, and administrative activity history.
- CSV exports for supported operational reports.
- Finance tools for spending periods and the gang cash ledger.
- Manual operational notes with create, edit, search, and delete actions.
- In-app notifications and optional Discord webhook notifications.

### Resource categories

The catalog supports:

\`CLASS1\`, \`CLASS2\`, \`CLASS3\`, \`NARKO\`, \`VEST\`, \`ATTACHMENT\`, and \`AMMO\`.

The \`OTHER\` category is **Stash-only**. Items in this category are not displayed in the order catalog, cannot be ordered, and are excluded from the main Overview inventory totals.

### Finance

- Currency is displayed in **USD ($)**.
- Completed orders contribute to spending totals.
- Spending periods can be created, edited, or reset. Starting a new period resets the period total without deleting the lifetime order total.
- The gang cash ledger records an opening balance, income from completed orders, manual income, expenses, and balance adjustments.
- Ledger changes are stored as entries; previous entries are not overwritten.
- An opening gang cash balance must be initialized before an order can be completed and its order income recorded.

### Resource images

- Images are stored in a private S3-compatible object storage bucket when storage is configured.
- The backend returns signed image URLs so the browser can load private images without exposing bucket credentials.
- JPEG, PNG, and WebP uploads may be resized to a maximum 1,440-pixel longest side and converted to WebP when the optimized file is smaller.
- Animated GIFs are preserved.
- The backend upload limit is 4 MB per image.
- Local filesystem uploads are available for local development. Production image uploads require object storage configuration.

---

## Roles and access

The application has two roles:

| Display name | Database value | Access |
|---|---|---|
| Member | \`USER\` | Catalog, personal orders, favorites, notifications, and password changes |
| Super Admin | \`ADMIN\` | All Member capabilities plus administration and operational management |

Public registration always creates a \`USER\` account with Pending registration status. A Super Admin must approve it before the member can sign in.

Super Admins can manage member roles, but cannot change their own role through the Members interface. The last active Super Admin cannot be demoted. Member deletion is a soft delete: login access is revoked while order and transaction history is retained. Members with Pending or Approved orders must have those orders resolved before their accounts can be deleted.

### Member ranks

Ranks are ordered from highest to lowest:

1. OG
2. Under OG
3. Shoot Caller
4. Hood President
5. HoodBoys
6. YoungBoys
7. Hangaround

---

## Order and stock workflow

Stock is reserved when an order is submitted, not when an administrator later approves it.

1. **Order submitted:** the order is created with Pending status. Available stock is reduced and reserved stock is increased in the same database transaction.
2. **Order approved:** the status changes to Approved. The existing reservation remains in place; stock is not deducted a second time.
3. **Order rejected or cancelled:** the reservation is released back to available stock where applicable.
4. **Order completed:** the reserved stock is consumed when the resource handover is recorded. The completion transaction also records the order income in the gang cash ledger.
5. **Order archived:** the order is hidden from the active order list. Archiving does not change its status, stock, or transaction history. An archived order can be restored.

Stock updates and order transitions use database transactions and conditional updates to protect against overselling and duplicate processing. Order items retain price and resource details as snapshots, so later catalog edits do not rewrite historical order details.

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7 |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 16 for local development; Neon PostgreSQL for production |
| ORM | Prisma 7 with \`@prisma/adapter-pg\` |
| Object storage | S3-compatible storage using AWS SDK for JavaScript |
| Authentication | JWT in an HTTP-only session cookie; bcrypt password hashing |
| Validation and security | Zod, Helmet, CORS, and Express rate limiting |
| Hosting | Vercel |
| Source control | GitHub |

## Repository structure

\`\`\`text
30sfams-order-portal/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── ...
│   ├── src/
│   │   ├── lib/             # Prisma, storage, notifications, Discord, helpers
│   │   ├── middleware/      # Authentication and authorization
│   │   ├── routes/          # Auth, resources, orders, admin, finance, etc.
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/              # Logo and static assets
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
├── scripts/
│   └── backup-database.ps1
├── docker-compose.yml
├── vercel.json
└── README.md
\`\`\`

---

## Requirements

- Node.js 22.16 or newer.
- npm.
- Docker Desktop for the optional local PostgreSQL database.
- Git for cloning the repository.

The production database is hosted by Neon. Docker Compose is intended for local development and is not the production database.

## Local development

Commands below use Windows PowerShell.

### 1. Clone the repository

\`\`\`powershell
git clone https://github.com/Fadhil5308/30sfams-order-portal.git
cd 30sfams-order-portal
\`\`\`

### 2. Start the local PostgreSQL database

\`\`\`powershell
docker compose up -d postgres
\`\`\`

The local Docker database is configured as:

- Host: \`localhost\`
- Port: \`5432\`
- Database: \`fivem_resource_portal\`
- Username: \`postgres\`
- Password: \`postgres\`

These credentials are for local development only. Do not reuse them in production.

### 3. Configure and start the backend

\`\`\`powershell
cd backend
Copy-Item .env.example .env
\`\`\`

Open \`backend/.env\` and configure at least:

- \`DATABASE_URL\` — local PostgreSQL connection string.
- \`JWT_SECRET\` — a random secret with at least 32 characters.
- \`FRONTEND_ORIGIN\` — \`http://localhost:5173\` for local development.
- \`ADMIN_USERNAME\`, \`ADMIN_EMAIL\`, and \`ADMIN_PASSWORD\` — only when creating the initial Super Admin with the seed script. Use a strong password of at least 12 characters.

Install dependencies, generate Prisma Client, and apply the committed migrations:

\`\`\`powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
\`\`\`

Create the initial Super Admin only when needed:

\`\`\`powershell
npm.cmd run db:seed
\`\`\`

The seed script creates or updates the administrator matching \`ADMIN_EMAIL\`. Running it again can change that account's username and password, so do not run it casually against a production database.

Start the API:

\`\`\`powershell
npm.cmd run dev
\`\`\`

The local API runs at \`http://localhost:4000\`. Health check:

\`\`\`text
http://localhost:4000/api/health
\`\`\`

Expected response:

\`\`\`json
{"ok":true,"service":"fivem-resource-portal-api"}
\`\`\`

### 4. Configure and start the frontend

Open a second terminal at the repository root:

\`\`\`powershell
cd frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
\`\`\`

Open the Vite URL shown in the terminal, usually \`http://localhost:5173\`.

The development frontend uses \`VITE_API_URL\` from \`frontend/.env\`. In production, the frontend uses the relative \`/api\` path and Vercel routes API requests to the backend service.

### Useful development commands

Run from the \`backend\` directory:

| Command | Purpose |
|---|---|
| \`npm run dev\` | Start the backend in watch mode |
| \`npm run db:generate\` | Generate Prisma Client |
| \`npm run db:deploy\` | Apply migrations already committed to the repository |
| \`npm run db:migrate\` | Run Prisma Migrate in development and create migrations |
| \`npm run db:seed\` | Create/update the initial Super Admin |
| \`npm run db:studio\` | Open Prisma Studio |

Run from the \`frontend\` directory:

| Command | Purpose |
|---|---|
| \`npm run dev\` | Start the Vite development server |
| \`npm run build\` | Build the production frontend |
| \`npm run preview\` | Preview the production build locally |

---

## Environment variables

### Backend

Set backend variables in \`backend/.env\` for local development or in the backend service's Vercel environment for production.

| Variable | Required | Description |
|---|---|---|
| \`DATABASE_URL\` | Yes | PostgreSQL connection string used by the running API. Use Neon’s pooled connection string for the serverless runtime. |
| \`DATABASE_URL_UNPOOLED\` | For Prisma CLI tasks when available | Direct/unpooled PostgreSQL connection string. Prisma CLI configuration prefers this value for migration operations. |
| \`JWT_SECRET\` | Yes | Random secret, at least 32 characters. |
| \`JWT_EXPIRES_IN\` | No | JWT session lifetime. The example file sets \`7d\`; the code fallback is \`12h\`. |
| \`PORT\` | No | Local API port; defaults to \`4000\`. |
| \`NODE_ENV\` | Recommended | Set to \`production\` in production. |
| \`FRONTEND_ORIGIN\` | Recommended | Exact trusted frontend origin. Multiple origins may be comma-separated. |
| \`COOKIE_SAME_SITE\` | No | \`lax\`, \`strict\`, or \`none\`. Defaults to \`none\` in production and \`lax\` otherwise. |
| \`COOKIE_SECURE\` | No | Forces the session cookie's Secure attribute when set to \`true\`. |
| \`COOKIE_DOMAIN\` | No | Optional cookie domain when required by the deployment's domain setup. |
| \`TRUST_PROXY\` | No | Optional Express proxy configuration. Vercel is detected automatically. |
| \`AWS_ENDPOINT_URL_S3\` | Required for production image storage | S3-compatible object storage endpoint. |
| \`AWS_ACCESS_KEY_ID\` | Required for production image storage | Object storage access key. |
| \`AWS_SECRET_ACCESS_KEY\` | Required for production image storage | Object storage secret key. |
| \`AWS_BUCKET_NAME\` | Required for production image storage | Private bucket used for resource images. |
| \`AWS_REGION\` | Recommended for image storage | Storage region; the code default is \`ap-southeast-1\`. Use the region configured for the bucket. |
| \`DISCORD_WEBHOOK_URL\` | No | Optional Discord webhook for operational notifications. |
| \`ADMIN_USERNAME\` | Seed only | Initial Super Admin username. |
| \`ADMIN_EMAIL\` | Seed only | Initial Super Admin email and seed lookup key. |
| \`ADMIN_PASSWORD\` | Seed only | Initial Super Admin password; minimum 12 characters. |

### Frontend

| Variable | Required | Description |
|---|---|---|
| \`VITE_API_URL\` | Development only | Local API base URL, usually \`http://localhost:4000/api\`. Production uses \`/api\` through the Vercel rewrite configuration. |

Never commit real \`.env\` files, database URLs, JWT secrets, storage credentials, or Discord webhook URLs to GitHub.

---

## Production deployment

The repository's \`vercel.json\` configures the frontend and backend services:

- Requests to \`/api/*\` are routed to the backend service.
- Other paths are routed to the frontend service.

The production frontend is:

[https://30sfams-order-portal-vert.vercel.app](https://30sfams-order-portal-vert.vercel.app)

### Production checklist

1. Connect the GitHub repository to Vercel and keep the repository root as the project configuration root so \`vercel.json\` is used.
2. Configure backend environment variables in the correct Vercel environment (Production, Preview, or Development).
3. Set \`DATABASE_URL\` to the Neon pooled connection string for API runtime traffic.
4. Set \`DATABASE_URL_UNPOOLED\` to the Neon direct connection string for Prisma CLI migration tasks.
5. Set \`FRONTEND_ORIGIN\` to the exact production frontend origin, for example \`https://30sfams-order-portal-vert.vercel.app\`.
6. Set a unique production \`JWT_SECRET\` and \`NODE_ENV=production\`.
7. Configure all S3-compatible object storage variables before enabling production image uploads.
8. Add \`DISCORD_WEBHOOK_URL\` only if Discord notifications are required.
9. Confirm the Neon database schema and migration history before applying any new migration.
10. Deploy and check \`/api/health\`, sign-in, order creation, stock updates, image loading, and finance records.

Do not use the sample local database credentials or sample administrator password in production. Do not run the seed script against production unless you intentionally need to create or reset the seeded Super Admin account.

### Database migration caution

Production migrations change the live database schema. Before applying one:

- Create and verify a database backup.
- Review the migration SQL in \`backend/prisma/migrations/\`.
- Confirm whether the migration has already been applied to Neon, especially when a schema change was previously run manually.
- Use the direct/unpooled connection for Prisma CLI migration work.
- Never run \`prisma migrate dev\` against the production database.

The committed migration command is \`npm run db:deploy\`. Run it only after confirming the target database and migration state.

---

## Backup and recovery

A complete backup must include more than PostgreSQL. This application stores resource image files in object storage, while source code and deployment configuration are managed separately.

### 1. Local Docker database backup

The repository includes a PowerShell helper for the local Docker PostgreSQL database. Run it from the repository root:

\`\`\`powershell
.\scripts\backup-database.ps1
\`\`\`

The script creates a timestamped SQL file under \`backups/\`. It backs up only the local Docker database defined in \`docker-compose.yml\`; it does **not** back up the production Neon database.

### 2. Production Neon database backup

Install PostgreSQL command-line tools and use a Neon direct/unpooled connection string. Example PowerShell commands:

\`\`\`powershell
$backupDir = ".\\backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$databaseUrl = Read-Host "Paste the Neon direct (unpooled) connection string"

pg_dump --format=custom --no-owner --no-acl --dbname="$databaseUrl" --file="$backupDir\\30sfams-neon-$stamp.dump"
\`\`\`

Keep the connection string private. Verify that the resulting dump file exists and has a non-zero size.

To test recovery, restore into a **new, empty** PostgreSQL database rather than overwriting the live production database:

\`\`\`powershell
$restoreUrl = Read-Host "Paste the direct connection string for the new empty database"
pg_restore --no-owner --no-acl --dbname="$restoreUrl" ".\\backups\\30sfams-neon-YYYYMMDD-HHMMSS.dump"
\`\`\`

Replace the example dump filename with the file you actually created.

### 3. Resource image backup

Back up the private object storage bucket separately. Install AWS CLI and use storage credentials with read-only access for backup operations.

\`\`\`powershell
aws s3 sync "s3://YOUR_BUCKET_NAME" ".\\backups\\resource-images" --endpoint-url "YOUR_S3_ENDPOINT" --region "YOUR_STORAGE_REGION"
\`\`\`

Restore image files into the intended bucket while preserving object keys:

\`\`\`powershell
aws s3 sync ".\\backups\\resource-images" "s3://YOUR_BUCKET_NAME" --endpoint-url "YOUR_S3_ENDPOINT" --region "YOUR_STORAGE_REGION"
\`\`\`

Use the endpoint, bucket, and region supplied by the storage provider. Do not expose storage credentials in this README or in a public repository.

### 4. Source code and deployment configuration

- Source code and commit history are stored in GitHub. An additional local copy can be created with \`git clone\`.
- Vercel environment variables are not stored in this repository. Keep a secure copy of production configuration, or use Vercel CLI's \`vercel env pull\` after linking the project.
- Keep environment files in an encrypted or otherwise access-controlled location. Never upload them to a public Git repository.

### 5. Backup schedule and restore testing

Suggested minimum schedule:

| Data | Suggested frequency |
|---|---|
| Production Neon database | Daily, and before every schema migration |
| Object storage images | Weekly and after important image changes |
| Source code | Every change through Git commits |
| Vercel environment/configuration | After each configuration change |

Keep copies outside the computer used for development. Maintain multiple backup generations and periodically test restoring the database and images into separate destinations. A backup is not verified until a restore test succeeds.

---

## API overview

All API routes use the \`/api\` prefix.

| Route group | Main paths | Purpose |
|---|---|---|
| Health | \`GET /api/health\` | API health check |
| Authentication | \`/api/auth\` | Register, login, logout, current session, and password change |
| Resources | \`/api/resources\` | Catalog, resource management, image upload, stock adjustment, stash, and stock movements |
| Orders | \`/api/orders\` | Create orders, view personal orders, reorder, and cancel eligible orders |
| Administration | \`/api/admin\` | Dashboard, all orders, reports, members, ranks, activity, notes, and administrative actions |
| Finance | \`/api/admin/finance\` | Spending periods and gang cash ledger |
| Favorites | \`/api/favorites\` | List, add, and remove favorite resources |
| Notifications | \`/api/notifications\` | List notifications and mark them as read |

All protected routes require an authenticated session. Administrative routes require the \`ADMIN\` role.

---

## Operational and security notes

- Do not share or commit \`.env\` files, passwords, JWT secrets, database connection strings, object storage keys, or webhook URLs.
- Use strong, unique credentials for production.
- Keep production database access restricted to the application and trusted administrators.
- Back up both Neon PostgreSQL and object storage. A PostgreSQL dump does not contain the image files in the storage bucket.
- Resolve open Pending and Approved orders before soft-deleting a member.
- Review stock movement and finance history when investigating discrepancies.
- Take a backup before schema changes or major operational changes.
- A successful deployment does not replace functional, concurrency, security, load, and backup-restore testing.

For a production incident, preserve the current database and logs first. Prefer restoring into a separate database and validating the recovered data before switching the application to it.
