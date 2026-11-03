import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Archive, ArrowDownToLine, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, ClipboardList, Clock3,
  Command, Database, FileText, History, LayoutDashboard, LogOut, Menu, Package,
  PackagePlus, Printer, Search, ShieldCheck, ShoppingCart, SlidersHorizontal,
  Sparkles, Trash2, Truck, Upload, UserRound, Users, UserPlus, UserX, CheckCheck, KeyRound, X, XCircle, RotateCcw, Wallet, CalendarDays, Star, Repeat,
} from 'lucide-react';
import { api, assetUrl, categoryLabel, dateTime, money, number, statusLabel, uploadFile } from './api';

const CATEGORIES = ['CLASS1', 'CLASS2', 'CLASS3', 'NARKO', 'VEST', 'ATTACHMENT'];

function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src="/30s-logo.png" alt="Logo 30sFams" />;
}

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`notice ${notice.type}`} role="status">
    {notice.type === 'error' ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
    <span>{notice.message}</span>
    <button className="icon-button notice-close" onClick={clear} aria-label="Tutup"><X size={15} /></button>
  </div>;
}

function AuthScreen({ onAuthenticated, setNotice }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  async function submitLogin(event) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: loginForm.identifier, password: loginForm.password }) });
      onAuthenticated(result.user);
      setNotice({ type: 'success', message: 'Berhasil masuk ke 30sFams Order Portal.' });
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      setNotice({ type: 'error', message: 'Konfirmasi password belum sama.' }); return;
    }
    setBusy(true);
    try {
      const result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ username: registerForm.username, email: registerForm.email, password: registerForm.password }) });
      setNotice({ type: 'success', message: result.message });
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
      setMode('login');
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  return <div className="auth-shell">
    <div className="auth-visual">
      <div className="auth-brand"><BrandLogo className="auth-brand-logo" /><span>30s<span className="brand-accent">FAMS</span></span></div>
      <div className="auth-copy">
        <div className="eyebrow"><span className="live-dot" /> 30SFAMS · RESOURCE ORDER PORTAL</div>
        <h1>One family.<br /><span>One supply.</span></h1>
        <p>Portal pemesanan internal 30sFams untuk mengelola resource, memantau stok, dan mencatat setiap transaksi.</p>
        <div className="auth-feature-list">
          <div><ShieldCheck size={18} /><span>Akun anggota diverifikasi admin</span></div>
          <div><Package size={18} /><span>Stok dan reservasi real-time</span></div>
          <div><ChartNoAxesCombined size={18} /><span>Laporan pembelanjaan dan kas gang</span></div>
        </div>
      </div>
      <div className="auth-visual-footer"><span>RESOURCE MANAGEMENT SYSTEM</span><span>30SFAMS</span></div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel-top"><span>30SFAMS <span className="muted">/ MEMBER ACCESS</span></span><span className="secure-label"><ShieldCheck size={14} /> SECURE ACCESS</span></div>
      <div className="auth-form-wrap">
        <div className="auth-heading"><span className="section-kicker">{mode === 'login' ? 'WELCOME BACK' : 'JOIN 30SFAMS'}</span><h2>{mode === 'login' ? 'Masuk ke akun' : 'Daftar anggota'}</h2><p>{mode === 'login' ? 'Masukkan username atau email dan password akun kamu.' : 'Buat akun anggota. Akun akan aktif setelah disetujui admin 30sFams.'}</p></div>
        {mode === 'login' ? <form onSubmit={submitLogin} className="form-stack">
          <label>Username atau email<input required value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} placeholder="Masukkan username atau email" autoComplete="username" /></label>
          <label>Password<input required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Masukkan password" autoComplete="current-password" /></label>
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'Memproses...' : 'Masuk ke dashboard'} <ArrowUpRight size={17} /></button>
        </form> : <form onSubmit={submitRegistration} className="form-stack">
          <label>Username<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} placeholder="Contoh: member30s" autoComplete="username" /></label>
          <label>Email<input required type="email" maxLength={150} value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} placeholder="nama@email.com" autoComplete="email" /></label>
          <label>Password<input required type="password" minLength={12} maxLength={100} value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} placeholder="Minimal 12 karakter" autoComplete="new-password" /></label>
          <label>Konfirmasi password<input required type="password" minLength={12} maxLength={100} value={registerForm.confirmPassword} onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })} placeholder="Ulangi password" autoComplete="new-password" /></label>
          <button className="button button-primary button-full" disabled={busy || registerForm.password !== registerForm.confirmPassword}>{busy ? 'Mengirim pendaftaran...' : 'Kirim pendaftaran'} <ArrowUpRight size={17} /></button>
          <div className="form-hint"><ShieldCheck size={14} /> Akun baru berstatus menunggu dan tidak dapat login sebelum disetujui admin.</div>
        </form>}
        <div className="auth-mode-switch">{mode === 'login' ? <>Belum punya akun? <button type="button" className="text-button" onClick={() => setMode('register')}>Daftar sekarang</button></> : <>Sudah punya akun? <button type="button" className="text-button" onClick={() => setMode('login')}>Kembali ke login</button></>}</div>
      </div>
      <div className="auth-panel-footer">Akses anggota 30sFams · Semua pendaftaran diperiksa oleh admin.</div>
    </div>
  </div>;
}

function NotificationCenter({ notifications, unreadCount, onReadAll, onSelect }) {
  const [open, setOpen] = useState(false);
  return <div className="notification-center">
    <button className="icon-button notification-button" title="Notifikasi" aria-label="Notifikasi" onClick={() => setOpen((value) => !value)}>
      <Bell size={18} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="notification-dropdown">
      <div className="notification-dropdown-header"><div><strong>Notifikasi</strong><small>{unreadCount} belum dibaca</small></div><button className="text-button" disabled={!unreadCount} onClick={onReadAll}><CheckCheck size={14} /> Baca semua</button></div>
      <div className="notification-list">
        {notifications.length ? notifications.map((item) => <button key={item.id} className={`notification-item ${item.isRead ? 'read' : 'unread'}`} onClick={() => { onSelect(item); setOpen(false); }}>
          <span className={`notification-item-icon ${item.type.toLowerCase()}`}><Bell size={15} /></span>
          <span className="notification-item-content"><strong>{item.title}</strong><span>{item.message}</span><small>{dateTime(item.createdAt)}{item.order?.orderNumber ? ` · ${item.order.orderNumber}` : ''}</small></span>
          {!item.isRead && <i className="notification-unread-dot" />}
        </button>) : <EmptyState icon={Bell} title="Belum ada notifikasi" detail="Aktivitas pesanan akan muncul di sini." />}
      </div>
    </div>}
  </div>;
}

function ChangePasswordModal({ onClose, onSubmit, busy }) {
  const [draft, setDraft] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  async function submit(event) {
    event.preventDefault();
    if (draft.newPassword !== draft.confirmPassword) return;
    const changed = await onSubmit({ currentPassword: draft.currentPassword, newPassword: draft.newPassword });
    if (changed) onClose();
  }
  return <div className="order-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="change-password-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <div className="panel-heading"><div><span className="section-kicker">ACCOUNT SECURITY</span><h3 id="change-password-title">Ganti password</h3><p>Gunakan password baru minimal 12 karakter.</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18}/></button></div>
      <form className="form-stack change-password-form" onSubmit={submit}>
        <label>Password saat ini<input required type="password" autoComplete="current-password" value={draft.currentPassword} onChange={(event) => setDraft({ ...draft, currentPassword: event.target.value })}/></label>
        <label>Password baru<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={draft.newPassword} onChange={(event) => setDraft({ ...draft, newPassword: event.target.value })}/></label>
        <label>Konfirmasi password baru<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={draft.confirmPassword} onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })}/></label>
        {draft.confirmPassword && draft.newPassword !== draft.confirmPassword && <small className="password-mismatch">Konfirmasi password belum sama.</small>}
        <div className="form-footer"><button type="button" className="button button-ghost" onClick={onClose}>Batal</button><button className="button button-primary" disabled={busy || draft.newPassword !== draft.confirmPassword || draft.newPassword.length < 12}><KeyRound size={15}/> Simpan password</button></div>
      </form>
    </section>
  </div>;
}

function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>;
}

function StatusPill({ status }) {
  return <span className={`status-pill ${String(status).toLowerCase()}`}><span />{statusLabel(status)}</span>;
}

function EmptyState({ icon: Icon = Package, title, detail }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={23} /></div><strong>{title}</strong><p>{detail}</p></div>;
}

