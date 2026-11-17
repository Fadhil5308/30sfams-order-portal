# Operations and maintenance

This guide is for routine operation of the live 30sFams Order Portal. Use it alongside [FEATURES.md](./FEATURES.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [DATABASE-BACKUP.md](./DATABASE-BACKUP.md).

## Before opening the portal to members

- [ ] Confirm the production URL and API health check are reachable.
- [ ] Confirm a Super Admin can sign in.
- [ ] Confirm Member registration creates a Pending account.
- [ ] Confirm a Super Admin can approve and reject registration requests.
- [ ] Confirm an approved Member can sign in and a rejected/deactivated Member cannot.
- [ ] Confirm resource prices, available stock, reserved stock, and minimum-stock thresholds.
- [ ] Confirm the `OTHER` category is only visible in Stash and excluded from Overview stock totals.
- [ ] Upload a small test image and confirm that it loads for an authenticated user.
- [ ] Confirm the opening gang cash balance has been set to the real current balance before completing orders.
- [ ] Confirm a recent database backup and object-storage image backup exist.

## Order and stock checks

Use a low-quantity test resource or a controlled operational test.

1. Submit a Member order. Confirm its status is Pending.
2. Check stock: available stock must decrease and reserved stock must increase immediately.
3. Approve the order. Confirm the same reservation remains and is not deducted again.
4. Reject or cancel an eligible order. Confirm its reservation is released back to available stock.
5. Complete an Approved order after handover. Confirm reserved stock is consumed and exactly one order-income entry is written to the gang cash ledger.
6. Inspect order details, status history, stock movements, and finance entries.

Avoid testing bulk cancellation, archive-all, role changes, or deletion against real operational data unless the action is intentional and approved.

## Member and permission checks

- Member accounts must only access their own order records and personal features.
- Member accounts must not access Super Admin endpoints or finance data.
- Only a Super Admin can access inventory management, Stash administration, all orders, member management, reports, notes, and finance.
- A deleted Member must not be able to start a new session; prior orders and transaction history must remain.
- A Super Admin can place orders as a normal order owner, while retaining administrative access.

## Finance checks

- The spending view counts completed orders.
- Starting a new spending period must not delete lifetime completed-order totals.
- Gang cash income from an order is recorded when the order is completed after handover, not when the order is first submitted or approved.
- An expense larger than the available gang cash balance must be rejected.
- Corrections should be recorded as adjustments rather than editing/deleting historical ledger entries.

Remember that changing the currency display to USD does not convert older numeric values. Confirm historical amounts and resource prices before using them as dollar values.

## Image and notification checks

- Production images require the object-storage configuration. Do not rely on ephemeral Vercel filesystem storage.
- If resource images fail, verify the resource record, object key, object existence, bucket permissions, signed URL behavior, and storage environment variables.
- In-app notifications are stored in the database.
- Discord delivery is optional. Verify the webhook through the Super Admin integration test before relying on it.

## Routine maintenance

| Task | Frequency |
|---|---|
| Review new registrations and account access | Daily or whenever registrations arrive |
| Review Pending/Approved orders and long-lived reservations | Daily |
| Review low-stock warnings and inventory movements | Daily / after restocking |
| Review gang cash entries and spending totals | After financial activity |
| Database backup | Daily |
| Object-storage backup | Weekly and after important uploads |
| Restore test | Periodically and after changing backup procedures |
| Review Vercel function logs and deployment status | After releases and when errors are reported |

## When an issue occurs

1. Record the approximate time, affected account/role, page, action, and visible error.
2. Check Vercel deployment status and backend function logs for actual error responses. Informational runtime messages are not automatically application failures.
3. Check Neon availability and connection errors.
4. For stock or finance discrepancies, inspect the order status history, stock movement records, and gang cash ledger before attempting a manual correction.
5. Avoid repeating a write action when the first request may have succeeded; reload and verify the resulting record first.
6. If data corruption is suspected, stop further risky writes and preserve logs and backups before attempting recovery.
7. Restore to a separate database first and validate before switching production.

## Release checklist

- [ ] Review the GitHub diff before merging/pushing.
- [ ] Confirm any schema change has a reviewed migration.
- [ ] Back up production database and relevant object-storage files before schema or storage changes.
- [ ] Confirm environment variables for the target Vercel environment.
- [ ] Confirm the deployment succeeds.
- [ ] Run the post-deployment smoke tests in [DEPLOYMENT.md](./DEPLOYMENT.md).
- [ ] Monitor real usage after release and record any issues.
