# Local installation (Windows)

This guide sets up a local development copy. It does not change or connect to the production Neon database unless you deliberately put production credentials in your local environment.

## Requirements

- Windows 10/11 with PowerShell.
- Node.js 22.16 or newer and npm.
- Git.
- Docker Desktop (for the local PostgreSQL database).

## 1. Clone the repository

Open PowerShell:

```powershell
git clone https://github.com/Fadhil5308/30sfams-order-portal.git
cd 30sfams-order-portal
```

## 2. Start local PostgreSQL

Start Docker Desktop, then run this from the repository root:

```powershell
docker compose up -d postgres
docker compose ps
```

The local database settings in `docker-compose.yml` are:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `fivem_resource_portal` |
| Username | `postgres` |
| Password | `postgres` |

These are development-only credentials. Do not use them for production.

## 3. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env`. For the local Docker database, the example `DATABASE_URL` is already configured for the values above.

Set `JWT_SECRET` to a unique random value of at least 32 characters. Configure `FRONTEND_ORIGIN=http://localhost:5173`.

The following three variables are used only when seeding the first Super Admin:

- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Use a unique password of at least 12 characters. Do not share or commit the local `.env` file.

Install dependencies, generate Prisma Client, and apply committed migrations:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
```

Create the first Super Admin only when the local database does not already have one:

```powershell
npm.cmd run db:seed
```

**Seed warning:** the seed script uses `ADMIN_EMAIL` as its lookup key and updates the matching account's username, password hash, and role. Do not run it casually against an existing or production account.

Start the backend:

```powershell
npm.cmd run dev
```

The local API is available at `http://localhost:4000`. Check:

```text
http://localhost:4000/api/health
```

Expected response:

```json
{"ok":true,"service":"fivem-resource-portal-api"}
```

## 4. Configure the frontend

Open a second PowerShell terminal at the repository root:

```powershell
cd frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

The example frontend configuration points to `http://localhost:4000/api`. Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## 5. Optional local image storage

When the S3-compatible storage variables are not configured, the backend stores local development uploads in `backend/uploads/`. This directory is ignored by Git and should not be deleted if you need to keep local uploaded images.

For production, configure object storage rather than relying on the local filesystem. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Common commands

### Backend (run from `backend/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Start Express in watch mode |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:deploy` | Apply migrations already in the repository |
| `npm run db:migrate -- --name <migration-name>` | Create/apply a new migration during development |
| `npm run db:seed` | Create/update the seeded Super Admin |
| `npm run db:studio` | Open Prisma Studio |

### Frontend (run from `frontend/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create the production build |
| `npm run preview` | Preview the production build |

## Existing local database warning

If this is an existing development database, back it up before applying migrations. Do not run `prisma migrate reset`, delete the Docker volume, or run `docker compose down -v` unless you intentionally want to destroy the local database.

If a schema change was previously applied manually, check the `_prisma_migrations` history and the actual database schema before running `db:deploy`. A manually applied SQL change that is not recorded in migration history may need careful reconciliation; do not attempt to fix it by resetting the database.
