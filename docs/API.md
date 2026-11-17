# API reference

All API routes are served under the `/api` prefix. Protected routes use the authenticated HTTP-only session cookie. Routes under `/api/admin` and `/api/admin/finance` require the Super Admin role (`ADMIN`).

This is a route-group reference for the current implementation. Request/response payload schemas are validated in the respective backend route files.

## Health

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |

## Authentication — `/api/auth`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Register a Member with Pending status |
| POST | `/login` | Public | Sign in using username or email |
| POST | `/logout` | Authenticated | Clear the session cookie |
| GET | `/me` | Authenticated | Get the current session user |
| POST | `/change-password` | Authenticated | Change the current account password |

Paths in this table are relative to `/api/auth`.

## Resources — `/api/resources`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | Authenticated | List active catalog resources; Super Admin can request `?all=true` for inactive resources |
| GET | `/stash` | Super Admin | List resources including Stash-only `OTHER` items |
| GET | `/images/:key` | Authenticated | Resolve/redirect to an authorized image URL |
| POST | `/` | Super Admin | Create a resource |
| PATCH | `/:id` | Super Admin | Update resource details, price, active state, or minimum stock |
| PATCH | `/:id/stock` | Super Admin | Adjust available stock |
| POST | `/:id/image` | Super Admin | Upload or replace a resource image |
| DELETE | `/:id/image` | Super Admin | Remove a resource image |
| GET | `/:id/movements` | Super Admin | List movements for a resource |

## Orders — `/api/orders`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | Authenticated Member or Super Admin | Create an order; stock is reserved in the same transaction |
| GET | `/mine` | Authenticated | List the current user's orders |
| GET | `/:id` | Order owner | Get one of the current user's orders |
| POST | `/:id/reorder` | Order owner | Reorder a previously completed order |
| POST | `/:id/cancel` | Order owner | Cancel an eligible Pending order |

## Administration — `/api/admin`

All routes in this group require Super Admin access.

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard` | Overview summaries, stock totals, low-stock resources, and recent orders |
| GET | `/reports` | Order, category, resource, user, and stock movement summaries |
| GET | `/orders` | List active or archived orders; supports status and view filters |
| GET | `/orders/:id` | Get order details and status history |
| POST | `/orders/:id/approve` | Approve a Pending order |
| POST | `/orders/:id/reject` | Reject a Pending order |
| POST | `/orders/:id/complete` | Complete an Approved order after handover |
| POST | `/orders/:id/cancel` | Cancel an order under administrative rules |
| POST | `/orders/archive-all` | Archive all currently active-list orders after confirmation |
| POST | `/orders/cancel-active` | Bulk-cancel active Pending/Approved orders after confirmation |
| POST | `/orders/:id/restore` | Restore an archived order to the active list |
| GET | `/users` | List non-deleted users |
| POST | `/users` | Create a Member |
| PATCH | `/users/:id/approval` | Approve/reject a pending registration |
| PATCH | `/users/:id/role` | Change Member/Super Admin role |
| PATCH | `/users/:id/rank` | Change member rank |
| PATCH | `/users/:id/status` | Activate/deactivate an account |
| DELETE | `/users/:id` | Soft-delete a Member |
| GET | `/member-stats` | Member order and spending statistics |
| GET | `/stock-movements` | Query inventory movement history |
| GET | `/activity` | Administrative activity history |
| GET | `/notes` | Search/list operational notes |
| POST | `/notes` | Create an operational note |
| PATCH | `/notes/:id` | Update an operational note |
| DELETE | `/notes/:id` | Delete an operational note |
| GET | `/integrations/discord` | Check Discord webhook configuration |
| POST | `/integrations/discord/test` | Send a test Discord notification |

## Finance — `/api/admin/finance`

All routes require Super Admin access.

| Method | Path | Purpose |
|---|---|---|
| GET | `/spending` | Lifetime totals and spending periods |
| POST | `/spending-periods` | Create a spending period |
| PATCH | `/spending-periods/current` | Edit the current spending period |
| POST | `/spending-periods/reset` | Close the current period and start a new one |
| GET | `/cash` | Gang cash summary and ledger entries |
| POST | `/cash/opening-balance` | Set the one-time opening balance |
| POST | `/cash/income` | Add manual income |
| POST | `/cash/expenses` | Record an expense |
| POST | `/cash/adjustments` | Record a balance adjustment |

## Favorites — `/api/favorites`

All routes require authentication.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List the current user's favorites |
| POST | `/:resourceId` | Add a resource to favorites |
| DELETE | `/:resourceId` | Remove a favorite resource |

## Notifications — `/api/notifications`

All routes require authentication.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List notifications and unread count |
| PATCH | `/:id/read` | Mark one notification as read |
| POST | `/read-all` | Mark all notifications as read |

## Notes

- Paths shown without their group prefix are relative to that route group.
- A valid session does not grant Super Admin access. Administrative routes check the role on the backend.
- The API applies rate limits to authentication, order creation, and general API traffic.
- CORS and mutation-origin checks use the configured `FRONTEND_ORIGIN`.
- Some route filters and response details are defined in the route implementation. Review `backend/src/routes/` before integrating an external client.
