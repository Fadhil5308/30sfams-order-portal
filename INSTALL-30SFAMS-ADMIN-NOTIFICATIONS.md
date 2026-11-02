# 30sFams — Admin Accounts, Notifications, Manual Reservation, Direct Handover

## Included changes

- Public self-registration is disabled. Users are created by an authenticated admin from the **Pengguna** page.
- Admin can activate/deactivate USER accounts. Deactivation is blocked while the member still has PENDING or APPROVED orders, so reserved inventory cannot become stranded.
- Users can change their own password (minimum 12 characters).
- In-app notifications are available to admins and users. The bell refreshes every 30 seconds while the page is open.
  - New orders notify all active admins and the user who submitted the order.
  - Approval, rejection, cancellation, and completion notify the order owner.
  - User cancellation notifies active admins.
  - Admin-created accounts receive a welcome notification.
- Approved stock reservations have no automatic expiration. Admin manually completes the order after handing over the resource, or cancels it to release the reservation.
- Direct handover is recorded when the admin marks an APPROVED order as COMPLETED. An optional handover note is stored in the order timeline.
- All changes are additive. Existing accounts are marked active by the database default; existing orders, order items, inventory, stock movements, invoices, archives, and logs are not deleted or reset.

## Important: preserve your local data

1. Stop the backend and frontend terminals with `Ctrl + C`. Leave Docker Desktop and PostgreSQL running.
2. From the project root, create a database backup:

   ```powershell
   docker compose exec -T postgres pg_dump -U postgres -d fivem_resource_portal > .\backup-before-admin-notifications.sql
   ```

3. Confirm `backup-before-admin-notifications.sql` exists and is not 0 KB.
4. Extract this ZIP. Copy the contents of its `fivem-resource-portal` folder into your existing project folder:

   ```text
   C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal
   ```

5. Choose **Replace files** when Windows asks. This package intentionally does not contain your `.env`, `node_modules`, `backend/uploads`, Docker volume, or generated Prisma client. Do not delete those from your project.

## Apply the additive database migration

Open a backend terminal:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\backend"
npm.cmd install multer
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

`db:migrate` adds `User.isActive` and the `Notification` table. It does not drop or reset existing records. Do **not** run `prisma migrate reset`, `db:reset`, `docker compose down -v`, or delete the PostgreSQL volume.

Open a second terminal for the frontend:

```powershell
cd "C:\Z CLIP IME\fivem-resource-portal\fivem-resource-portal\frontend"
npm.cmd run dev
```

Open `http://localhost:5173`.

## Test checklist

1. Existing admin can still log in.
2. Public registration is no longer offered. Direct API registration attempts return HTTP 403.
3. Admin > Pengguna > Buat akun user creates a USER account.
4. The user can log in and change their password from the key icon in the sidebar.
5. Deactivating a user with PENDING/APPROVED orders is refused. After those orders are completed/cancelled, admin can deactivate the user; their next API request/session is rejected.
6. A new user order creates notifications for active admins and for the user.
7. Admin approval creates a notification for the user and reserves stock. There is no automatic expiry.
8. Admin marks the approved order complete after handover; reserved stock is released from the inventory total, the handover note is visible in the timeline, and the user receives a notification.
9. Test rejection, cancellation, and user cancellation notifications.

## Notifications behavior

Notifications are **in-app** only in this version (bell icon, unread count, and a 30-second refresh while the site is open). Email, Discord, and WhatsApp delivery are not configured.