function SectionHeader({ eyebrow, title, description, action }) {
  return <div className="section-header"><div><div className="section-kicker">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Dashboard({ user, resources = [], orders = [], reports, dashboardData, goTo }) {
  const isAdmin = user.role === 'ADMIN';
  const pending = orders.filter((order) => order.status === 'PENDING').length;
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  const completedQty = completed.reduce((sum, order) => sum + order.totalQuantity, 0);
  const completedAmount = completed.reduce((sum, order) => sum + order.totalAmount, 0);

  if (isAdmin) {
    const summary = dashboardData?.summary || reports?.summary || {};
    const stock = dashboardData?.stock || {};
    const byCategory = stock.byCategory || {};
    const totalAvailable = Number(stock.available ?? resources.reduce((sum, item) => sum + item.stockAvailable, 0));
    const totalReserved = Number(stock.reserved ?? resources.reduce((sum, item) => sum + item.stockReserved, 0));
    const recentOrders = dashboardData?.recentOrders || orders;
    const categoryValues = CATEGORIES.map((category) => Number(
      byCategory[category] ?? resources.filter((item) => item.category === category).reduce((sum, item) => sum + item.stockAvailable, 0)
    ));
    const maxCategoryStock = Math.max(1, ...categoryValues);

    return <>
      <SectionHeader eyebrow="ADMIN OVERVIEW" title={`Selamat datang, ${user.username}`} description="Pantau inventory, permintaan, dan aktivitas resource server." action={<div className="date-chip"><Clock3 size={15} /> {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}</div>} />
      <div className="stats-grid">
        <StatCard label="Total jenis resource" value={number(summary.activeResources ?? resources.length)} detail="Resource aktif" icon={Boxes} tone="blue" />
        <StatCard label="Stok tersedia" value={number(totalAvailable)} detail={`${number(totalReserved)} unit sedang dicadangkan`} icon={Package} tone="green" />
        <StatCard label="Pesanan menunggu" value={number(summary.pendingOrders ?? pending)} detail="Perlu ditinjau admin" icon={ClipboardList} tone="orange" />
        <StatCard label="Total nilai selesai" value={money(summary.completedAmount ?? completedAmount)} detail={`${number(summary.completedQuantity ?? completedQty)} unit terjual`} icon={CircleDollarSign} tone="purple" />
      </div>
      <div className="dashboard-grid">
        <div className="panel"><div className="panel-heading"><div><h3>Pesanan terbaru</h3><p>Permintaan resource yang masuk</p></div><button className="text-button" onClick={() => goTo('admin-orders')}>Lihat semua <ArrowUpRight size={15} /></button></div>
          {recentOrders.slice(0, 5).length ? <div className="compact-list">{recentOrders.slice(0, 5).map((order) => <div className="compact-row" key={order.id}><div className="item-symbol"><ClipboardList size={17} /></div><div className="compact-main"><strong>{order.orderNumber}</strong><span>{order.user?.username || 'User'} · {number(order.totalQuantity)} unit</span></div><div className="compact-side"><StatusPill status={order.status} /><span>{money(order.totalAmount)}</span></div></div>)}</div> : <EmptyState icon={ClipboardList} title="Belum ada pesanan" detail="Pesanan pengguna akan muncul di sini." />}
        </div>
        <div className="panel"><div className="panel-heading"><div><h3>Stok per kategori</h3><p>Jumlah stok tersedia saat ini</p></div><button className="icon-button" onClick={() => goTo('inventory')} aria-label="Buka inventory"><ArrowUpRight size={17} /></button></div>
          <div className="category-stock">{CATEGORIES.map((category, index) => { const qty = categoryValues[index]; return <div className="category-stock-row" key={category}><div><span>{categoryLabel(category)}</span><strong>{number(qty)}</strong></div><div className="progress-track"><span style={{ width: `${Math.max(3, qty / maxCategoryStock * 100)}%` }} /></div></div>; })}</div>
        </div>
      </div>
    </>;
  }

  const totalAvailable = resources.reduce((sum, resource) => sum + resource.stockAvailable, 0);
  const totalReserved = resources.reduce((sum, resource) => sum + resource.stockReserved, 0);
  return <>
    <SectionHeader eyebrow="PERSONAL OVERVIEW" title={`Selamat datang, ${user.username}`} description="Ringkasan resource dan aktivitas pemesanan akun Anda." action={<div className="date-chip"><Clock3 size={15} /> {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}</div>} />
    <div className="stats-grid">
      <StatCard label="Resource tersedia" value={number(resources.length)} detail="Jenis item dalam katalog" icon={Boxes} tone="blue" />
      <StatCard label="Pesanan menunggu" value={number(pending)} detail="Menunggu persetujuan admin" icon={Clock3} tone="orange" />
      <StatCard label="Unit selesai dibeli" value={number(completedQty)} detail="Akumulasi pesanan selesai" icon={Package} tone="green" />
      <StatCard label="Total nominal pembelian" value={money(completedAmount)} detail="Hanya pesanan selesai" icon={CircleDollarSign} tone="purple" />
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>Riwayat pesanan terbaru</h3><p>Status pesanan dari akun Anda</p></div><button className="text-button" onClick={() => goTo('my-orders')}>Lihat semua <ArrowUpRight size={15} /></button></div>
      {orders.slice(0, 6).length ? <div className="table-wrap"><table><thead><tr><th>Nomor pesanan</th><th>Tanggal</th><th>Jumlah</th><th>Total nominal</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 6).map((order) => <tr key={order.id}><td className="strong-cell">{order.orderNumber}</td><td>{dateTime(order.createdAt)}</td><td>{number(order.totalQuantity)} unit</td><td>{money(order.totalAmount)}</td><td><StatusPill status={order.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={ShoppingCart} title="Belum ada transaksi" detail="Pilih resource dari katalog untuk membuat pesanan pertama." />}
    </div>
  </>;
}
function Catalog({ resources, cart, setCart, search, setSearch, category, setCategory, submitOrder, busy, favoriteIds = [], onToggleFavorite, favoriteOnly = false }) {
  const [orderNotes, setOrderNotes] = useState('');
  const filtered = resources.filter((resource) => {
    const matchCategory = category === 'ALL' || resource.category === category;
    const matchSearch = `${resource.name} ${resource.sku} ${resource.description}`.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch && (!favoriteOnly || favoriteIds.includes(resource.id));
  });
  const cartItems = resources.filter((resource) => cart[resource.id] > 0);
  const cartQty = cartItems.reduce((sum, resource) => sum + cart[resource.id], 0);
  const cartTotal = cartItems.reduce((sum, resource) => sum + cart[resource.id] * resource.unitPrice, 0);
  function changeCart(id, delta, available) {
    setCart((current) => {
      const next = { ...current };
      const qty = (next[id] || 0) + delta;
      if (qty <= 0) delete next[id]; else next[id] = Math.min(qty, available);
      return next;
    });
  }
  return <>
    <SectionHeader eyebrow={favoriteOnly ? 'SAVED RESOURCES' : 'RESOURCE CATALOG'} title={favoriteOnly ? 'Resource favorit' : 'Pilih resource'} description={favoriteOnly ? 'Daftar resource favorit yang kamu simpan untuk pemesanan berikutnya.' : 'Temukan item yang dibutuhkan, tentukan jumlah, lalu kirim pesanan untuk ditinjau admin.'} action={<div className="cart-summary"><ShoppingCart size={17} /><span>{number(cartQty)} unit</span><strong>{money(cartTotal)}</strong></div>} />
    <div className="catalog-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama resource atau SKU..." /></div><div className="filter-select"><SlidersHorizontal size={16} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="ALL">Semua kategori</option>{CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabel(item)}</option>)}</select><ChevronDown size={15} /></div></div>
    {filtered.length ? <div className="resource-grid">{filtered.map((resource) => <article className="resource-card" key={resource.id}>
      <div className={`resource-art ${resource.category.toLowerCase()} ${resource.imageUrl ? 'with-photo' : ''}`}>
        {resource.imageUrl && <img className="resource-art-photo" src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" />}
        <div className="resource-art-grid" /><span>{categoryLabel(resource.category)}</span>
        {!resource.imageUrl && <div className="resource-art-icon"><Package size={30} /></div>}
        <small>{resource.sku}</small>
      </div>
      <div className="resource-card-body"><div className="resource-name-row"><h3>{resource.name}</h3><button type="button" className={`favorite-toggle ${favoriteIds.includes(resource.id) ? 'active' : ''}`} onClick={() => onToggleFavorite?.(resource)} title={favoriteIds.includes(resource.id) ? 'Hapus dari favorit' : 'Simpan ke favorit'} aria-label={favoriteIds.includes(resource.id) ? 'Hapus dari favorit' : 'Simpan ke favorit'}><Star size={16} fill={favoriteIds.includes(resource.id) ? 'currentColor' : 'none'} /></button><span className={`stock-tag ${resource.stockAvailable > 0 ? 'in-stock' : 'out-stock'}`}>{resource.stockAvailable > 0 ? 'Available' : 'Out of stock'}</span></div><p>{resource.description || 'Tidak ada deskripsi untuk resource ini.'}</p><div className="resource-meta"><span>Harga / {resource.unit}</span><strong>{money(resource.unitPrice)}</strong></div><div className="resource-meta"><span>Stok tersedia</span><strong>{number(resource.stockAvailable)} {resource.unit}</strong></div>
        <div className="resource-action">{cart[resource.id] ? <div className="quantity-control"><button onClick={() => changeCart(resource.id, -1, resource.stockAvailable)} aria-label="Kurangi">−</button><strong>{cart[resource.id]}</strong><button onClick={() => changeCart(resource.id, 1, resource.stockAvailable)} disabled={cart[resource.id] >= resource.stockAvailable} aria-label="Tambah">+</button></div> : <button className="button button-outline button-full" disabled={resource.stockAvailable <= 0} onClick={() => changeCart(resource.id, 1, resource.stockAvailable)}><ShoppingCart size={15} /> Tambah pesanan</button>}</div>
      </div>
    </article>)}</div> : <EmptyState icon={Search} title="Resource tidak ditemukan" detail="Coba ubah kata kunci atau filter kategori." />}
    <div className="checkout-notes panel"><label htmlFor="order-notes"><span>Catatan untuk admin <small>(opsional, maksimal 500 karakter)</small></span><textarea id="order-notes" maxLength={500} rows={2} value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} placeholder="Contoh: Mohon proses untuk kebutuhan event malam ini." /></label><div className="notes-counter">{orderNotes.length}/500 karakter</div></div>
    <div className="order-cart-bar"><div><span className="cart-label">KERANJANG PESANAN</span><strong>{number(cartQty)} unit <span>·</span> {money(cartTotal)}</strong></div><button className="button button-primary" disabled={!cartQty || busy} onClick={() => submitOrder(orderNotes)}>{busy ? 'Mengirim...' : 'Kirim pesanan'} <ArrowUpRight size={16} /></button></div>
  </>;
}

function OrderTable({ orders, isAdmin, onAction, onDetail, onRestore, onReorder, busy, readOnly = false, isArchived = false }) {
  if (!orders.length) return <EmptyState icon={ClipboardList} title="Belum ada data pesanan" detail="Data pesanan akan tampil di halaman ini setelah ada transaksi." />;
  return <div className="table-wrap"><table><thead><tr>{isAdmin && <th>Pemesan</th>}<th>Nomor pesanan</th><th>Tanggal</th>{isArchived && <th>Diarsipkan</th>}<th>Resource</th><th>Jumlah</th><th>Total nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}>
    {isAdmin && <td><div className="user-cell"><div className="avatar-mini">{(order.user?.username || 'U').slice(0, 1).toUpperCase()}</div>{order.user?.username || '-'}</div></td>}
    <td><span className="strong-cell">{order.orderNumber}</span>{order.notes && <small className="cell-sub">Catatan: {order.notes}</small>}</td><td>{dateTime(order.createdAt)}</td>{isArchived && <td>{dateTime(order.archivedAt)}</td>}<td><div className="resource-lines">{order.items.map((item) => <span key={item.id}>{item.resourceName}</span>)}</div></td><td>{number(order.totalQuantity)} unit</td><td className="strong-cell">{money(order.totalAmount)}</td><td><StatusPill status={order.status} />{order.adminNotes && <small className="cell-sub">{order.adminNotes}</small>}</td>
    <td><div className="table-actions"><button className="button button-small button-ghost" disabled={busy} onClick={() => onDetail(order)}><FileText size={13} /> Detail</button>{isArchived && isAdmin && <button className="button button-small button-ghost" disabled={busy} onClick={() => onRestore(order)}><RotateCcw size={13} /> Pulihkan</button>}{!readOnly && isAdmin && order.status === 'PENDING' && <><button className="action-button approve" disabled={busy} onClick={() => onAction(order, 'approve')} title="Setujui"><Check size={15} /></button><button className="action-button reject" disabled={busy} onClick={() => onAction(order, 'reject')} title="Tolak"><X size={15} /></button></>}{!readOnly && isAdmin && order.status === 'APPROVED' && <><button className="action-button approve" disabled={busy} onClick={() => onAction(order, 'complete')} title="Konfirmasi penyerahan langsung dan selesaikan"><CheckCircle2 size={15} /></button><button className="action-button reject" disabled={busy} onClick={() => onAction(order, 'cancel')} title="Batalkan dan lepas stok"><X size={15} /></button></>}{!readOnly && !isAdmin && order.status === 'PENDING' && <button className="button button-small button-ghost-danger" disabled={busy} onClick={() => onAction(order, 'cancel')}>Batalkan</button>}{!readOnly && !isAdmin && order.status === 'COMPLETED' && onReorder && <button className="button button-small button-outline" disabled={busy} onClick={() => onReorder(order)}><Repeat size={13}/> Pesan ulang</button>}</div></td>
  </tr>)}</tbody></table></div>;
}

