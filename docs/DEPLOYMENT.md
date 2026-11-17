# Production deployment

The production application is hosted on Vercel, uses Neon PostgreSQL, and stores resource images in an S3-compatible object-storage bucket.

- **Production URL:** [https://30sfams-order-portal-vert.vercel.app](https://30sfams-order-portal-vert.vercel.app)
- **GitHub repository:** [Fadhil5308/30sfams-order-portal](https://github.com/Fadhil5308/30sfams-order-portal)

This guide documents the configuration represented by the repository. It does not make changes to Vercel or Neon automatically.

## Deployment layout

The repository root contains `vercel.json`, which defines two services:

- `backend/` — Express API.
- `frontend/` — Vite/React frontend.

The Vercel rewrites route `/api/*` requests to the backend service and other paths to the frontend service. Keep the repository root as the Vercel project root so the root `vercel.json` can be applied.

## Required backend environment variables

Set these in the backend service's Vercel environment for Production. Add Preview values separately only when Preview deployments should connect to a separate database and storage.

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string for runtime API requests |
| `DATABASE_URL_UNPOOLED` | Neon direct/unpooled connection string for Prisma CLI migration work |
| `JWT_SECRET` | Unique random secret of at least 32 characters |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | Exact frontend origin: `https://30sfams-order-portal-vert.vercel.app` |
| `AWS_ENDPOINT_URL_S3` | S3-compatible object-storage endpoint |
| `AWS_ACCESS_KEY_ID` | Object-storage access key |
| `AWS_SECRET_ACCESS_KEY` | Object-storage secret key |
| `AWS_BUCKET_NAME` | Private bucket name for resource images |
| `AWS_REGION` | Region configured for the storage bucket |
| `DISCORD_WEBHOOK_URL` | Optional; only required for Discord notifications |

Other optional cookie/proxy settings are described in `backend/.env.example` and the backend configuration. Do not add values for variables you do not use.

### Neon connection strings

The running API reads `DATABASE_URL`. For Neon serverless runtime traffic, use the pooled connection string.

Prisma CLI configuration in `backend/prisma.config.ts` prefers `DATABASE_URL_UNPOOLED` and falls back to `DATABASE_URL`. Use the direct/unpooled connection string for migration commands. Never paste either connection string into GitHub, tickets, or chat.

### Object storage

Production resource uploads require all four of these values to be configured:

- `AWS_ENDPOINT_URL_S3`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_BUCKET_NAME`

Set `AWS_REGION` to the storage provider's configured region. The code fallback is `ap-southeast-1`, but do not assume this fallback matches every bucket. The bucket is private; the backend signs image URLs for reads.

Do not use local `backend/uploads/` storage for production. Vercel function filesystems are not persistent application storage.

## First deployment / release checklist

1. Confirm the correct GitHub repository and branch (`main`) are connected to Vercel.
2. Confirm the Vercel project root is the repository root and the service configuration from `vercel.json` is active.
3. Configure production environment variables for the backend service.
4. Verify Neon pooled and direct connection strings are assigned to the correct variables.
5. Verify object-storage endpoint, bucket, credentials, and region.
6. Set `FRONTEND_ORIGIN` to the exact production site origin, without a trailing path.
7. Set a unique production `JWT_SECRET` and `NODE_ENV=production`.
8. Apply any pending database migrations only after reviewing the migration files and confirming the database state. Make and verify a backup first. See [DATABASE-BACKUP.md](./DATABASE-BACKUP.md).
9. Deploy from GitHub/Vercel.
10. Verify the API health route, login, Member registration/approval, an order, stock movements, images, notifications, and finance behavior.

The Vercel deployment status only confirms the deployment pipeline result; it does not prove that every business workflow or concurrent transaction has been tested.

## Applying database migrations

Run migrations from the `backend/` directory in a controlled release step, not by resetting the database.

Example when using Vercel CLI to obtain the project's environment locally:

```powershell
cd backend
vercel link
vercel env pull .env.production.local --environment=production
```

Treat the downloaded environment file as a secret. Ensure `DATABASE_URL_UNPOOLED` points to the direct Neon connection. Then review the migration status and SQL before applying:

```powershell
npm.cmd ci
npm.cmd run db:generate
npx prisma migrate status
npm.cmd run db:deploy
```

Run these commands only after confirming that the linked project, environment, and database are the intended production targets. Remove or securely store `.env.production.local` after the task. Do not commit it.

**Migration caution:** some changes may have been applied manually in a hosted database during development. If the database schema is ahead of the Prisma migration history, stop and reconcile the migration history before running `db:deploy`. Never use `prisma migrate reset` or a destructive SQL shortcut on production.

## Post-deployment smoke test

- [ ] `GET /api/health` returns `ok: true`.
- [ ] Existing Super Admin can sign in.
- [ ] A test Member can register and remains Pending until approval.
- [ ] Approved Member can sign in; rejected/deactivated Member cannot.
- [ ] A test order reserves available stock exactly once.
- [ ] Reject/cancel releases the relevant reservation.
- [ ] Completing an Approved order consumes reserved stock and adds one gang cash income entry.
- [ ] Stash-only `OTHER` items do not appear in the order catalog.
- [ ] Resource image upload and signed image loading work.
- [ ] In-app notifications and optional Discord integration work.
- [ ] Finance, CSV export, and member permissions behave as expected.

Use test records and small quantities. Avoid destructive/bulk actions against real operational data during smoke testing.
