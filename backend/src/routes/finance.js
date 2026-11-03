import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError, asyncHandler } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function parseJakartaStart(value) {
  if (!datePattern.test(value)) throw new HttpError(400, 'Tanggal harus menggunakan format YYYY-MM-DD.');
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new HttpError(400, 'Tanggal tidak valid.');
  return new Date(`${value}T00:00:00.000+07:00`);
}
function parseJakartaEnd(value) {
  if (!datePattern.test(value)) throw new HttpError(400, 'Tanggal harus menggunakan format YYYY-MM-DD.');
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new HttpError(400, 'Tanggal tidak valid.');
  return new Date(`${value}T23:59:59.999+07:00`);
}
function asNumber(value) { return Number(value || 0); }
function toCents(value) { return Math.round(asNumber(value) * 100); }
function fromCents(value) { return Number((value / 100).toFixed(2)); }
const moneyAmount = (schema) => schema.refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Nominal maksimal dua angka desimal.');

// Calculate with integer cents so a sequence of cash entries cannot accumulate
// floating-point rounding errors in balance checks.
async function cashSnapshot(db) {
  const totals = await db.gangCashEntry.groupBy({ by: ['type'], _sum: { amount: true }, _count: { _all: true } });
  const sums = Object.fromEntries(totals.map((row) => [row.type, toCents(row._sum.amount)]));
  const openingBalance = sums.OPENING_BALANCE || 0;
  const orderIncome = sums.ORDER_INCOME || 0;
  const adjustmentIncome = sums.ADJUSTMENT_IN || 0;
  const expenses = sums.EXPENSE || 0;
  const adjustmentExpense = sums.ADJUSTMENT_OUT || 0;
  const balance = openingBalance + orderIncome + adjustmentIncome - expenses - adjustmentExpense;
  return {
    initialized: totals.some((row) => row.type === 'OPENING_BALANCE'),
    totals,
    openingBalance,
    orderIncome,
    adjustmentIncome,
    expenses,
    adjustmentExpense,
    balance,
    entryCount: totals.reduce((sum, row) => sum + row._count._all, 0),
  };
}

async function spendingForPeriod(db, period) {
  const aggregate = await db.order.aggregate({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: period.startAt, ...(period.endAt ? { lte: period.endAt } : {}) },
    },
    _sum: { totalAmount: true, totalQuantity: true },
    _count: { _all: true },
  });
  return {
    completedOrders: aggregate._count._all,
    totalQuantity: aggregate._sum.totalQuantity || 0,
    totalAmount: asNumber(aggregate._sum.totalAmount),
  };
}

router.get('/spending', asyncHandler(async (_req, res) => {
  const [lifetimeAggregate, periods] = await Promise.all([
    prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true, totalQuantity: true },
      _count: { _all: true },
    }),
    prisma.spendingPeriod.findMany({
      include: { createdBy: { select: { username: true } } },
      orderBy: [{ isCurrent: 'desc' }, { startAt: 'desc' }],
      take: 100,
    }),
  ]);
  const withTotals = [];
  const batchSize = 5;
  for (let index = 0; index < periods.length; index += batchSize) {
    const batch = await Promise.all(periods.slice(index, index + batchSize).map(async (period) => ({
      ...period,
      summary: await spendingForPeriod(prisma, period),
    })));
    withTotals.push(...batch);
  }
  const currentPeriod = withTotals.find((period) => period.isCurrent) || null;
  res.json({
    lifetime: {
      completedOrders: lifetimeAggregate._count._all,
      totalQuantity: lifetimeAggregate._sum.totalQuantity || 0,
      totalAmount: asNumber(lifetimeAggregate._sum.totalAmount),
    },
    currentPeriod,
    periods: withTotals,
    calculation: 'Hanya pesanan Completed yang dihitung. Total sepanjang masa mencakup seluruh pesanan selesai, termasuk yang sudah diarsipkan.',
  });
}));

const periodSchema = z.object({
  name: z.string().trim().min(3).max(80),
  startDate: z.string().regex(datePattern, 'Tanggal mulai tidak valid.'),
  endDate: z.string().regex(datePattern, 'Tanggal akhir tidak valid.').nullable().optional(),
});

router.post('/spending-periods', asyncHandler(async (req, res) => {
  const data = periodSchema.parse(req.body ?? {});
  const startAt = parseJakartaStart(data.startDate);
  const endAt = data.endDate ? parseJakartaEnd(data.endDate) : null;
  if (endAt && endAt < startAt) throw new HttpError(400, 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
  const period = await prisma.$transaction(async (tx) => {
    const current = await tx.spendingPeriod.findFirst({ where: { isCurrent: true } });
    if (current) throw new HttpError(409, 'Periode aktif sudah ada. Ubah rentangnya atau gunakan Reset Periode untuk membuat periode baru.');
    const created = await tx.spendingPeriod.create({
      data: { name: data.name, startAt, endAt, isCurrent: true, createdById: req.user.id },
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'SPENDING_PERIOD_CREATED',
      detail: `Membuat periode pembelanjaan ${created.name} mulai ${data.startDate}${data.endDate ? ` sampai ${data.endDate}` : ' tanpa tanggal akhir'}.`,
    } });
    return created;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ period: { ...period, summary: await spendingForPeriod(prisma, period) }, message: 'Periode pembelanjaan berhasil dibuat.' });
}));