function OrderDetailModal({ order, onClose, onPrint, isAdmin }) {
  if (!order) return null;
  const history = order.statusHistory?.length ? order.statusHistory : [{
    id: 'legacy-history', fromStatus: null, toStatus: order.status,
    note: 'Riwayat perubahan status sebelum fitur timeline diaktifkan belum tersedia.',
    createdAt: order.updatedAt || order.createdAt, changedBy: { username: 'System' },
  }];
  return <div className="order-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <div className="order-detail-toolbar no-print"><div><span className="section-kicker">30SFAMS · ORDER RECORD</span><h2>Detail pesanan</h2></div><div className="modal-toolbar-actions"><button className="button button-outline" onClick={onPrint}><Printer size={15} /> Cetak / PDF</button><button className="icon-button" onClick={onClose} aria-label="Tutup detail"><X size={19} /></button></div></div>
      <div className="invoice-sheet">
        <header className="invoice-brand-row"><div className="invoice-brand"><img src="/30s-logo.png" alt="30sFams"/><div><strong>30sFAMS</strong><span>RESOURCE ORDER PORTAL</span></div></div><div className="invoice-status"><span>STATUS PESANAN</span><StatusPill status={order.status} /></div></header>
        <div className="invoice-title-row"><div><span className="section-kicker">ORDER DETAIL / INVOICE</span><h2 id="order-detail-title">{order.orderNumber}</h2><p>Dibuat pada {dateTime(order.createdAt)}</p></div><div className="invoice-meta"><span>Nomor pesanan</span><strong>{order.orderNumber}</strong><span>Tanggal diperbarui</span><strong>{dateTime(order.updatedAt || order.createdAt)}</strong>{order.archivedAt && <><span>Tanggal arsip</span><strong>{dateTime(order.archivedAt)} · {order.archivedBy?.username || 'Admin'}</strong></>}</div></div>
        <div className="invoice-customer-grid"><div><span className="invoice-label">PEMESAN</span><strong>{order.user?.username || 'Akun Anda'}</strong>{isAdmin && <small>{order.user?.email || '-'}</small>}</div><div><span className="invoice-label">JUMLAH ITEM</span><strong>{number(order.totalQuantity)} unit</strong><small>{number(order.items?.length || 0)} jenis resource</small></div></div>
        <div className="invoice-section-title">Rincian resource</div>
        <div className="table-wrap invoice-table-wrap"><table className="invoice-table"><thead><tr><th>Resource</th><th>Kategori</th><th>Qty</th><th>Harga satuan</th><th>Subtotal</th></tr></thead><tbody>{order.items?.map((item) => <tr key={item.id}><td><strong>{item.resourceName}</strong></td><td>{categoryLabel(item.category)}</td><td>{number(item.quantity)} {item.unit}</td><td>{money(item.unitPrice)}</td><td className="strong-cell">{money(item.lineTotal)}</td></tr>)}</tbody></table></div>
        <div className="invoice-total-box"><div><span>Total kuantitas</span><strong>{number(order.totalQuantity)} unit</strong></div><div className="invoice-grand-total"><span>Total nominal</span><strong>{money(order.totalAmount)}</strong></div></div>
        <div className="invoice-note-grid"><section><span className="invoice-label">CATATAN PEMESAN</span><p>{order.notes?.trim() || 'Tidak ada catatan dari pemesan.'}</p></section>{(isAdmin || order.adminNotes) && <section><span className="invoice-label">CATATAN ADMIN</span><p>{order.adminNotes?.trim() || 'Belum ada catatan admin.'}</p></section>}</div>
        <section className="order-timeline"><div className="invoice-section-title"><History size={15}/> Riwayat status pesanan</div><div className="timeline-list">{history.map((event) => <div className="timeline-event" key={event.id}><span className="timeline-dot"/><div className="timeline-event-body"><div><strong>{event.fromStatus ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}` : statusLabel(event.toStatus)}</strong><time>{dateTime(event.createdAt)}</time></div><p>{event.note || 'Status pesanan diperbarui.'}</p><small>Oleh: {event.changedBy?.username || 'System'}</small></div></div>)}</div></section>
        <footer className="invoice-footer"><span>30sFams · Private Resource Supply</span><span>Dokumen dibuat dari sistem pemesanan 30sFams.</span></footer>
      </div>
      <div className="order-detail-footer no-print"><button className="button button-ghost" onClick={onClose}>Tutup</button><button className="button button-primary" onClick={onPrint}><Printer size={15}/> Cetak invoice / Simpan PDF</button></div>
    </section>
  </div>;
}

function exportOrdersForExcel(orders) {
  const headers = ['Nomor Pesanan', 'Tanggal', 'Status', 'Tanggal Arsip', 'Diarsipkan Oleh', 'Username', 'Email', 'Catatan Pemesan', 'Catatan Admin', 'Resource', 'Kategori', 'Jumlah', 'Satuan', 'Harga Satuan (USD)', 'Subtotal (USD)', 'Total Kuantitas Pesanan', 'Total Nominal Pesanan (USD)'];
  const rows = orders.flatMap((order) => (order.items || []).map((item) => [
    order.orderNumber, new Date(order.createdAt).toLocaleString('id-ID'), statusLabel(order.status),
    order.archivedAt ? new Date(order.archivedAt).toLocaleString('id-ID') : '', order.archivedBy?.username || '',
    order.user?.username || '', order.user?.email || '', order.notes || '', order.adminNotes || '', item.resourceName, categoryLabel(item.category),
    item.quantity, item.unit, item.unitPrice, item.lineTotal, order.totalQuantity, order.totalAmount,
  ]));
  const escape = (value) => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+@\-]/.test(text)) text = `'${text}`; // Mencegah CSV formula injection saat dibuka di Excel.
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `30sFams-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function Inventory({ resources, onCreate, onStock, onEdit, onToggle, onImage, onRemoveImage, busy }) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: '', sku: '', category: 'CLASS1', description: '', unit: 'unit', unitPrice: '0', initialStock: '0' });
  const [filter, setFilter] = useState('ALL');
  async function create(event) { event.preventDefault(); const ok = await onCreate({ ...draft, unitPrice: Number(draft.unitPrice), initialStock: Number(draft.initialStock) }); if (ok) { setDraft({ name: '', sku: '', category: 'CLASS1', description: '', unit: 'unit', unitPrice: '0', initialStock: '0' }); setShowCreate(false); } }
  const shown = filter === 'ALL' ? resources : resources.filter((resource) => resource.category === filter);
  return <>
    <SectionHeader eyebrow="INVENTORY CONTROL" title="Manajemen stok" description="Tambah resource, perbarui harga, dan catat setiap perubahan inventory." action={<button className="button button-primary" onClick={() => setShowCreate((v) => !v)}><PackagePlus size={16} /> Tambah resource</button>} />
    {showCreate && <form className="panel create-resource-form" onSubmit={create}><div className="panel-heading"><div><h3>Resource baru</h3><p>Item akan langsung masuk ke katalog setelah disimpan.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}><X size={17} /></button></div><div className="form-grid"><label>Nama resource<input required minLength={2} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Contoh: WEAPON_PISTOL" /></label><label>SKU / kode unik<input required value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} placeholder="WPN-001" /></label><label>Kategori<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option value={c} key={c}>{categoryLabel(c)}</option>)}</select></label><label>Satuan<input required value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="unit / pcs / pack" /></label><label>Harga per satuan (USD)<input required type="number" min="0" step="1" value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} /></label><label>Stok awal<input required type="number" min="0" step="1" value={draft.initialStock} onChange={(e) => setDraft({ ...draft, initialStock: e.target.value })} /></label><label className="span-two">Deskripsi<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Deskripsi singkat resource" /></label></div><div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Batal</button><button className="button button-primary" disabled={busy}>Simpan resource</button></div></form>}
    <div className="panel"><div className="panel-heading"><div><h3>Daftar inventory</h3><p>{number(resources.length)} item terdaftar</p></div><div className="filter-select compact"><SlidersHorizontal size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">Semua kategori</option>{CATEGORIES.map((c) => <option value={c} key={c}>{categoryLabel(c)}</option>)}</select><ChevronDown size={14} /></div></div>
      {shown.length ? <div className="table-wrap"><table><thead><tr><th>Resource</th><th>Kategori</th><th>Harga / unit</th><th>Stok tersedia</th><th>Dicadangkan</th><th>Total stok</th><th>Status</th><th>Kelola</th></tr></thead><tbody>{shown.map((resource) => <tr key={resource.id}><td><div className="resource-table-name"><div className="item-symbol resource-thumb">{resource.imageUrl ? <img src={assetUrl(resource.imageUrl)} alt={resource.name} /> : <Package size={17} />}</div><div><strong>{resource.name}</strong><small>{resource.sku}</small></div></div></td><td><span className="category-label">{categoryLabel(resource.category)}</span></td><td>{money(resource.unitPrice)}</td><td className="strong-cell">{number(resource.stockAvailable)}</td><td>{number(resource.stockReserved)}</td><td>{number(resource.stockTotal)}</td><td><span className={`stock-tag ${resource.isActive ? 'in-stock' : 'out-stock'}`}>{resource.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="table-actions"><label className={`action-button image-upload-control ${busy ? 'disabled' : ''}`} title={resource.imageUrl ? 'Ganti gambar' : 'Upload gambar'}><Upload size={15} /><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onImage(resource, file); event.target.value = ''; }} /></label>{resource.imageUrl && <button className="action-button reject" disabled={busy} onClick={() => onRemoveImage(resource)} title="Hapus gambar"><Trash2 size={14} /></button>}<button className="button button-small button-outline" disabled={busy} onClick={() => onStock(resource)}>Atur stok</button><button className="action-button" disabled={busy} onClick={() => onEdit(resource)} title="Ubah harga"><SlidersHorizontal size={15} /></button><button className="action-button" disabled={busy} onClick={() => onToggle(resource)} title={resource.isActive ? 'Nonaktifkan' : 'Aktifkan'}>{resource.isActive ? <X size={15} /> : <Check size={15} />}</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Kategori kosong" detail="Belum ada resource dalam kategori ini." />}
    </div>
  </>;
}

function Reports({ reports }) {
  if (!reports) return <div className="panel loading-panel">Memuat laporan...</div>;
  const summary = reports.summary;
  const categories = Object.entries(reports.categories || {});
  return <>
    <SectionHeader eyebrow="ANALYTICS & REPORTS" title="Laporan transaksi" description="Rekap kuantitas dan nominal berdasarkan pesanan yang telah selesai, disetujui, dan menunggu." action={<div className="date-chip"><FileText size={15} /> Ringkasan keseluruhan</div>} />
    <div className="stats-grid">
      <StatCard label="Nominal selesai" value={money(summary.completedAmount)} detail={`${number(summary.completedQuantity)} unit · Completed`} icon={CircleDollarSign} tone="green" />
      <StatCard label="Nilai dicadangkan" value={money(summary.reservedAmount)} detail={`${number(summary.reservedQuantity)} unit · Approved`} icon={Package} tone="blue" />
      <StatCard label="Nilai menunggu" value={money(summary.pendingAmount)} detail={`${number(summary.pendingQuantity)} unit · Pending`} icon={Clock3} tone="orange" />
      <StatCard label="Total pesanan" value={number(summary.totalOrders)} detail={`${number(summary.totalUsers)} user · ${number(summary.activeResources)} resource aktif`} icon={ClipboardList} tone="purple" />
    </div>
    <div className="dashboard-grid reports-grid"><div className="panel"><div className="panel-heading"><div><h3>Penjualan per kategori</h3><p>Hanya pesanan berstatus Completed</p></div></div>{categories.length ? <div className="table-wrap"><table><thead><tr><th>Kategori</th><th>Jumlah terjual</th><th>Nominal</th></tr></thead><tbody>{categories.map(([category, values]) => <tr key={category}><td className="strong-cell">{categoryLabel(category)}</td><td>{number(values.quantity)} unit</td><td>{money(values.amount)}</td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada penjualan selesai" detail="Laporan kategori akan terisi setelah pesanan selesai." />}</div>
      <div className="panel"><div className="panel-heading"><div><h3>Resource terlaris</h3><p>Berdasarkan kuantitas pesanan selesai</p></div></div>{reports.topResources?.length ? <div className="compact-list">{reports.topResources.map((item, i) => <div className="compact-row" key={item.resourceId}><div className="rank-number">{String(i + 1).padStart(2, '0')}</div><div className="compact-main"><strong>{item.name}</strong><span>{number(item.quantity)} unit terjual</span></div><div className="compact-side"><strong>{money(item.amount)}</strong></div></div>)}</div> : <EmptyState title="Belum ada data" detail="Resource terlaris akan muncul di sini." />}</div></div>
    <div className="panel status-report"><div className="panel-heading"><div><h3>Status pesanan</h3><p>Jumlah pesanan pada setiap tahap</p></div></div><div className="status-summary">{[['PENDING','Menunggu',summary.pendingOrders],['APPROVED','Disetujui',summary.approvedOrders],['COMPLETED','Selesai',summary.completedOrders],['REJECTED','Ditolak',summary.rejectedOrders],['CANCELLED','Dibatalkan',summary.cancelledOrders]].map(([key, label, value]) => <div key={key}><StatusPill status={key} /><strong>{number(value)}</strong><span>{label}</span></div>)}</div></div>
  </>;
}

function UsersPage({ users, onCreate, onToggle, onApprove, busy }) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ username: '', email: '', password: '' });
  async function submit(event) {
    event.preventDefault();
    const created = await onCreate(draft);
    if (created) { setDraft({ username: '', email: '', password: '' }); setShowCreate(false); }
  }
  const pendingCount = users.filter((user) => user.registrationStatus === 'PENDING').length;
  function statusText(user) {
    if (user.registrationStatus === 'PENDING') return 'Menunggu persetujuan';
    if (user.registrationStatus === 'REJECTED') return 'Ditolak';
    return user.isActive ? 'Aktif' : 'Dinonaktifkan';
  }
  function statusClass(user) {
    if (user.registrationStatus === 'PENDING') return 'out-stock';
    if (user.registrationStatus === 'REJECTED' || !user.isActive) return 'out-stock';
    return 'in-stock';
  }
  return <>
    <SectionHeader eyebrow="USER DIRECTORY" title="Pengguna 30sFams" description="Siapa pun dapat mendaftar. Akun baru hanya dapat masuk setelah disetujui admin." action={<button className="button button-primary" onClick={() => setShowCreate((value) => !value)}><UserPlus size={16} /> Buat akun manual</button>} />
    {pendingCount > 0 && <div className="notice warning"><Clock3 size={17}/><span>{number(pendingCount)} pendaftaran menunggu persetujuan admin.</span></div>}
    {showCreate && <form className="panel create-resource-form" onSubmit={submit}>
      <div className="panel-heading"><div><h3>Buat akun anggota</h3><p>Role otomatis USER dan langsung aktif. Sampaikan password awal secara pribadi.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}><X size={17} /></button></div>
      <div className="form-grid user-create-grid">
        <label>Username<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="contoh: member30s" /></label>
        <label>Email<input required type="email" maxLength={150} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="nama@email.com" /></label>
        <label>Password awal<input required type="password" minLength={12} maxLength={100} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Minimal 12 karakter" autoComplete="new-password" /></label>
      </div>
      <div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Batal</button><button className="button button-primary" disabled={busy}><UserPlus size={15}/> Buat akun</button></div>
    </form>}
    <div className="panel"><div className="panel-heading"><div><h3>Daftar anggota</h3><p>{number(users.filter((user) => user.role === 'USER').length)} akun user · {number(pendingCount)} menunggu persetujuan</p></div></div>
      {users.length ? <div className="table-wrap"><table><thead><tr><th>Pengguna</th><th>Email</th><th>Status</th><th>Bergabung</th><th>Total pesanan</th><th>Aksi</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}>
        <td><div className="user-cell"><div className="avatar-mini">{user.username.slice(0, 1).toUpperCase()}</div><strong>{user.username}</strong><small className="cell-sub">{user.role}</small></div></td><td>{user.email}</td>
        <td><span className={`stock-tag ${statusClass(user)}`}>{statusText(user)}</span></td><td>{dateTime(user.createdAt)}</td><td>{number(user._count.orders)}</td>
        <td>{user.role !== 'USER' ? <span className="muted">Protected</span> : user.registrationStatus === 'PENDING' ? <div className="table-actions"><button className="button button-small button-primary" disabled={busy} onClick={() => onApprove(user, 'APPROVED')}><Check size={13}/> Setujui</button><button className="button button-small button-ghost-danger" disabled={busy} onClick={() => onApprove(user, 'REJECTED')}><X size={13}/> Tolak</button></div> : user.registrationStatus === 'REJECTED' ? <button className="button button-small button-outline" disabled={busy} onClick={() => onApprove(user, 'APPROVED')}><UserPlus size={13}/> Setujui ulang</button> : <button className={`button button-small ${user.isActive ? 'button-ghost-danger' : 'button-outline'}`} disabled={busy} onClick={() => onToggle(user)}>{user.isActive ? <><UserX size={13}/> Nonaktifkan</> : <><UserPlus size={13}/> Aktifkan</>}</button>}</td>
      </tr>)}</tbody></table></div> : <EmptyState icon={Users} title="Belum ada user" detail="Anggota dapat mendaftarkan akun melalui halaman login." />}
    </div>
  </>;
}

function jakartaDateInput(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
function todayJakartaInput() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function cashEntryLabel(entry) {
  if (entry.type === 'ADJUSTMENT_IN') return entry.category === 'Koreksi saldo' ? 'Koreksi saldo (+)' : 'Penambahan saldo manual';
  if (entry.type === 'ADJUSTMENT_OUT') return 'Koreksi saldo (-)';
  return ({ OPENING_BALANCE: 'Saldo awal', ORDER_INCOME: 'Pembelian resource', EXPENSE: 'Pengeluaran gang' })[entry.type] || entry.type;
}

function FinancePage({ finance, cash, onStartPeriod, onUpdatePeriod, onResetPeriod, onSetOpeningBalance, onAddExpense, onAddCashIncome, onAdjustCash, busy }) {
  const currentPeriod = finance?.currentPeriod;
  const [periodDraft, setPeriodDraft] = useState({ name: 'Periode pembelanjaan', startDate: todayJakartaInput(), endDate: '' });
  const [openingDraft, setOpeningDraft] = useState('');
  const [expenseDraft, setExpenseDraft] = useState({ amount: '', category: 'Operasional', description: '' });
  const [incomeDraft, setIncomeDraft] = useState({ amount: '', category: 'Pemasukan manual', description: '' });
  const [adjustmentDraft, setAdjustmentDraft] = useState({ direction: 'OUT', amount: '', description: '' });
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  useEffect(() => {
    if (currentPeriod) setPeriodDraft({
      name: currentPeriod.name,
      startDate: jakartaDateInput(currentPeriod.startAt),
      endDate: currentPeriod.endAt ? jakartaDateInput(currentPeriod.endAt) : '',
    });
  }, [currentPeriod?.id, currentPeriod?.name, currentPeriod?.startAt, currentPeriod?.endAt]);

  async function savePeriod(event) {
    event.preventDefault();
    const payload = { ...periodDraft, endDate: periodDraft.endDate || null };
    if (currentPeriod) await onUpdatePeriod(payload); else await onStartPeriod(payload);
  }
  async function resetPeriod() {
    const typed = window.prompt('Periode aktif akan disimpan ke riwayat dan periode baru dimulai. Total sepanjang masa tidak dihapus. Ketik RESET PERIOD 30SFAMS untuk melanjutkan:');
    if (typed !== 'RESET PERIOD 30SFAMS') return;
    await onResetPeriod({ confirmation: typed, name: periodDraft.name || 'Periode baru' });
  }
  async function submitOpening(event) {
    event.preventDefault();
    const saved = await onSetOpeningBalance({ amount: Number(openingDraft), description: 'Penetapan saldo awal kas gang 30sFams' });
    if (saved) setOpeningDraft('');
  }
  async function submitExpense(event) {
    event.preventDefault();
    const saved = await onAddExpense({ ...expenseDraft, amount: Number(expenseDraft.amount) });
    if (saved) setExpenseDraft({ amount: '', category: 'Operasional', description: '' });
  }
  async function submitIncome(event) {
    event.preventDefault();
    const saved = await onAddCashIncome({ ...incomeDraft, amount: Number(incomeDraft.amount) });
    if (saved) setIncomeDraft({ amount: '', category: 'Pemasukan manual', description: '' });
  }
  async function submitAdjustment(event) {
    event.preventDefault();
    const saved = await onAdjustCash({ ...adjustmentDraft, amount: Number(adjustmentDraft.amount) });
    if (saved) setAdjustmentDraft({ direction: 'OUT', amount: '', description: '' });
  }

  if (!finance || !cash) return <div className="panel loading-panel">Memuat data keuangan...</div>;
  const lifetime = finance.lifetime || {};
  const currentSummary = currentPeriod?.summary || {};
  const cashSummary = cash.summary || {};
  const periods = finance.periods || [];
  const cashEntries = cash.entries || [];
  const visibleCashEntries = cashEntries.filter((entry) => ledgerFilter === 'ALL' || (ledgerFilter === 'IN' ? ['OPENING_BALANCE','ORDER_INCOME','ADJUSTMENT_IN'].includes(entry.type) : ['EXPENSE','ADJUSTMENT_OUT'].includes(entry.type)));

  return <>
    <SectionHeader eyebrow="FINANCE & GANG FUND" title="Keuangan & kas gang" description="Halaman ini khusus admin. Pembelanjaan dihitung dari pesanan Completed; saldo kas dihitung dari buku kas masuk dan keluar." action={<div className="date-chip"><ShieldCheck size={15}/> Admin only</div>} />
    <div className="stats-grid finance-stats-grid">
      <StatCard label="Total pembelanjaan sepanjang masa" value={money(lifetime.totalAmount)} detail={`${number(lifetime.completedOrders)} pesanan selesai · ${number(lifetime.totalQuantity)} unit`} icon={ChartNoAxesCombined} tone="purple" />
      <StatCard label="Pembelanjaan periode aktif" value={money(currentSummary.totalAmount)} detail={`${number(currentSummary.completedOrders)} pesanan selesai`} icon={CalendarDays} tone="blue" />
      <StatCard label="Saldo kas gang" value={money(cashSummary.balance)} detail="Saldo berjalan berdasarkan buku kas" icon={Wallet} tone="green" />
      <StatCard label="Total pengeluaran gang" value={money(cashSummary.expenses)} detail="Pengeluaran yang dicatat admin" icon={ArrowDownToLine} tone="orange" />
    </div>

    <div className="finance-grid">
      <section className="panel finance-panel">
        <div className="panel-heading"><div><h3>Periode pembelanjaan</h3><p>Atur tanggal mulai dan akhir. Reset membuat periode baru tanpa menghapus total sepanjang masa.</p></div><CalendarDays size={19}/></div>
        <form className="finance-form" onSubmit={savePeriod}>
          <div className="form-grid finance-period-grid">
            <label>Nama periode<input required minLength={3} maxLength={80} value={periodDraft.name} onChange={(event) => setPeriodDraft({ ...periodDraft, name: event.target.value })} placeholder="Contoh: November 2026" /></label>
            <label>Tanggal mulai<input required type="date" value={periodDraft.startDate} onChange={(event) => setPeriodDraft({ ...periodDraft, startDate: event.target.value })} /></label>
            <label>Tanggal akhir <small>(kosong = tanpa batas akhir)</small><input type="date" value={periodDraft.endDate} min={periodDraft.startDate} onChange={(event) => setPeriodDraft({ ...periodDraft, endDate: event.target.value })} /></label>
          </div>
          <div className="finance-actions"><button className="button button-primary" disabled={busy}><Check size={15}/>{currentPeriod ? 'Simpan rentang periode' : 'Buat periode pertama'}</button>{currentPeriod && <button type="button" className="button button-ghost-danger" disabled={busy} onClick={resetPeriod}><RotateCcw size={15}/> Reset ke periode baru</button>}</div>
        </form>
        <div className="finance-period-summary">
          <div><span>Periode sekarang</span><strong>{currentPeriod ? currentPeriod.name : 'Belum diatur'}</strong></div>
          <div><span>Total periode</span><strong>{money(currentSummary.totalAmount)}</strong></div>
          <div><span>Jumlah resource</span><strong>{number(currentSummary.totalQuantity || 0)} unit</strong></div>
        </div>
        <div className="panel-subheading"><h4>Riwayat periode</h4><small>Reset hanya mengakhiri periode, transaksi lama tetap tersimpan.</small></div>
        {periods.length ? <div className="table-wrap"><table><thead><tr><th>Periode</th><th>Rentang</th><th>Pesanan</th><th>Total</th><th>Status</th></tr></thead><tbody>{periods.map((period) => <tr key={period.id}><td className="strong-cell">{period.name}</td><td>{dateTime(period.startAt)} – {period.endAt ? dateTime(period.endAt) : 'Berjalan'}</td><td>{number(period.summary?.completedOrders || 0)}</td><td>{money(period.summary?.totalAmount || 0)}</td><td><span className={`stock-tag ${period.isCurrent ? 'in-stock' : 'out-stock'}`}>{period.isCurrent ? 'Aktif' : 'Arsip'}</span></td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="Belum ada periode" detail="Atur rentang tanggal di atas untuk mulai menghitung pembelanjaan periode." />}
      </section>

      <section className="panel finance-panel">
        <div className="panel-heading"><div><h3>Kas gang 30sFams</h3><p>Hanya admin yang dapat melihat dan mencatat buku kas ini.</p></div><Wallet size={19}/></div>
        <div className="cash-balance-card"><span>SALDO KAS SAAT INI</span><strong>{money(cashSummary.balance)}</strong><div><span>Pemasukan pesanan</span><b>{money(cashSummary.orderIncome)}</b></div><div><span>Pemasukan tambahan & koreksi masuk</span><b>{money(cashSummary.adjustmentIncome)}</b></div><div><span>Pengeluaran gang</span><b>{money(cashSummary.expenses)}</b></div><div><span>Koreksi saldo keluar</span><b>{money(cashSummary.adjustmentExpense)}</b></div></div>
        {!cash.initialized ? <form className="finance-form cash-form" onSubmit={submitOpening}>
          <div className="panel-subheading"><h4>Atur saldo awal kas</h4><small>Masukkan saldo kas riil saat fitur ini mulai digunakan. Setelah tersimpan, saldo tetap bisa ditambah atau dikoreksi melalui transaksi baru.</small></div>
          <label>Saldo awal (USD)<input required type="number" min="0" step="0.01" value={openingDraft} onChange={(event) => setOpeningDraft(event.target.value)} placeholder="Contoh: 250.00" /></label>
          <button className="button button-primary" disabled={busy || openingDraft === ''}><Wallet size={15}/> Simpan saldo awal</button>
        </form> : <div className="cash-management-forms">
          <form className="finance-form cash-form" onSubmit={submitIncome}>
            <div className="panel-subheading"><h4>Tambah saldo kas</h4><small>Catat setoran atau pemasukan lain di luar pembelian resource.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Nominal (USD)<input required type="number" min="0.01" step="0.01" value={incomeDraft.amount} onChange={(event) => setIncomeDraft({ ...incomeDraft, amount: event.target.value })} placeholder="Contoh: 100.00" /></label>
              <label>Kategori<select value={incomeDraft.category} onChange={(event) => setIncomeDraft({ ...incomeDraft, category: event.target.value })}><option>Pemasukan manual</option><option>Setoran anggota</option><option>Donasi</option><option>Pemasukan lain</option></select></label>
              <label className="span-two">Keterangan<input required minLength={3} maxLength={300} value={incomeDraft.description} onChange={(event) => setIncomeDraft({ ...incomeDraft, description: event.target.value })} placeholder="Contoh: setoran tambahan kas gang" /></label>
            </div>
            <button className="button button-primary" disabled={busy || !incomeDraft.amount || !incomeDraft.description.trim()}><ArrowUpRight size={15}/> Simpan penambahan saldo</button>
          </form>
          <form className="finance-form cash-form" onSubmit={submitExpense}>
            <div className="panel-subheading"><h4>Pengeluaran gang</h4><small>Pengeluaran dicatat sebagai transaksi baru dan tidak dapat dihapus.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Nominal (USD)<input required type="number" min="0.01" step="0.01" value={expenseDraft.amount} onChange={(event) => setExpenseDraft({ ...expenseDraft, amount: event.target.value })} placeholder="Contoh: 25.00" /></label>
              <label>Kategori<select value={expenseDraft.category} onChange={(event) => setExpenseDraft({ ...expenseDraft, category: event.target.value })}><option>Operasional</option><option>Event</option><option>Perlengkapan</option><option>Transportasi</option><option>Lainnya</option></select></label>
              <label className="span-two">Keterangan<input required minLength={3} maxLength={300} value={expenseDraft.description} onChange={(event) => setExpenseDraft({ ...expenseDraft, description: event.target.value })} placeholder="Contoh: biaya operasional kegiatan" /></label>
            </div>
            <button className="button button-primary" disabled={busy || !expenseDraft.amount || !expenseDraft.description.trim()}><ArrowDownToLine size={15}/> Simpan pengeluaran</button>
          </form>
          <form className="finance-form cash-form cash-adjustment-form" onSubmit={submitAdjustment}>
            <div className="panel-subheading"><h4>Koreksi saldo kas</h4><small>Gunakan untuk menyamakan saldo sistem dengan uang kas riil. Koreksi tidak menimpa transaksi sebelumnya.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Arah koreksi<select value={adjustmentDraft.direction} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, direction: event.target.value })}><option value="OUT">Kurangi saldo</option><option value="IN">Tambah saldo</option></select></label>
              <label>Nominal (USD)<input required type="number" min="0.01" step="0.01" value={adjustmentDraft.amount} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, amount: event.target.value })} placeholder="Contoh: 15.00" /></label>
              <label className="span-two">Alasan koreksi<input required minLength={3} maxLength={300} value={adjustmentDraft.description} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, description: event.target.value })} placeholder="Contoh: penyesuaian setelah audit kas" /></label>
            </div>
            <button className="button button-outline" disabled={busy || !adjustmentDraft.amount || !adjustmentDraft.description.trim()}><SlidersHorizontal size={15}/> Simpan koreksi saldo</button>
          </form>
        </div>}
        <div className="panel-subheading cash-history-heading"><div><h4>Riwayat pemasukan dan pengeluaran</h4><small>Pemasukan pembelian otomatis saat order ditandai Completed.</small></div><div className="header-actions"><div className="filter-select compact"><select value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value)}><option value="ALL">Semua</option><option value="IN">Pemasukan</option><option value="OUT">Pengeluaran</option></select><ChevronDown size={14}/></div><button type="button" className="button button-outline button-small" onClick={() => exportCashEntries(visibleCashEntries)} disabled={!visibleCashEntries.length}><ArrowDownToLine size={14}/> Export CSV</button></div></div>
        {visibleCashEntries.length ? <div className="cash-ledger-list">{visibleCashEntries.slice(0, 300).map((entry) => {
          const positive = ['OPENING_BALANCE', 'ORDER_INCOME', 'ADJUSTMENT_IN'].includes(entry.type);
          return <div className="cash-ledger-row" key={entry.id}><div className={`cash-ledger-icon ${positive ? 'income' : 'expense'}`}>{positive ? <ArrowUpRight size={16}/> : <ArrowDownToLine size={16}/>}</div><div className="cash-ledger-main"><strong>{cashEntryLabel(entry)}</strong><span>{entry.description}</span><small>{entry.category}{entry.order?.orderNumber ? ` · ${entry.order.orderNumber} · ${entry.order.user?.username || ''}` : ''}</small><small>{dateTime(entry.createdAt)} · {entry.createdBy?.username || 'System'}</small></div><strong className={positive ? 'cash-positive' : 'cash-negative'}>{positive ? '+' : '−'}{money(entry.amount)}</strong></div>;
        })}</div> : <EmptyState icon={Wallet} title="Tidak ada catatan" detail={ledgerFilter === 'ALL' ? 'Tetapkan saldo awal untuk mulai mencatat pemasukan dan pengeluaran gang.' : 'Tidak ada transaksi pada filter ini.'} />}
      </section>
    </div>
    <div className="finance-footnote"><ShieldCheck size={15}/><span>{cash.note} Total pembelanjaan sepanjang masa dihitung dari semua pesanan selesai dan tidak pernah dihapus saat periode di-reset.</span></div>
  </>;
}

function FavoritesPage({ resources, favoriteIds, onToggleFavorite, cart, setCart, busy }) {
  const favorites = resources.filter((resource) => favoriteIds.includes(resource.id));
  function addToCart(resource) {
    setCart((current) => ({ ...current, [resource.id]: Math.min((current[resource.id] || 0) + 1, resource.stockAvailable) }));
  }
  return <>
    <SectionHeader eyebrow="SAVED RESOURCES" title="Resource favorit" description="Simpan item yang sering dipesan agar lebih cepat ditemukan kembali." />
    {favorites.length ? <div className="resource-grid">{favorites.map((resource) => <article className="resource-card" key={resource.id}>
      <div className={`resource-art ${resource.category.toLowerCase()} ${resource.imageUrl ? 'with-photo' : ''}`}>
        {resource.imageUrl && <img className="resource-art-photo" src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" />}
        <div className="resource-art-grid"/><span>{categoryLabel(resource.category)}</span>{!resource.imageUrl && <div className="resource-art-icon"><Package size={30}/></div>}<small>{resource.sku}</small>
      </div>
      <div className="resource-card-body"><div className="resource-name-row"><h3>{resource.name}</h3><button type="button" className="favorite-toggle active" onClick={() => onToggleFavorite(resource)} title="Hapus favorit"><Star size={16} fill="currentColor"/></button></div>
        <p>{resource.description || 'Tidak ada deskripsi.'}</p><div className="resource-meta"><span>Harga / {resource.unit}</span><strong>{money(resource.unitPrice)}</strong></div><div className="resource-meta"><span>Stok tersedia</span><strong>{number(resource.stockAvailable)} {resource.unit}</strong></div>
        <button className="button button-primary button-full" disabled={busy || resource.stockAvailable <= 0 || (cart[resource.id] || 0) >= resource.stockAvailable} onClick={() => addToCart(resource)}><ShoppingCart size={15}/> Tambah ke keranjang</button>
      </div>
    </article>)}</div> : <div className="panel"><EmptyState icon={Star} title="Belum ada resource favorit" detail="Buka katalog lalu tekan ikon bintang pada resource yang ingin kamu simpan."/></div>}
  </>;
}

function downloadCsv(filename, headers, rows) {
  const safe = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('\"', '\"\"')}"`;
  };
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(safe).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function StockMovementPage({ movements }) {
  const [type, setType] = useState('ALL');
  const filtered = movements.filter((movement) => type === 'ALL' || movement.type === type);
  const labels = { RESTOCK: 'Stok masuk', ADJUSTMENT: 'Koreksi stok', RESERVED: 'Dicadangkan', RELEASED: 'Reservasi dikembalikan', COMPLETED: 'Diserahkan' };
  function exportMovements() {
    const rows = filtered.map((m) => [dateTime(m.createdAt), m.resource?.name, m.resource?.sku, labels[m.type] || m.type, m.quantity, m.resource?.unit, m.order?.orderNumber, m.user?.username || 'System', m.note]);
    downloadCsv(`30sFams-stock-movements-${new Date().toISOString().slice(0,10)}.csv`, ['Waktu', 'Resource', 'SKU', 'Aktivitas', 'Jumlah', 'Satuan', 'Nomor Pesanan', 'Pelaksana', 'Catatan'], rows);
  }
  return <>
    <SectionHeader eyebrow="INVENTORY AUDIT TRAIL" title="Riwayat keluar masuk stok" description="Semua restock, koreksi, reservasi, pengembalian reservasi, dan penyerahan resource tercatat di sini." action={<div className="header-actions"><div className="filter-select compact"><SlidersHorizontal size={15}/><select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">Semua aktivitas</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={14}/></div><button className="button button-outline button-small" onClick={exportMovements} disabled={!filtered.length}><ArrowDownToLine size={14}/> Export CSV</button></div>} />
    <div className="panel"><div className="panel-heading"><div><h3>Ledger stok</h3><p>{number(filtered.length)} catatan terbaru · maksimum 200 catatan</p></div><History size={19}/></div>
      {filtered.length ? <div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Resource</th><th>Aktivitas</th><th>Jumlah</th><th>Nomor pesanan</th><th>Pelaksana</th><th>Catatan</th></tr></thead><tbody>{filtered.map((movement) => <tr key={movement.id}><td>{dateTime(movement.createdAt)}</td><td><strong>{movement.resource?.name || 'Resource'}</strong><small className="cell-sub">{movement.resource?.sku || ''}</small></td><td><span className={`stock-tag ${['RESTOCK','RELEASED'].includes(movement.type) ? 'in-stock' : movement.type === 'ADJUSTMENT' ? 'out-stock' : 'reserved'}`}>{labels[movement.type] || movement.type}</span></td><td className="strong-cell">{number(movement.quantity)} {movement.resource?.unit || 'unit'}</td><td>{movement.order?.orderNumber || '—'}</td><td>{movement.user?.username || 'System'}</td><td>{movement.note || '—'}</td></tr>)}</tbody></table></div> : <EmptyState icon={History} title="Belum ada catatan stok" detail="Aktivitas inventory akan tercatat saat stok dibuat, disesuaikan, dicadangkan, dikembalikan, atau diserahkan."/>}
    </div>
  </>;
}

function MemberStatsPage({ data }) {
  if (!data) return <div className="panel loading-panel">Memuat statistik anggota...</div>;
  const summary = data.summary || {};
  const members = data.members || [];
  function exportMembers() {
    const rows = members.map((m) => [m.username, m.email, m.isActive ? 'Aktif' : 'Nonaktif', m.registrationStatus, m.completedOrders, m.completedQuantity, m.totalSpend, m.pendingOrders, m.approvedOrders, m.lastCompletedAt ? dateTime(m.lastCompletedAt) : '']);
    downloadCsv(`30sFams-member-statistics-${new Date().toISOString().slice(0,10)}.csv`, ['Username', 'Email', 'Status Akun', 'Status Pendaftaran', 'Pesanan Selesai', 'Total Kuantitas', 'Total Pembelanjaan USD', 'Pending', 'Approved', 'Pembelian Terakhir'], rows);
  }
  return <>
    <SectionHeader eyebrow="MEMBER INSIGHTS" title="Statistik anggota" description="Pantau aktivitas pemesanan setiap anggota berdasarkan pesanan yang sudah Completed." action={<div className="header-actions"><div className="date-chip"><ShieldCheck size={15}/> Admin only</div><button className="button button-outline button-small" onClick={exportMembers} disabled={!members.length}><ArrowDownToLine size={14}/> Export CSV</button></div>} />
    <div className="stats-grid"><StatCard label="Total anggota" value={number(summary.totalMembers)} detail={`${number(summary.activeMembers)} akun aktif`} icon={Users} tone="blue"/><StatCard label="Menunggu aktivasi" value={number(summary.pendingRegistrations)} detail="Pendaftaran baru" icon={Clock3} tone="orange"/><StatCard label="Pesanan selesai" value={number(summary.completedOrders)} detail={`${number(summary.completedQuantity)} unit`} icon={Package} tone="green"/><StatCard label="Total pembelanjaan" value={money(summary.completedAmount)} detail="Akumulasi seluruh anggota" icon={CircleDollarSign} tone="purple"/></div>
    <div className="panel"><div className="panel-heading"><div><h3>Aktivitas pembelian anggota</h3><p>Diurutkan berdasarkan total pembelanjaan selesai tertinggi.</p></div><Users size={19}/></div>
      {members.length ? <div className="table-wrap"><table><thead><tr><th>Anggota</th><th>Status akun</th><th>Pesanan selesai</th><th>Total kuantitas</th><th>Total pembelanjaan</th><th>Order aktif</th><th>Pembelian terakhir</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.username}</strong><small className="cell-sub">{member.email}</small></td><td><span className={`stock-tag ${member.isActive && member.registrationStatus === 'APPROVED' ? 'in-stock' : 'out-stock'}`}>{member.registrationStatus === 'PENDING' ? 'Menunggu' : member.registrationStatus === 'REJECTED' ? 'Ditolak' : member.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td>{number(member.completedOrders)}</td><td>{number(member.completedQuantity)} unit</td><td className="strong-cell">{money(member.totalSpend)}</td><td>{number(member.pendingOrders)} Pending · {number(member.approvedOrders)} Approved</td><td>{member.lastCompletedAt ? dateTime(member.lastCompletedAt) : 'Belum ada'}</td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title="Belum ada anggota" detail="Anggota yang mendaftar akan muncul di sini."/>}
    </div>
  </>;
}

function exportCashEntries(entries) {
  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Nominal USD', 'Username Admin', 'Nomor Pesanan'];
  const typeLabel = { OPENING_BALANCE: 'Saldo awal', ORDER_INCOME: 'Pemasukan pesanan', ADJUSTMENT_IN: 'Pemasukan/koreksi masuk', EXPENSE: 'Pengeluaran', ADJUSTMENT_OUT: 'Koreksi keluar' };
  const rows = entries.map((entry) => [new Date(entry.createdAt).toLocaleString('id-ID'), typeLabel[entry.type] || entry.type, entry.category, entry.description, entry.amount, entry.createdBy?.username || 'System', entry.order?.orderNumber || '']);
  const safe = (value) => { let text = String(value ?? ''); if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(safe).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = `30sFams-cash-ledger-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function ActivityPage({ logs, discordStatus, onTestDiscord, busy }) {
  return <>
    <SectionHeader eyebrow="AUDIT TRAIL & INTEGRATIONS" title="Aktivitas admin" description="Jejak perubahan resource, stok, status pesanan, dan pengujian integrasi." action={<button className="button button-outline" disabled={busy || !discordStatus?.configured} onClick={onTestDiscord}><Bell size={15}/> Tes Discord</button>} />
    <div className="panel integration-status-panel"><div className="panel-heading"><div><h3>Integrasi Discord</h3><p>URL webhook hanya disimpan di backend/.env dan tidak ditampilkan di browser.</p></div><div className={`stock-tag ${discordStatus?.configured ? 'in-stock' : 'out-stock'}`}>{discordStatus?.configured ? 'Webhook terkonfigurasi' : 'Belum dikonfigurasi'}</div></div><p className="muted-copy">{discordStatus?.message || 'Memeriksa konfigurasi Discord...'}</p><small>Untuk mengaktifkan, isi DISCORD_WEBHOOK_URL di backend/.env, lalu restart backend. Gunakan channel Discord privat yang hanya dapat diakses petinggi/admin.</small></div>
    <div className="panel">{logs.length ? <div className="activity-list">{logs.map((log) => <div className="activity-row" key={log.id}><div className="activity-icon"><Activity size={17} /></div><div className="activity-content"><strong>{log.detail}</strong><span>{log.user?.username || 'System'} · {log.action}</span></div><time>{dateTime(log.createdAt)}</time></div>)}</div> : <EmptyState icon={Activity} title="Belum ada aktivitas" detail="Aktivitas admin akan tercatat di sini." />}</div>
  </>;
}

const adminNav = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { key: 'inventory', label: 'Manajemen stok', icon: Boxes, group: 'WORKSPACE' },
  { key: 'stock-history', label: 'Riwayat stok', icon: History, group: 'WORKSPACE' },
  { key: 'admin-orders', label: 'Semua pesanan', icon: ClipboardList, group: 'WORKSPACE' },
  { key: 'archived-orders', label: 'Arsip pesanan', icon: Archive, group: 'WORKSPACE' },
  { key: 'reports', label: 'Laporan transaksi', icon: ChartNoAxesCombined, group: 'INSIGHTS' },
  { key: 'finance', label: 'Keuangan & kas gang', icon: Wallet, group: 'INSIGHTS' },
  { key: 'users', label: 'Pengguna', icon: Users, group: 'INSIGHTS' },
  { key: 'member-stats', label: 'Statistik anggota', icon: ChartNoAxesCombined, group: 'INSIGHTS' },
  { key: 'activity', label: 'Aktivitas admin', icon: Activity, group: 'INSIGHTS' },
];
const userNav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'MENU UTAMA' },
  { key: 'catalog', label: 'Katalog resource', icon: Boxes, group: 'MENU UTAMA' },
  { key: 'favorites', label: 'Resource favorit', icon: Star, group: 'MENU UTAMA' },
  { key: 'my-orders', label: 'Pesanan saya', icon: ClipboardList, group: 'MENU UTAMA' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [pageLoading, setPageLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [resources, setResources] = useState([]);
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [reports, setReports] = useState(null);
  const [finance, setFinance] = useState(null);
  const [cash, setCash] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [memberStats, setMemberStats] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [discordStatus, setDiscordStatus] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const pageCacheRef = useRef({});
  const pageRequestsRef = useRef({});
  const loadedPagesRef = useRef(new Set());
  const activePageKeyRef = useRef('');
  const currentPageKey = user ? `${user.role}:${user.id}:${page}` : '';
  activePageKeyRef.current = currentPageKey;
  const [loadedPages, setLoadedPages] = useState({});

  const loadPageData = useCallback(async (targetPage, role = user?.role, force = false) => {
    if (!role) return;
    const cacheKey = `${role}:${user?.id || 'unknown'}:${targetPage}`;
    const cachedAt = pageCacheRef.current[cacheKey];
    if (!force && cachedAt && Date.now() - cachedAt < 90000) return;
    if (pageRequestsRef.current[cacheKey]) return pageRequestsRef.current[cacheKey];

    if (!loadedPagesRef.current.has(cacheKey)) setPageLoading(true);
    const task = (async () => {
      try {
      if (role === 'ADMIN') {
        switch (targetPage) {
          case 'dashboard': {
            const data = await api('/admin/dashboard');
            setDashboardData(data);
            setOrders(data.recentOrders || []);
            break;
          }
          case 'inventory': {
            const data = await api('/resources?all=true');
            setResources(data.resources || []);
            break;
          }
          case 'admin-orders': {
            const data = await api('/admin/orders');
            setOrders(data.orders || []);
            break;
          }
          case 'archived-orders': {
            const data = await api('/admin/orders?view=archive');
            setArchivedOrders(data.orders || []);
            break;
          }
          case 'reports':
            setReports(await api('/admin/reports'));
            break;
          case 'users': {
            const data = await api('/admin/users');
            setUsers(data.users || []);
            break;
          }
          case 'activity': {
            const [activity, discord] = await Promise.all([api('/admin/activity'), api('/admin/integrations/discord')]);
            setLogs(activity.logs || []);
            setDiscordStatus(discord);
            break;
          }
          case 'finance': {
            const [spending, cashData] = await Promise.all([api('/admin/finance/spending'), api('/admin/finance/cash')]);
            setFinance(spending);
            setCash(cashData);
            break;
          }
          case 'member-stats':
            setMemberStats(await api('/admin/member-stats'));
            break;
          case 'stock-history': {
            const data = await api('/admin/stock-movements?limit=200');
            setStockMovements(data.movements || []);
            break;
          }
          default:
            break;
        }
      } else {
        switch (targetPage) {
          case 'dashboard': {
            const [resourceData, orderData] = await Promise.all([api('/resources'), api('/orders/mine')]);
            setResources(resourceData.resources || []);
            setOrders(orderData.orders || []);
            break;
          }
          case 'catalog':
          case 'favorites': {
            const [resourceData, favoriteData] = await Promise.all([api('/resources'), api('/favorites')]);
            setResources(resourceData.resources || []);
            setFavoriteIds((favoriteData.favorites || []).map((item) => item.resourceId));
            break;
          }
          case 'my-orders': {
            const data = await api('/orders/mine');
            setOrders(data.orders || []);
            break;
          }
          default:
            break;
        }
      }
      } finally {
        // The outer request handler clears the in-flight marker and loading state.
      }
    })();
    pageRequestsRef.current[cacheKey] = task;
    try {
      await task;
      pageCacheRef.current[cacheKey] = Date.now();
      loadedPagesRef.current.add(cacheKey);
      setLoadedPages((current) => current[cacheKey] ? current : { ...current, [cacheKey]: true });
    } finally {
      if (pageRequestsRef.current[cacheKey] === task) delete pageRequestsRef.current[cacheKey];
      if (activePageKeyRef.current === cacheKey) setPageLoading(false);
    }
  }, [user?.id, user?.role]);

  const refresh = useCallback(async (role = user?.role) => {
    const cachePrefix = `${role || user?.role}:${user?.id || 'unknown'}:`;
    for (const key of Object.keys(pageCacheRef.current)) {
      if (key.startsWith(cachePrefix)) delete pageCacheRef.current[key];
    }
    await loadPageData(page, role, true);
  }, [loadPageData, page, user?.id, user?.role]);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    const result = await api('/notifications');
    setNotifications(result.notifications || []);
    setUnreadCount(result.unreadCount || 0);
  }, [user?.id]);

  useEffect(() => {
    api('/auth/me').then((result) => { setUser(result.user); }).catch(() => setUser(null)).finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPageData(page, user.role).catch((error) => setNotice({ type: 'error', message: error.message }));
  }, [user?.id, user?.role, page, loadPageData]);

  useEffect(() => {
    if (!user) return undefined;
    refreshNotifications().catch(() => {});
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshNotifications().catch(() => {});
    }, 120000);
    return () => window.clearInterval(timer);
  }, [user, refreshNotifications]);

  const navItems = isAdmin ? adminNav : userNav;
  const pageTitle = useMemo(() => navItems.find((item) => item.key === page)?.label || 'Dashboard', [navItems, page]);
  const setNoticeSafe = (value) => { setNotice(value); if (value) window.setTimeout(() => setNotice(null), 5500); };

  async function signOut() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* local state is still cleared */ }
    pageCacheRef.current = {}; pageRequestsRef.current = {}; loadedPagesRef.current.clear(); setLoadedPages({});
    setUser(null); setResources([]); setOrders([]); setArchivedOrders([]); setNotifications([]); setUnreadCount(0); setFavoriteIds([]); setDiscordStatus(null); setCart({}); setPage('dashboard');
  }

  async function createUser(data) {
    setBusy(true);
    try {
      const result = await api('/admin/users', { method: 'POST', body: JSON.stringify(data) });
      await Promise.all([refresh(), refreshNotifications()]);
      setNoticeSafe({ type: 'success', message: result.message });
      return true;
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); return false; }
    finally { setBusy(false); }
  }

  async function changePassword(data) {
    setBusy(true);
    try {
      const result = await api('/auth/change-password', { method: 'POST', body: JSON.stringify(data) });
      setNoticeSafe({ type: 'success', message: result.message });
      return true;
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); return false; }
    finally { setBusy(false); }
  }

  async function toggleUser(userRecord) {
    const nextActive = !userRecord.isActive;
    if (!window.confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} akun ${userRecord.username}? ${nextActive ? 'User dapat login kembali.' : 'User akan langsung kehilangan akses saat request berikutnya.'}`)) return;
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) });
      await refresh(); setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }


  async function approveRegistration(userRecord, status) {
    const action = status === 'APPROVED' ? 'menyetujui' : 'menolak';
    if (!window.confirm(`Yakin ${action} pendaftaran ${userRecord.username}?`)) return;
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}/approval`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await Promise.all([refresh(), refreshNotifications()]);
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function financeRequest(path, method, payload, successFallback) {
    setBusy(true);
    try {
      const result = await api(path, { method, body: JSON.stringify(payload) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message || successFallback });
      return true;
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); return false; }
    finally { setBusy(false); }
  }
  async function startSpendingPeriod(payload) {
    return financeRequest('/admin/finance/spending-periods', 'POST', payload, 'Periode pembelanjaan dibuat.');
  }
  async function updateSpendingPeriod(payload) {
    return financeRequest('/admin/finance/spending-periods/current', 'PATCH', payload, 'Rentang periode diperbarui.');
  }
  async function resetSpendingPeriod(payload) {
    return financeRequest('/admin/finance/spending-periods/reset', 'POST', payload, 'Periode pembelanjaan di-reset.');
  }
  async function setCashOpeningBalance(payload) {
    return financeRequest('/admin/finance/cash/opening-balance', 'POST', payload, 'Saldo awal kas disimpan.');
  }
  async function addCashExpense(payload) {
    return financeRequest('/admin/finance/cash/expenses', 'POST', payload, 'Pengeluaran kas dicatat.');
  }
  async function addCashIncome(payload) {
    return financeRequest('/admin/finance/cash/income', 'POST', payload, 'Penambahan saldo kas dicatat.');
  }
  async function adjustCash(payload) {
    return financeRequest('/admin/finance/cash/adjustments', 'POST', payload, 'Koreksi saldo kas dicatat.');
  }

  async function testDiscord() {
    setBusy(true);
    try {
      const result = await api('/admin/integrations/discord/test', { method: 'POST', body: JSON.stringify({}) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message || 'Tes Discord berhasil.' });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function markAllNotificationsRead() {
    try { await api('/notifications/read-all', { method: 'POST' }); await refreshNotifications(); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
  }

  async function selectNotification(item) {
    try {
      if (!item.isRead) await api(`/notifications/${item.id}/read`, { method: 'PATCH' });
      await refreshNotifications();
      if (item.type === 'ACCOUNT_REGISTRATION' && isAdmin) {
        await refresh(user.role);
        setPage('users');
      } else if (item.orderId || item.order?.id) {
        // Refresh the order list first because notifications can arrive while another member is active.
        await refresh(user.role);
        setPage(isAdmin ? 'admin-orders' : 'my-orders');
      }
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
  }

  async function toggleFavorite(resource) {
    const isFavorite = favoriteIds.includes(resource.id);
    try {
      if (isFavorite) await api(`/favorites/${resource.id}`, { method: 'DELETE' });
      else await api(`/favorites/${resource.id}`, { method: 'POST', body: JSON.stringify({}) });
      setFavoriteIds((current) => isFavorite ? current.filter((id) => id !== resource.id) : [...current, resource.id]);
      setNoticeSafe({ type: 'success', message: isFavorite ? `${resource.name} dihapus dari favorit.` : `${resource.name} ditambahkan ke favorit.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
  }

  async function reorderOrder(order) {
    if (!window.confirm(`Buat pesanan baru berdasarkan ${order.orderNumber}? Harga akan mengikuti harga resource saat ini dan stok akan diperiksa ulang.`)) return;
    setBusy(true);
    try {
      const result = await api(`/orders/${order.id}/reorder`, { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([refresh(), refreshNotifications()]); setPage('my-orders');
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function submitOrder(notes = '') {
    const items = Object.entries(cart).map(([resourceId, quantity]) => ({ resourceId, quantity }));
    if (!items.length) return;
    setBusy(true);
    try {
      const result = await api('/orders', { method: 'POST', body: JSON.stringify({ items, notes }) });
      setCart({}); await Promise.all([refresh(), refreshNotifications()]); setPage('my-orders');
      setNoticeSafe({ type: 'success', message: `${result.order.orderNumber} berhasil dikirim. Menunggu persetujuan admin.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function orderAction(order, action) {
    let adminNotes = '';
    let handoverNote = '';
    const userCancel = !isAdmin && action === 'cancel';
    if (isAdmin && action === 'complete') {
      handoverNote = window.prompt(`Konfirmasi penyerahan langsung untuk ${order.orderNumber}. Catatan penyerahan (opsional):`, '') ?? null;
      if (handoverNote === null) return;
    }
    if (isAdmin && (action === 'reject' || action === 'cancel')) {
      adminNotes = window.prompt(action === 'reject' ? 'Alasan penolakan (opsional):' : 'Catatan pembatalan (opsional):', '') ?? null;
      if (adminNotes === null) return;
    }
    const endpoint = userCancel ? `/orders/${order.id}/cancel` : `/admin/orders/${order.id}/${action}`;
    setBusy(true);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify({ adminNotes, handoverNote }) });
      await Promise.all([refresh(), refreshNotifications()]); setSelectedOrder(null); setNoticeSafe({ type: 'success', message: `Pesanan ${order.orderNumber} berhasil diperbarui.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function archiveAllOrders() {
    if (!orders.length) { setNoticeSafe({ type: 'error', message: 'Tidak ada pesanan aktif untuk diarsipkan.' }); return; }
    const typed = window.prompt(`Kamu akan mengarsipkan ${orders.length} pesanan aktif. Data pesanan, invoice, laporan, dan stok tetap tersimpan.

Ketik RESET 30SFAMS untuk melanjutkan:`);
    if (typed !== 'RESET 30SFAMS') { if (typed !== null) setNoticeSafe({ type: 'error', message: 'Konfirmasi tidak cocok. Tidak ada pesanan yang diarsipkan.' }); return; }
    const reason = window.prompt('Alasan pengarsipan (opsional):', 'Penutupan periode pemesanan 30sFams');
    if (reason === null) return;
    setBusy(true);
    try {
      const result = await api('/admin/orders/archive-all', { method: 'POST', body: JSON.stringify({ confirmation: typed, reason }) });
      await refresh(); setPage('archived-orders');
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function restoreArchivedOrder(order) {
    if (!window.confirm(`Pulihkan ${order.orderNumber} ke daftar pesanan aktif? Status dan stok tidak akan diubah.`)) return;
    setBusy(true);
    try {
      const result = await api(`/admin/orders/${order.id}/restore`, { method: 'POST' });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function cancelAllActiveOrders() {
    const candidates = orders.filter((order) => ['PENDING', 'APPROVED'].includes(order.status));
    if (!candidates.length) { setNoticeSafe({ type: 'error', message: 'Tidak ada pesanan Pending atau Approved yang bisa dibatalkan.' }); return; }
    const approved = candidates.filter((order) => order.status === 'APPROVED').length;
    const proceed = window.confirm(`Batalkan ${candidates.length} pesanan aktif?
${approved} pesanan Approved akan mengembalikan stok cadangan ke stok tersedia. Pesanan Completed tidak diubah.`);
    if (!proceed) return;
    const typed = window.prompt('Aksi ini mengubah status pesanan dan stok. Ketik CANCEL 30SFAMS untuk melanjutkan:');
    if (typed !== 'CANCEL 30SFAMS') { if (typed !== null) setNoticeSafe({ type: 'error', message: 'Konfirmasi tidak cocok. Tidak ada pesanan yang dibatalkan.' }); return; }
    const reason = window.prompt('Alasan pembatalan massal:', 'Pembatalan massal oleh admin');
    if (reason === null) return;
    setBusy(true);
    try {
      const result = await api('/admin/orders/cancel-active', { method: 'POST', body: JSON.stringify({ confirmation: typed, reason }) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  function printSelectedOrder() {
    if (!selectedOrder) return;
    document.body.classList.add('printing-invoice');
    window.print();
    window.setTimeout(() => document.body.classList.remove('printing-invoice'), 700);
  }

  async function createResource(data) {
    setBusy(true);
    try { await api('/resources', { method: 'POST', body: JSON.stringify(data) }); await refresh(); setNoticeSafe({ type: 'success', message: 'Resource berhasil ditambahkan.' }); return true; }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); return false; }
    finally { setBusy(false); }
  }

  async function adjustStock(resource) {
    const raw = window.prompt(`Stok tersedia saat ini: ${resource.stockAvailable}\nMasukkan perubahan stok. Gunakan angka positif untuk menambah, negatif untuk mengurangi.`, '10');
    if (raw === null) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) { setNoticeSafe({ type: 'error', message: 'Masukkan bilangan bulat selain 0.' }); return; }
    const note = window.prompt('Alasan perubahan stok:', delta > 0 ? 'Restock' : 'Penyesuaian stok');
    if (note === null || note.trim().length < 3) return;
    setBusy(true);
    try { await api(`/resources/${resource.id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta, note }) }); await refresh(); setNoticeSafe({ type: 'success', message: `Stok ${resource.name} berhasil diperbarui.` }); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function editResource(resource) {
    const priceText = window.prompt(`Harga per ${resource.unit} (USD):`, String(resource.unitPrice));
    if (priceText === null) return;
    const price = Number(priceText);
    if (!Number.isFinite(price) || price < 0) { setNoticeSafe({ type: 'error', message: 'Harga tidak valid.' }); return; }
    setBusy(true);
    try { await api(`/resources/${resource.id}`, { method: 'PATCH', body: JSON.stringify({ unitPrice: price }) }); await refresh(); setNoticeSafe({ type: 'success', message: 'Harga resource diperbarui.' }); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function updateResourceImage(resource, file) {
    if (!file.type.startsWith('image/')) { setNoticeSafe({ type: 'error', message: 'Pilih file gambar yang valid.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setNoticeSafe({ type: 'error', message: 'Ukuran gambar maksimal 5 MB.' }); return; }
    setBusy(true);
    try {
      await uploadFile(`/resources/${resource.id}/image`, file);
      await refresh();
      setNoticeSafe({ type: 'success', message: `Gambar ${resource.name} berhasil diperbarui.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function removeResourceImage(resource) {
    if (!window.confirm(`Hapus gambar ${resource.name}?`)) return;
    setBusy(true);
    try {
      await api(`/resources/${resource.id}/image`, { method: 'DELETE' });
      await refresh();
      setNoticeSafe({ type: 'success', message: `Gambar ${resource.name} berhasil dihapus.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function toggleResource(resource) {
    const nextActive = !resource.isActive;
    const confirmed = window.confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} ${resource.name}?`);
    if (!confirmed) return;
    setBusy(true);
    try { await api(`/resources/${resource.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) }); await refresh(); setNoticeSafe({ type: 'success', message: `Resource ${nextActive ? 'diaktifkan' : 'dinonaktifkan'}.` }); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  if (booting) return <div className="boot-screen"><BrandLogo className="boot-brand-logo" /><span>Menyiapkan 30sFams Order Portal...</span></div>;
  if (!user) return <><AuthScreen onAuthenticated={(account) => { setUser(account); setPage('dashboard'); }} setNotice={setNoticeSafe} /><Notice notice={notice} clear={() => setNotice(null)} /></>;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Tutup menu" />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-brand"><BrandLogo className="sidebar-brand-logo" /><span>30s<span className="brand-accent">FAMS</span></span><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-switch"><div className="workspace-avatar"><Command size={17} /></div><div><strong>30sFams Supply</strong><span>Resource order workspace</span></div><ChevronDown size={15} /></div>
      <nav className="sidebar-nav">{[...new Set(navItems.map((item) => item.group))].map((group) => <div className="nav-group" key={group}><div className="nav-caption">{group}</div>{navItems.filter((item) => item.group === group).map((item) => <button key={item.key} className={`nav-link ${page === item.key ? 'active' : ''}`} onClick={() => { setPage(item.key); setMobileNav(false); }}><item.icon size={18} /><span>{item.label}</span>{item.key === 'admin-orders' && orders.filter((order) => order.status === 'PENDING').length > 0 && <em>{orders.filter((order) => order.status === 'PENDING').length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={17} /></div><strong>30sFams Order Portal</strong><p>Kelola supply, stok, dan pesanan 30sFams dalam satu tempat.</p><span>30SFAMS · FIVEM SUPPLY</span></div><div className="sidebar-user"><div className="user-avatar">{user.username.slice(0, 1).toUpperCase()}</div><div className="sidebar-user-info"><strong>{user.username}</strong><span>{isAdmin ? 'Administrator' : 'Member'}</span></div><button className="icon-button" onClick={() => setShowPasswordModal(true)} title="Ganti password"><KeyRound size={17} /></button><button className="icon-button" onClick={signOut} title="Logout"><LogOut size={17} /></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>30sFams</span><span>/</span><strong>{pageTitle}</strong></div></div><div className="topbar-right"><div className="system-status"><span className="live-dot" /> System operational</div><NotificationCenter notifications={notifications} unreadCount={unreadCount} onReadAll={markAllNotificationsRead} onSelect={selectNotification} /><div className="topbar-divider" /><div className="topbar-profile"><div className="user-avatar small">{user.username.slice(0, 1).toUpperCase()}</div><div><strong>{user.username}</strong><span>{isAdmin ? 'Admin' : 'User'}</span></div></div></div></header>
      <div className="content-area"><Notice notice={notice} clear={() => setNotice(null)} />
        {pageLoading && !loadedPages[currentPageKey] ? <div className="panel loading-panel">Memuat data halaman...</div> : <>
        {pageLoading && loadedPages[currentPageKey] && <div className="page-refresh-indicator" role="status">Memperbarui data...</div>}
        {page === 'dashboard' && <Dashboard user={user} resources={resources} orders={orders} reports={reports} dashboardData={dashboardData} goTo={setPage} />}
        {page === 'catalog' && !isAdmin && <Catalog resources={resources} cart={cart} setCart={setCart} search={search} setSearch={setSearch} category={category} setCategory={setCategory} submitOrder={submitOrder} busy={busy} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />}
        {page === 'my-orders' && !isAdmin && <><SectionHeader eyebrow="ORDER HISTORY" title="Pesanan saya" description="Buka detail untuk melihat item, catatan, invoice, dan riwayat status pesanan." /><div className="panel"><OrderTable orders={orders} isAdmin={false} onAction={orderAction} onDetail={setSelectedOrder} onReorder={reorderOrder} busy={busy} /></div></>}
        {page === 'inventory' && isAdmin && <Inventory resources={resources} onCreate={createResource} onStock={adjustStock} onEdit={editResource} onToggle={toggleResource} onImage={updateResourceImage} onRemoveImage={removeResourceImage} busy={busy} />}
        {page === 'stock-history' && isAdmin && <StockMovementPage movements={stockMovements} />}
        {page === 'member-stats' && isAdmin && <MemberStatsPage data={memberStats} />}
        {page === 'favorites' && !isAdmin && <FavoritesPage resources={resources} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} cart={cart} setCart={setCart} busy={busy} />}
        {page === 'admin-orders' && isAdmin && <><SectionHeader eyebrow="ORDER MANAGEMENT" title="Semua pesanan" description="Tinjau permintaan, setujui reservasi stok, dan tandai Completed langsung setelah resource diserahkan. Reservasi tidak kedaluwarsa otomatis; admin mengelolanya secara manual." action={<div className="header-actions"><button className="button button-outline" onClick={() => exportOrdersForExcel(orders)} disabled={!orders.length}><ArrowDownToLine size={15}/> Export CSV</button><button className="button button-outline" onClick={cancelAllActiveOrders} disabled={busy || !orders.some((order) => ['PENDING', 'APPROVED'].includes(order.status))}><XCircle size={15}/> Batalkan order aktif</button><button className="button button-ghost-danger" onClick={archiveAllOrders} disabled={busy || !orders.length}><Archive size={15}/> Arsipkan semua</button><div className="date-chip"><ClipboardList size={15} /> {number(orders.length)} pesanan aktif</div></div>} /><div className="panel"><OrderTable orders={orders} isAdmin onAction={orderAction} onDetail={setSelectedOrder} busy={busy} /></div></>}
        {page === 'archived-orders' && isAdmin && <><SectionHeader eyebrow="ORDER ARCHIVE" title="Arsip pesanan" description="Semua pesanan yang diarsipkan. Data tetap tersedia untuk detail, invoice, laporan, dan audit." action={<div className="header-actions"><button className="button button-outline" onClick={() => exportOrdersForExcel(archivedOrders)} disabled={!archivedOrders.length}><ArrowDownToLine size={15}/> Export arsip CSV</button><div className="date-chip"><Archive size={15} /> {number(archivedOrders.length)} arsip</div></div>} /><div className="panel"><OrderTable orders={archivedOrders} isAdmin readOnly isArchived onDetail={setSelectedOrder} onRestore={restoreArchivedOrder} busy={busy} /></div></>}
        {page === 'reports' && isAdmin && <Reports reports={reports} />}
        {page === 'users' && isAdmin && <UsersPage users={users} onCreate={createUser} onToggle={toggleUser} onApprove={approveRegistration} busy={busy} />}
        {page === 'finance' && isAdmin && <FinancePage finance={finance} cash={cash} onStartPeriod={startSpendingPeriod} onUpdatePeriod={updateSpendingPeriod} onResetPeriod={resetSpendingPeriod} onSetOpeningBalance={setCashOpeningBalance} onAddExpense={addCashExpense} onAddCashIncome={addCashIncome} onAdjustCash={adjustCash} busy={busy} />}
        {page === 'activity' && isAdmin && <ActivityPage logs={logs} discordStatus={discordStatus} onTestDiscord={testDiscord} busy={busy} />}
        {((isAdmin && ['catalog','my-orders','favorites'].includes(page)) || (!isAdmin && ['inventory','stock-history','admin-orders','archived-orders','reports','finance','users','member-stats','activity'].includes(page))) && <div className="panel"><EmptyState icon={ShieldCheck} title="Halaman tidak tersedia" detail="Menu ini tidak termasuk dalam hak akses akun Anda." /></div>}
        </>}
      </div>
      <OrderDetailModal order={selectedOrder} isAdmin={isAdmin} onClose={() => setSelectedOrder(null)} onPrint={printSelectedOrder} />
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} onSubmit={changePassword} busy={busy} />}
      <footer className="main-footer"><span>© {new Date().getFullYear()} 30sFams</span><span>30sFams Resource Orders <i /> Private workspace</span></footer>
    </main>
  </div>;
}
