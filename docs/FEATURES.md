# Features and application behavior

This document describes the current application behavior as implemented in the repository.

## Roles

The application has two roles:

| Display name | Database role | Capabilities |
|---|---|---|
| Member | `USER` | Catalog, personal orders, favorites, notifications, and password changes |
| Super Admin | `ADMIN` | All Member capabilities, plus resource, order, member, finance, and operational administration |

Public registration creates a Member account in Pending status. A Super Admin must approve the registration before the account can sign in. Registration requires a username, email address, and password.

Super Admins can create members, approve/reject registrations, activate/deactivate accounts, change member roles and ranks, and soft-delete member accounts. A Super Admin cannot change their own role through the Members page, and the last active Super Admin cannot be demoted. Soft deletion disables access while retaining transaction history. Accounts with Pending or Approved orders cannot be soft-deleted until those orders are resolved.

Super Admins may also submit orders using their own account.

## Member experience

- Browse the resource catalog and search/filter resources.
- Add multiple items and quantities to an order and include an optional note.
- View personal order lists, order details, status history, and printable invoices.
- Cancel eligible Pending orders.
- Reorder completed orders. The new order uses current resource details, prices, and available stock.
- Add/remove favorite resources.
- Receive in-app notifications for account and order events.
- Change the account password. The new password must be at least 12 characters.

## Super Admin workspace

- Overview dashboard with order status summaries, inventory totals, recent orders, and low-stock indicators.
- Resource inventory: create resources, edit details/prices, activate/deactivate, adjust stock, upload/replace/remove images, and set minimum-stock thresholds.
- Stock movement history: restock, adjustment, reservation, release, and completion movements.
- Stash: separate view for items in the `OTHER` category.
- Orders: details, approval, rejection, completion, cancellation, archive, restore, and supported bulk actions.
- Members: account creation, registration review, account status, role, rank, and soft deletion.
- Reporting: member statistics, order totals, resource summaries, and activity history.
- Finance: spending periods and the gang cash ledger.
- Notes: create, edit, search, and delete operational notes.
- Integrations: in-app notifications and optional Discord webhook notifications.

## Resource categories and Stash

The order catalog supports:

`CLASS1`, `CLASS2`, `CLASS3`, `NARKO`, `VEST`, `ATTACHMENT`, and `AMMO`.

The `OTHER` category is reserved for Stash. It is not available in the order catalog and cannot be ordered. The main Overview stock totals exclude `OTHER` resources.

Stash is a separate view over the same Resource records. It does not create a second copy of inventory: changes to the shared resource stock are reflected in the related inventory data.

## Order and stock lifecycle

Stock is reserved when a new order is submitted.

1. **Pending:** when the order is created, available stock is reduced and reserved stock is increased within a database transaction.
2. **Approved:** the order status changes, but the existing stock reservation remains. Approval must not reserve/deduct the stock a second time.
3. **Rejected or Cancelled:** applicable reserved stock is released back to available stock.
4. **Completed:** after handover, reserved stock is consumed and the order's income is recorded in the gang cash ledger.
5. **Archived:** the order is hidden from the active operational list. Archiving does not change the order status, stock, or historical totals. An archived order can be restored.

Order creation and state changes use database transactions and conditional stock updates to reduce the risk of overselling or duplicate processing. Order items keep snapshots of the resource name, category, unit, unit price, quantity, and subtotal so later catalog edits do not rewrite historical order details.

There is no automatic reservation expiry. Super Admins must complete or cancel an Approved order after the handover decision.

## Finance and currency

The interface formats monetary values as USD (`$`). Changing the display format does not convert historical numeric values stored in the database. Review existing resource prices and balances before treating them as USD amounts.

The spending view calculates completed-order totals and supports named spending periods. Resetting a period closes the prior period and starts a new one; it does not delete lifetime completed-order totals.

The gang cash ledger stores:
- Opening balance.
- Income from orders when they become Completed.
- Manual income.
- Expenses.
- Balance adjustments.

The opening balance can only be initialized once. It must be set before an order can be completed and have its income recorded. Orders completed before the cash ledger was initialized are not automatically backfilled; set the opening balance to the actual cash on hand to avoid double counting.

Ledger updates create entries rather than overwriting earlier entries. An expense that exceeds the available balance is rejected.

## Images and notifications

Resource images use a private S3-compatible object-storage bucket in production. The API generates signed URLs for authorized resource records. The browser may resize JPEG/PNG/WebP uploads to a maximum longest side of 1,440 pixels and convert to WebP when the result is smaller. Animated GIFs are kept unchanged. The backend upload limit is 4 MB per image.

Local development can use the local uploads folder. Production image upload requires the object-storage environment variables documented in [DEPLOYMENT.md](./DEPLOYMENT.md).

In-app notifications are stored in PostgreSQL. Discord notifications are optional and require a valid `DISCORD_WEBHOOK_URL`. A successful Discord webhook test can be initiated by a Super Admin from the integration controls.

## Exports

The interface provides CSV exports for supported order, stock movement, and finance records. CSV files use UTF-8 and are intended to be opened in spreadsheet software such as Microsoft Excel.