router.patch('/spending-periods/current', asyncHandler(async (req, res) => {
  const data = periodSchema.partial().parse(req.body ?? {});
  const current = await prisma.spendingPeriod.findFirst({ where: { isCurrent: true } });
  if (!current) throw new HttpError(404, 'Belum ada periode aktif. Buat periode pertama terlebih dahulu.');
  const startAt = data.startDate ? parseJakartaStart(data.startDate) : current.startAt;
  const endAt = data.endDate === undefined ? current.endAt : (data.endDate ? parseJakartaEnd(data.endDate) : null);
  if (endAt && endAt < startAt) throw new HttpError(400, 'Tanggal akhir tidak boleh sebelum tanggal mulai.');
  const period = await prisma.$transaction(async (tx) => {
    const updated = await tx.spendingPeriod.update({
      where: { id: current.id },
      data: { ...(data.name ? { name: data.name } : {}), startAt, endAt },
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'SPENDING_PERIOD_UPDATED',
      detail: `Mengubah rentang periode ${updated.name}: ${startAt.toISOString()} s.d. ${endAt ? endAt.toISOString() : 'terbuka'}.`,
    } });
    return updated;
  });
  res.json({ period: { ...period, summary: await spendingForPeriod(prisma, period) }, message: 'Rentang periode berhasil diperbarui.' });
}));

router.post('/spending-periods/reset', asyncHandler(async (req, res) => {
  const data = z.object({
    confirmation: z.literal('RESET PERIOD 30SFAMS'),
    name: z.string().trim().min(3).max(80).default('Periode baru'),
    startDate: z.string().regex(datePattern).optional(),
  }).parse(req.body ?? {});
  const now = new Date();
  const startAt = data.startDate ? parseJakartaStart(data.startDate) : now;
  const result = await prisma.$transaction(async (tx) => {
    const oldPeriod = await tx.spendingPeriod.findFirst({ where: { isCurrent: true } });
    if (oldPeriod && startAt <= oldPeriod.startAt) throw new HttpError(400, 'Tanggal mulai periode baru harus setelah tanggal mulai periode aktif.');
    if (oldPeriod) {
      const closedEnd = new Date(startAt.getTime() - 1);
      const endAt = oldPeriod.endAt && oldPeriod.endAt < closedEnd ? oldPeriod.endAt : closedEnd;
      await tx.spendingPeriod.update({ where: { id: oldPeriod.id }, data: { isCurrent: false, endAt } });
    }
    const created = await tx.spendingPeriod.create({
      data: { name: data.name, startAt, endAt: null, isCurrent: true, createdById: req.user.id },
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id, action: 'SPENDING_PERIOD_RESET',
      detail: `Mereset periode pembelanjaan. ${oldPeriod ? `Periode ${oldPeriod.name} ditutup.` : 'Periode pertama dibuat.'} Periode baru: ${created.name}. Total sepanjang masa tidak diubah.`,
    } });
    return created;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ period: { ...result, summary: await spendingForPeriod(prisma, result) }, message: 'Periode baru berhasil dimulai. Nilai periode baru dihitung dari nol, sedangkan total sepanjang masa tetap tersimpan.' });
}));

router.get('/cash', asyncHandler(async (_req, res) => {
  const [entries, snapshot] = await Promise.all([
    prisma.gangCashEntry.findMany({
      include: { createdBy: { select: { username: true } }, order: { select: { orderNumber: true, user: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 300,
    }),
    cashSnapshot(prisma),
  ]);
  res.json({
    initialized: snapshot.initialized,
    summary: {
      openingBalance: fromCents(snapshot.openingBalance),
      orderIncome: fromCents(snapshot.orderIncome),
      adjustmentIncome: fromCents(snapshot.adjustmentIncome),
      expenses: fromCents(snapshot.expenses),
      adjustmentExpense: fromCents(snapshot.adjustmentExpense),
      balance: fromCents(snapshot.balance),
      entryCount: snapshot.entryCount,
    },
    entries: entries.map((entry) => ({ ...entry, amount: asNumber(entry.amount) })),
    note: 'Saldo kas dapat disesuaikan admin kapan saja. Setiap perubahan dicatat sebagai transaksi baru; riwayat lama tidak ditimpa. Order sebelum buku kas diaktifkan tidak otomatis dimasukkan agar saldo tidak terhitung dua kali.',
  });
}));

router.post('/cash/opening-balance', asyncHandler(async (req, res) => {
  const data = z.object({
    amount: moneyAmount(z.coerce.number().min(0).max(1_000_000_000_000)),
    description: z.string().trim().min(3).max(250).default('Saldo awal kas gang 30sFams'),
  }).parse(req.body ?? {});
  const entry = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.gangCashEntry.count();
    if (existingCount > 0) throw new HttpError(409, 'Saldo awal sudah pernah dicatat. Gunakan Tambah saldo atau Koreksi saldo untuk perubahan berikutnya.');
    const created = await tx.gangCashEntry.create({
      data: { type: 'OPENING_BALANCE', amount: data.amount, category: 'Saldo awal', description: data.description, createdById: req.user.id },
    });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'GANG_CASH_OPENING_SET', detail: `Menetapkan saldo awal kas gang sebesar $${data.amount.toFixed(2)}.` } });
    return created;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ entry: { ...entry, amount: asNumber(entry.amount) }, message: 'Saldo awal kas gang berhasil disimpan.' });
}));

