/**
 * Persistent in-app notifications.
 * Pass a Prisma client or transaction client as the first argument so notification
 * writes commit atomically with the business action that caused them.
 */
export async function notifyUsers(tx, userIds, { type, title, message, orderId = null }) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (!uniqueIds.length) return;
  await tx.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, type, title, message, orderId })),
  });
}

export async function notifyAdmins(tx, payload) {
  const admins = await tx.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });
  await notifyUsers(tx, admins.map((admin) => admin.id), payload);
}

export async function notifyOrderOwner(tx, order, payload) {
  await notifyUsers(tx, [order.userId], { ...payload, orderId: order.id });
}
