# 30sFams Order Portal

A web-based ordering, inventory, and operations portal for 30sFams FiveM supplies.

<https://30sfams-order-portal-vert.vercel.app>

## Overview

The application provides a Member and Super Admin workspace for resource catalog browsing, order processing, inventory and Stash management, stock movement history, member administration, notifications, reporting, and finance tracking.

**Technology:** React 19, Vite 7, Express 5, Prisma 7, Neon PostgreSQL, S3-compatible object storage, and Vercel.

## Current capabilities

- Member registration with Super Admin approval, username/email login, and password changes.
- Resource catalog with search, images, pricing, available stock, and favorites.
- Order submission, immediate stock reservation, status history, invoice printing, cancellation, and reorder.
- Super Admin inventory, Stash-only `OTHER` category, stock adjustments, minimum-stock alerts, and movement history.
- Member/role/rank administration, soft deletion, operational notes, and activity records.
- Spending periods, USD display, gang cash ledger, CSV exports, in-app notifications, and optional Discord integration.

See [Features](./docs/FEATURES.md) for the current behavior and business rules.

## Documentation

| Guide | Description |
|---|---|
| [Documentation index](./docs/README.md) | All project documentation |
| [Features and behavior](./docs/FEATURES.md) | Roles, ordering, stock, finance, images, and notifications |
| [Local installation](./docs/INSTALLATION.md) | Windows development setup |
| [Production deployment](./docs/DEPLOYMENT.md) | Vercel and Neon configuration |
| [Backup and recovery](./docs/DATABASE-BACKUP.md) | Database and image backup/restore |
| [Operations](./docs/OPERATIONS.md) | Operational checklist and incident handling |
| [API reference](./docs/API.md) | Backend route groups and access levels |
| [Historical patch notes](./docs/archive/) | Archived documents from earlier project iterations |

## Quick start

For local development, use [the installation guide](./docs/INSTALLATION.md). The short version:

1. Clone this repository.
2. Start local PostgreSQL with Docker Compose.
3. Configure `backend/.env` and `frontend/.env` from their example files.
4. Install dependencies and apply committed Prisma migrations.
5. Start the backend and frontend in separate terminals.

## Important data and security notes

- The production database is hosted separately from the local Docker database.
- Production resource images are stored in object storage, not in PostgreSQL.
- A complete backup must include both Neon PostgreSQL and the object-storage bucket.
- Never commit `.env` files, passwords, database URLs, JWT secrets, storage credentials, or Discord webhook URLs.
- Do not run database reset commands against production.
- Review migration SQL and create a verified backup before schema changes.
- A successful deployment is not a substitute for functional, permission, concurrency, and restore testing.

Start with the [documentation index](./docs/README.md) for setup, deployment, backup, and maintenance instructions.