router.post('/cash/income', asyncHandler(async (req, res) => {
  const data = z.object({
    amount: moneyAmount(z.coerce.number().positive().max(1_000_000_000_000)),
    category: z.string().trim().min(2).max(50).default('Pemasukan manual'),
    description: z.string().trim().min(3).max(300),
  }).parse(req.body ?? {});
  const entry = await prisma.$transaction(async (tx) => {
    const snapshot = await cashSnapshot(tx);
    if (!snapshot.initialized) throw new HttpError(409, 'Tetapkan saldo awal kas terlebih dahulu.');
    const created = await tx.gangCashEntry.create({
      data: { type: 'ADJUSTMENT_IN', amount: data.amount, category: data.category, description: data.description, createdById: req.user.id },
    });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'GANG_CASH_MANUAL_INCOME', detail: `Menambahkan pemasukan kas $${data.amount.toFixed(2)} (${data.category}): ${data.description}` } });
    return created;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ entry: { ...entry, amount: asNumber(entry.amount) }, message: 'Penambahan saldo kas berhasil dicatat.' });
}));

router.post('/cash/expenses', asyncHandler(async (req, res) => {
  const data = z.object({
    amount: moneyAmount(z.coerce.number().positive().max(1_000_000_000_000)),
    category: z.string().trim().min(2).max(50),
    description: z.string().trim().min(3).max(300),
  }).parse(req.body ?? {});
  const result = await prisma.$transaction(async (tx) => {
    const snapshot = await cashSnapshot(tx);
    if (!snapshot.initialized) throw new HttpError(409, 'Tetapkan saldo awal kas terlebih dahulu.');
    const amountCents = toCents(data.amount);
    if (amountCents > snapshot.balance) throw new HttpError(409, `Saldo kas tidak mencukupi. Saldo saat ini $${fromCents(snapshot.balance).toFixed(2)}.`);
    const entry = await tx.gangCashEntry.create({
      data: { type: 'EXPENSE', amount: data.amount, category: data.category, description: data.description, createdById: req.user.id },
    });
    await tx.activityLog.create({ data: { userId: req.user.id, action: 'GANG_CASH_EXPENSE', detail: `Pengeluaran kas $${data.amount.toFixed(2)} (${data.category}): ${data.description}` } });
    return entry;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ entry: { ...result, amount: asNumber(result.amount) }, message: 'Pengeluaran kas berhasil dicatat.' });
}));

router.post('/cash/adjustments', asyncHandler(async (req, res) => {
  const data = z.object({
    direction: z.enum(['IN', 'OUT']),
    amount: moneyAmount(z.coerce.number().positive().max(1_000_000_000_000)),
    description: z.string().trim().min(3).max(300),
  }).parse(req.body ?? {});
  const entry = await prisma.$transaction(async (tx) => {
    const snapshot = await cashSnapshot(tx);
    if (!snapshot.initialized) throw new HttpError(409, 'Tetapkan saldo awal kas terlebih dahulu.');
    const amountCents = toCents(data.amount);
    if (data.direction === 'OUT' && amountCents > snapshot.balance) {
      throw new HttpError(409, `Koreksi akan membuat saldo kas negatif. Saldo saat ini $${fromCents(snapshot.balance).toFixed(2)}.`);
    }
    const type = data.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const created = await tx.gangCashEntry.create({
      data: {
        type,
        amount: data.amount,
        category: 'Koreksi saldo',
        description: data.description,
        createdById: req.user.id,
      },
    });
    await tx.activityLog.create({ data: {
      userId: req.user.id,
      action: data.direction === 'IN' ? 'GANG_CASH_ADJUSTMENT_IN' : 'GANG_CASH_ADJUSTMENT_OUT',
      detail: `Koreksi saldo kas ${data.direction === 'IN' ? 'bertambah' : 'berkurang'} $${data.amount.toFixed(2)}: ${data.description}`,
    } });
    return created;
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ entry: { ...entry, amount: asNumber(entry.amount) }, message: `Koreksi saldo kas (${data.direction === 'IN' ? 'penambahan' : 'pengurangan'}) berhasil dicatat.` });
}));
export default router;
