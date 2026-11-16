import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Archive, ArrowDownToLine, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, ClipboardList, Clock3,
  Command, Database, FileText, History, LayoutDashboard, LogOut, Menu, Package,
  PackagePlus, Printer, Search, ShieldCheck, ShoppingCart, SlidersHorizontal,
  Sparkles, Trash2, Truck, Upload, UserRound, Users, UserPlus, UserX, CheckCheck, KeyRound, Pencil, X, XCircle, RotateCcw, Wallet, CalendarDays, Star, Repeat,
} from 'lucide-react';
import { api, assetUrl, categoryLabel, dateTime, money, number, statusLabel, uploadFile } from './api';

const CATEGORIES = ['CLASS1', 'CLASS2', 'CLASS3', 'NARKO', 'VEST', 'ATTACHMENT', 'AMMO'];
const STASH_CATEGORIES = [...CATEGORIES, 'OTHER'];
const MEMBER_RANKS = [
  { value: 'OG', label: 'OG' },
  { value: 'UNDER_OG', label: 'Under OG' },
  { value: 'SHOOT_CALLER', label: 'Shoot Caller' },
  { value: 'HOOD_PRESIDENT', label: 'Hood President' },
  { value: 'HOODBOYS', label: 'HoodBoys' },
  { value: 'YOUNGBOYS', label: 'YoungBoys' },
  { value: 'HANGAROUND', label: 'Hangaround' },
];
const AUTO_SYNC_INTERVAL_MS = 60000;

function readPageFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('page') || 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function BrandLogo({ className = '' }) {
  return <img className={`brand-logo ${className}`.trim()} src="/30s-logo.png" alt="Logo 30sFams" />;
}

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`notice ${notice.type}`} role="status">
    {notice.type === 'error' ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
    <span>{notice.message}</span>
    <button className="icon-button notice-close" onClick={clear} aria-label="Close"><X size={15} /></button>
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
      setNotice({ type: 'success', message: 'Signed in to 30sFams Order Portal successfully.' });
    } catch (error) { setNotice({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      setNotice({ type: 'error', message: 'Password confirmation does not match.' }); return;
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
        <p>The internal 30sFams portal for managing resources, monitoring inventory, and tracking every transaction.</p>
        <div className="auth-feature-list">
          <div><ShieldCheck size={18} /><span>Member accounts are reviewed by an admin</span></div>
          <div><Package size={18} /><span>Real-time stock and reservations</span></div>
          <div><ChartNoAxesCombined size={18} /><span>Spending and gang fund reports</span></div>
        </div>
      </div>
      <div className="auth-visual-footer"><span>RESOURCE MANAGEMENT SYSTEM</span><span>30SFAMS</span></div>
    </div>
    <div className="auth-panel">
      <div className="auth-panel-top"><span>30SFAMS <span className="muted">/ MEMBER ACCESS</span></span><span className="secure-label"><ShieldCheck size={14} /> SECURE ACCESS</span></div>
      <div className="auth-form-wrap">
        <div className="auth-heading"><span className="section-kicker">{mode === 'login' ? 'WELCOME BACK' : 'JOIN 30SFAMS'}</span><h2>{mode === 'login' ? 'Sign in to your account' : 'Create a member account'}</h2><p>{mode === 'login' ? 'Enter your username or email and password.' : 'Create a member account. Your account will be activated after approval by a 30sFams admin.'}</p></div>
        {mode === 'login' ? <form onSubmit={submitLogin} className="form-stack">
          <label>Username atau email<input required value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} placeholder="Enter your username or email" autoComplete="username" /></label>
          <label>Password<input required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter your password" autoComplete="current-password" /></label>
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'Processing...' : 'Sign in to dashboard'} <ArrowUpRight size={17} /></button>
        </form> : <form onSubmit={submitRegistration} className="form-stack">
          <label>Username<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} placeholder="Example: member30s" autoComplete="username" /></label>
          <label>Email<input required type="email" maxLength={150} value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} placeholder="nama@email.com" autoComplete="email" /></label>
          <label>Password<input required type="password" minLength={12} maxLength={100} value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} placeholder="At least 12 characters" autoComplete="new-password" /></label>
          <label>Confirm password<input required type="password" minLength={12} maxLength={100} value={registerForm.confirmPassword} onChange={(event) => setRegisterForm({ ...registerForm, confirmPassword: event.target.value })} placeholder="Re-enter password" autoComplete="new-password" /></label>
          <button className="button button-primary button-full" disabled={busy || registerForm.password !== registerForm.confirmPassword}>{busy ? 'Submitting registration...' : 'Submit registration'} <ArrowUpRight size={17} /></button>
          <div className="form-hint"><ShieldCheck size={14} /> New accounts remain pending and cannot sign in until approved by an admin.</div>
        </form>}
        <div className="auth-mode-switch">{mode === 'login' ? <>Don’t have an account? <button type="button" className="text-button" onClick={() => setMode('register')}>Sign up now</button></> : <>Already have an account? <button type="button" className="text-button" onClick={() => setMode('login')}>Back to sign in</button></>}</div>
      </div>
      <div className="auth-panel-footer">30sFams member access · All registrations are reviewed by an admin.</div>
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
      <div className="notification-dropdown-header"><div><strong>Notifikasi</strong><small>{unreadCount} unread</small></div><button className="text-button" disabled={!unreadCount} onClick={onReadAll}><CheckCheck size={14} /> Mark all as read</button></div>
      <div className="notification-list">
        {notifications.length ? notifications.map((item) => <button key={item.id} className={`notification-item ${item.isRead ? 'read' : 'unread'}`} onClick={() => { onSelect(item); setOpen(false); }}>
          <span className={`notification-item-icon ${item.type.toLowerCase()}`}><Bell size={15} /></span>
          <span className="notification-item-content"><strong>{item.title}</strong><span>{item.message}</span><small>{dateTime(item.createdAt)}{item.order?.orderNumber ? ` · ${item.order.orderNumber}` : ''}</small></span>
          {!item.isRead && <i className="notification-unread-dot" />}
        </button>) : <EmptyState icon={Bell} title="No notifications yet" detail="Order activity will appear here." />}
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
      <div className="panel-heading"><div><span className="section-kicker">ACCOUNT SECURITY</span><h3 id="change-password-title">Change password</h3><p>Use a new password with at least 12 characters.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      <form className="form-stack change-password-form" onSubmit={submit}>
        <label>Current password<input required type="password" autoComplete="current-password" value={draft.currentPassword} onChange={(event) => setDraft({ ...draft, currentPassword: event.target.value })}/></label>
        <label>New password<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={draft.newPassword} onChange={(event) => setDraft({ ...draft, newPassword: event.target.value })}/></label>
        <label>Confirm password baru<input required type="password" minLength={12} maxLength={100} autoComplete="new-password" value={draft.confirmPassword} onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })}/></label>
        {draft.confirmPassword && draft.newPassword !== draft.confirmPassword && <small className="password-mismatch">Password confirmation does not match.</small>}
        <div className="form-footer"><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy || draft.newPassword !== draft.confirmPassword || draft.newPassword.length < 12}><KeyRound size={15}/> Save password</button></div>
      </form>
    </section>
  </div>;
}

function EditResourceModal({ resource, onClose, onSave, busy }) {
  const [draft, setDraft] = useState({
    name: resource.name || '',
    sku: resource.sku || '',
    category: resource.category || 'CLASS1',
    unit: resource.unit || 'unit',
    unitPrice: String(resource.unitPrice ?? 0),
    minStock: String(resource.minStock ?? 0),
    description: resource.description || '',
  });

  async function submit(event) {
    event.preventDefault();
    const price = Number(draft.unitPrice);
    if (!Number.isFinite(price) || price < 0) return;
    const saved = await onSave(resource.id, {
      name: draft.name.trim(),
      sku: draft.sku.trim().toUpperCase(),
      category: draft.category,
      unit: draft.unit.trim(),
      unitPrice: price,
      minStock: Number(draft.minStock),
      description: draft.description,
    });
    if (saved) onClose();
  }

  return <div className="order-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="change-password-modal edit-resource-modal" role="dialog" aria-modal="true" aria-labelledby="edit-resource-title">
      <div className="panel-heading">
        <div><span className="section-kicker">INVENTORY CONTROL</span><h3 id="edit-resource-title">Edit resource details</h3><p>Update information <strong>{resource.name}</strong>. These changes will not affect available or reserved stock.</p></div>
        <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18}/></button>
      </div>
      <form className="form-stack change-password-form" onSubmit={submit}>
        <div className="form-grid edit-resource-grid">
          <label>Resource name<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Resource name" /></label>
          <label>SKU / unique code<input required minLength={2} maxLength={40} pattern="[A-Za-z0-9_-]+" value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value.toUpperCase() })} placeholder="WPN-001" /></label>
          <label>Category<select required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{CATEGORIES.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}</select></label>
          <label>Unit<input required maxLength={24} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="unit / pcs / pack" /></label>
          <label>Unit price (USD)<input required type="number" min="0" max="1000000000" step="0.01" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} /></label>
          <label>Minimum stock threshold<input required type="number" min="0" max="1000000" step="1" value={draft.minStock} onChange={(event) => setDraft({ ...draft, minStock: event.target.value })} /><small className="field-hint">An alert appears when available stock reaches this threshold. Enter 0 to disable the threshold.</small></label>
          <label className="span-two">Description<input maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Brief resource description" /></label>
        </div>
        <div className="edit-resource-note"><ShieldCheck size={15}/><span>Stock quantities can only be changed using the <strong>Adjust Stock</strong> so changes are recorded in inventory history.</span></div>
        <div className="form-footer"><button type="button" className="button button-ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="button button-primary" disabled={busy || !draft.name.trim() || !draft.sku.trim() || !draft.unit.trim() || !Number.isFinite(Number(draft.unitPrice)) || Number(draft.unitPrice) < 0}><Check size={15}/> {busy ? 'Saving...' : 'Save Changes'}</button></div>
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
    const catalogResources = resources.filter((item) => item.category !== 'OTHER');
    const totalAvailable = Number(stock.available ?? catalogResources.reduce((sum, item) => sum + item.stockAvailable, 0));
    const totalReserved = Number(stock.reserved ?? catalogResources.reduce((sum, item) => sum + item.stockReserved, 0));
    const recentOrders = dashboardData?.recentOrders || orders;
    const categoryValues = CATEGORIES.map((category) => Number(
      byCategory[category] ?? catalogResources.filter((item) => item.category === category).reduce((sum, item) => sum + item.stockAvailable, 0)
    ));
    const maxCategoryStock = Math.max(1, ...categoryValues);
    const pendingCount = Number(summary.pendingOrders ?? pending);
    const approvedCount = Number(summary.approvedOrders ?? 0);
    const completedCount = Number(summary.completedOrders ?? completed.length);
    const lowStockResources = dashboardData?.lowStockResources || [];
    const lowStockCount = Number(summary.lowStockResources ?? lowStockResources.length);

    return <>
      <SectionHeader eyebrow="ADMIN OVERVIEW" title={`Welcome, ${user.username}`} description="Monitor inventory, requests, and server resource activity." action={<div className="date-chip"><Clock3 size={15} /> {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date())}</div>} />
      <div className="stats-grid">
        <StatCard label="Total resource types" value={number(summary.activeResources ?? catalogResources.length)} detail="Active resources" icon={Boxes} tone="blue" />
        <StatCard label="Available stock" value={number(totalAvailable)} detail={`${number(totalReserved)} units currently reserved`} icon={Package} tone="green" />
        <StatCard label="Pending orders" value={number(summary.pendingOrders ?? pending)} detail="Awaiting admin review" icon={ClipboardList} tone="orange" />
        <StatCard label="Total completed value" value={money(summary.completedAmount ?? completedAmount)} detail={`${number(summary.completedQuantity ?? completedQty)} units sold`} icon={CircleDollarSign} tone="purple" />
      </div>
      <div className="order-status-summary">
        <button className="order-status-card pending" onClick={() => goTo('admin-orders')}>
          <span>Pending</span><strong>{number(pendingCount)}</strong><small>Awaiting approval</small>
        </button>
        <button className="order-status-card approved" onClick={() => goTo('admin-orders')}>
          <span>Approved</span><strong>{number(approvedCount)}</strong><small>Awaiting handover</small>
        </button>
        <button className="order-status-card completed" onClick={() => goTo('admin-orders')}>
          <span>Completed</span><strong>{number(completedCount)}</strong><small>Transactions completed</small>
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="panel"><div className="panel-heading"><div><h3>Recent orders</h3><p>Incoming resource requests</p></div><button className="text-button" onClick={() => goTo('admin-orders')}>View all <ArrowUpRight size={15} /></button></div>
          {recentOrders.slice(0, 5).length ? <div className="compact-list">{recentOrders.slice(0, 5).map((order) => <div className="compact-row" key={order.id || order.orderNumber}><div className="item-symbol"><ClipboardList size={17} /></div><div className="compact-main"><strong>{order.orderNumber}</strong><span>{order.user?.username || 'User'} · {number(order.totalQuantity)} unit</span></div><div className="compact-side"><StatusPill status={order.status} /><span>{money(order.totalAmount)}</span></div></div>)}</div> : <EmptyState icon={ClipboardList} title="No orders yet" detail="Member orders will appear here." />}
        </div>
        <div className="panel"><div className="panel-heading"><div><h3>Stock by category</h3><p>Current available stock</p></div><button className="icon-button" onClick={() => goTo('inventory')} aria-label="Buka inventory"><ArrowUpRight size={17} /></button></div>
          <div className="category-stock">{CATEGORIES.map((category, index) => { const qty = categoryValues[index]; return <div className="category-stock-row" key={category}><div><span>{categoryLabel(category)}</span><strong>{number(qty)}</strong></div><div className="progress-track"><span style={{ width: `${Math.max(3, qty / maxCategoryStock * 100)}%` }} /></div></div>; })}</div>
        </div>
      </div>
      <div className="panel low-stock-panel">
        <div className="panel-heading">
          <div><h3><AlertTriangle size={15} /> Stock alerts</h3><p>{lowStockCount ? `${number(lowStockCount)} resources need attention` : 'All resources are above their minimum stock threshold'}</p></div>
          <button className="text-button" onClick={() => goTo('inventory')}>Open inventory management <ArrowUpRight size={15} /></button>
        </div>
        {lowStockResources.length ? <div className="low-stock-list">
          {lowStockResources.map((resource) => {
            const isEmpty = Number(resource.stockAvailable) <= 0;
            return <div className="low-stock-row" key={resource.id}>
              <div><strong>{resource.name}</strong><small>{resource.sku} · {categoryLabel(resource.category)}</small></div>
              <div className="low-stock-quantity"><strong>{number(resource.stockAvailable)} / {number(resource.minStock)}</strong><span>{resource.unit}</span></div>
              <span className={`stock-tag ${isEmpty ? 'out-stock' : 'low-stock'}`}>{isEmpty ? 'Out of stock' : 'Low stock'}</span>
            </div>;
          })}
          {lowStockCount > lowStockResources.length && <p className="low-stock-more">+ {number(lowStockCount - lowStockResources.length)} more resources need attention</p>}
        </div> : <div className="low-stock-empty"><CheckCircle2 size={18} /> No resources are below their minimum stock threshold.</div>}
      </div>
    </>;
  }

  const totalAvailable = resources.reduce((sum, resource) => sum + resource.stockAvailable, 0);
  const totalReserved = resources.reduce((sum, resource) => sum + resource.stockReserved, 0);
  return <>
    <SectionHeader eyebrow="PERSONAL OVERVIEW" title={`Welcome, ${user.username}`} description="A summary of your resources and account order activity." action={<div className="date-chip"><Clock3 size={15} /> {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date())}</div>} />
    <div className="stats-grid">
      <StatCard label="Available resources" value={number(resources.length)} detail="Item types in the catalog" icon={Boxes} tone="blue" />
      <StatCard label="Pending orders" value={number(pending)} detail="Awaiting approval admin" icon={Clock3} tone="orange" />
      <StatCard label="Completed units purchased" value={number(completedQty)} detail="Total completed orders" icon={Package} tone="green" />
      <StatCard label="Total purchase value" value={money(completedAmount)} detail="Completed orders only" icon={CircleDollarSign} tone="purple" />
    </div>
    <div className="panel"><div className="panel-heading"><div><h3>Recent order history</h3><p>Order status for your account</p></div><button className="text-button" onClick={() => goTo('my-orders')}>View all <ArrowUpRight size={15} /></button></div>
      {orders.slice(0, 6).length ? <div className="table-wrap"><table><thead><tr><th>Order number</th><th>Date</th><th>Quantity</th><th>Total amount</th><th>Status</th></tr></thead><tbody>{orders.slice(0, 6).map((order) => <tr key={order.id}><td className="strong-cell">{order.orderNumber}</td><td>{dateTime(order.createdAt)}</td><td>{number(order.totalQuantity)} unit</td><td>{money(order.totalAmount)}</td><td><StatusPill status={order.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={ShoppingCart} title="No transactions yet" detail="Choose a resource from the catalog to place your first order." />}
    </div>
  </>;
}
function Catalog({ resources, cart, setCart, search, setSearch, category, setCategory, submitOrder, busy, favoriteIds = [], onToggleFavorite, favoriteOnly = false, showFavorites = true, isAdminMode = false }) {
  const [orderNotes, setOrderNotes] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 18;
  const filtered = useMemo(() => resources.filter((resource) => {
    const matchCategory = category === 'ALL' || resource.category === category;
    const matchSearch = `${resource.name} ${resource.sku} ${resource.description}`.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch && (!favoriteOnly || favoriteIds.includes(resource.id));
  }), [resources, category, search, favoriteOnly, favoriteIds]);
  const visibleResources = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );
  useEffect(() => setPage(1), [search, category, resources, favoriteIds, favoriteOnly]);
  const cartItems = useMemo(() => resources.filter((resource) => cart[resource.id] > 0), [resources, cart]);
  const cartQty = useMemo(() => cartItems.reduce((sum, resource) => sum + cart[resource.id], 0), [cartItems, cart]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, resource) => sum + cart[resource.id] * resource.unitPrice, 0), [cartItems, cart]);
  function changeCart(id, delta, available) {
    setCart((current) => {
      const next = { ...current };
      const qty = (next[id] || 0) + delta;
      if (qty <= 0) delete next[id]; else next[id] = Math.min(qty, available);
      return next;
    });
  }
  function setCartQuantity(id, value, available) {
    setCart((current) => {
      const next = { ...current };
      if (value === '') {
        delete next[id];
        return next;
      }
      const quantity = Number(value);
      if (!Number.isFinite(quantity) || quantity <= 0 || available <= 0) {
        delete next[id];
      } else {
        next[id] = Math.min(Math.floor(quantity), available);
      }
      return next;
    });
  }
  return <>
    <SectionHeader eyebrow={favoriteOnly ? 'SAVED RESOURCES' : 'RESOURCE CATALOG'} title={favoriteOnly ? 'Favorite Resources' : 'Browse resources'} description={favoriteOnly ? 'Your saved favorite resources for future orders.' : isAdminMode ? 'Browse resources untuk kebutuhan akun Super Admin. Orders tercatat atas nama akun ini dan tetap masuk ke daftar Semua Orders.' : 'Find the items you need, choose quantities, and submit your order for admin review.'} action={<div className="cart-summary"><ShoppingCart size={17} /><span>{number(cartQty)} unit</span><strong>{money(cartTotal)}</strong></div>} />
    <div className="catalog-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resource name or SKU..." /></div><div className="filter-select"><SlidersHorizontal size={16} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="ALL">All categories</option>{CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabel(item)}</option>)}</select><ChevronDown size={15} /></div></div>
    {filtered.length ? <><div className="resource-grid">{visibleResources.map((resource) => <article className="resource-card" key={resource.id}>
      <div className={`resource-art ${resource.category.toLowerCase()} ${resource.imageUrl ? 'with-photo' : ''}`}>
        {resource.imageUrl && <img className="resource-art-photo" src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" decoding="async" />}
        <div className="resource-art-grid" /><span>{categoryLabel(resource.category)}</span>
        {!resource.imageUrl && <div className="resource-art-icon"><Package size={30} /></div>}
        <small>{resource.sku}</small>
      </div>
      <div className="resource-card-body"><div className="resource-name-row"><h3>{resource.name}</h3>{showFavorites && <button type="button" className={`favorite-toggle ${favoriteIds.includes(resource.id) ? 'active' : ''}`} onClick={() => onToggleFavorite?.(resource)} title={favoriteIds.includes(resource.id) ? 'Remove from favorites' : 'Add to favorites'} aria-label={favoriteIds.includes(resource.id) ? 'Remove from favorites' : 'Add to favorites'}><Star size={16} fill={favoriteIds.includes(resource.id) ? 'currentColor' : 'none'} /></button>}<span className={`stock-tag ${resource.stockAvailable > 0 ? 'in-stock' : 'out-stock'}`}>{resource.stockAvailable > 0 ? 'Available' : 'Out of stock'}</span></div><p>{resource.description || 'No description available for this resource.'}</p><div className="resource-meta"><span>Price / {resource.unit}</span><strong>{money(resource.unitPrice)}</strong></div><div className="resource-meta"><span>Available stock</span><strong>{number(resource.stockAvailable)} {resource.unit}</strong></div>
        <div className="resource-action"><div className="quantity-control"><button type="button" onClick={() => changeCart(resource.id, -1, resource.stockAvailable)} disabled={!cart[resource.id] || busy} aria-label={`Decrease quantity for ${resource.name}`}>−</button><input className="quantity-input" type="number" inputMode="numeric" min="0" max={resource.stockAvailable} step="1" value={cart[resource.id] || ''} placeholder="0" disabled={resource.stockAvailable <= 0 || busy} onChange={(event) => setCartQuantity(resource.id, event.target.value, resource.stockAvailable)} aria-label={`Quantity for ${resource.name}`} /><button type="button" onClick={() => changeCart(resource.id, 1, resource.stockAvailable)} disabled={resource.stockAvailable <= 0 || busy || (cart[resource.id] || 0) >= resource.stockAvailable} aria-label={`Increase quantity for ${resource.name}`}>+</button></div></div>
      </div>
    </article>)}</div><DataPagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /></> : <EmptyState icon={Search} title="No resources found" detail="Try changing your search term or category filter." />}
    <div className="checkout-notes panel"><label htmlFor="order-notes"><span>Note for admin <small>(optional, up to 500 characters)</small></span><textarea id="order-notes" maxLength={500} rows={2} value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} placeholder="Example: Please process this for tonight’s event." /></label><div className="notes-counter">{orderNotes.length}/500 karakter</div></div>
    <div className="order-cart-bar"><div><span className="cart-label">ORDER CART</span><strong>{number(cartQty)} unit <span>·</span> {money(cartTotal)}</strong></div><button className="button button-primary" disabled={!cartQty || busy} onClick={() => submitOrder(orderNotes)}>{busy ? 'Submitting...' : 'Submit order'} <ArrowUpRight size={16} /></button></div>
  </>;
}

function DataPagination({ page, pageSize = 25, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(total, page * pageSize);
  return <div className="table-pagination">
    <span>Showing {number(firstItem)}–{number(lastItem)} dari {number(total)}</span>
    <div>
      <button type="button" className="button button-small button-ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Halaman {number(page)} / {number(totalPages)}</span>
      <button type="button" className="button button-small button-ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  </div>;
}

function OrderTable({ orders, isAdmin, onAction, onDetails, onRestore, onReorder, busy, readOnly = false, isArchived = false }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];
  const pageOrders = safeOrders.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [orders]);
  if (!safeOrders.length) return <EmptyState icon={ClipboardList} title="No order data yet" detail="Orders will appear on this page once a transaction has been placed." />;
  return <><div className="table-wrap"><table><thead><tr>{isAdmin && <th>Ordered By</th>}<th>Order number</th><th>Date</th>{isArchived && <th>Diarsipkan</th>}<th>Resource</th><th>Quantity</th><th>Total amount</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pageOrders.map((order) => <tr key={order.id}>
    {isAdmin && <td><div className="user-cell"><div className="avatar-mini">{(order.user?.username || 'U').slice(0, 1).toUpperCase()}</div>{order.user?.username || '-'}</div></td>}
    <td><span className="strong-cell">{order.orderNumber}</span>{order.notes && <small className="cell-sub">Note: {order.notes}</small>}</td><td>{dateTime(order.createdAt)}</td>{isArchived && <td>{dateTime(order.archivedAt)}</td>}<td><div className="resource-lines">{(Array.isArray(order.items) ? order.items : []).map((item) => <span key={item.id || item.resourceId || item.resourceName}>{item.resourceName || 'Resource'}</span>)}</div></td><td>{number(order.totalQuantity)} unit</td><td className="strong-cell">{money(order.totalAmount)}</td><td><StatusPill status={order.status} />{order.adminNotes && <small className="cell-sub">{order.adminNotes}</small>}</td>
    <td><div className="table-actions"><button className="button button-small button-ghost" disabled={busy} onClick={() => onDetails(order)}><FileText size={13} /> Details</button>{isArchived && isAdmin && <button className="button button-small button-ghost" disabled={busy} onClick={() => onRestore(order)}><RotateCcw size={13} /> Restore</button>}{!readOnly && isAdmin && order.status === 'PENDING' && <><button className="action-button approve" disabled={busy} onClick={() => onAction(order, 'approve')} title="Approve"><Check size={15} /></button><button className="action-button reject" disabled={busy} onClick={() => onAction(order, 'reject')} title="Reject"><X size={15} /></button></>}{!readOnly && isAdmin && order.status === 'APPROVED' && <><button className="action-button approve" disabled={busy} onClick={() => onAction(order, 'complete')} title="Konfirmasi penyerahan langsung dan selesaikan"><CheckCircle2 size={15} /></button><button className="action-button reject" disabled={busy} onClick={() => onAction(order, 'cancel')} title="Cancel and release stock"><X size={15} /></button></>}{!readOnly && !isAdmin && order.status === 'PENDING' && <button className="button button-small button-ghost-danger" disabled={busy} onClick={() => onAction(order, 'cancel')}>Cancel</button>}{!readOnly && !isAdmin && order.status === 'COMPLETED' && onReorder && <button className="button button-small button-outline" disabled={busy} onClick={() => onReorder(order)}><Repeat size={13}/> Reorder</button>}</div></td>
  </tr>)}</tbody></table></div><DataPagination page={page} pageSize={pageSize} total={orders.length} onPageChange={setPage} /></>;
}

function OrderDetailsModal({ order, onClose, onPrint, isAdmin }) {
  if (!order) return null;
  const history = order.statusHistory?.length ? order.statusHistory : [{
    id: 'legacy-history', fromStatus: null, toStatus: order.status,
    note: 'Status changes made before the timeline feature was enabled are unavailable.',
    createdAt: order.updatedAt || order.createdAt, changedBy: { username: 'System' },
  }];
  return <div className="order-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
      <div className="order-detail-toolbar no-print"><div><span className="section-kicker">30SFAMS · ORDER RECORD</span><h2>Order Detailss</h2></div><div className="modal-toolbar-actions"><button className="button button-outline" onClick={onPrint}><Printer size={15} /> Print / PDF</button><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={19} /></button></div></div>
      <div className="invoice-sheet">
        <header className="invoice-brand-row"><div className="invoice-brand"><img src="/30s-logo.png" alt="30sFams"/><div><strong>30sFAMS</strong><span>RESOURCE ORDER PORTAL</span></div></div><div className="invoice-status"><span>ORDER STATUS</span><StatusPill status={order.status} /></div></header>
        <div className="invoice-title-row"><div><span className="section-kicker">ORDER DETAIL / INVOICE</span><h2 id="order-detail-title">{order.orderNumber}</h2><p>Created on {dateTime(order.createdAt)}</p></div><div className="invoice-meta"><span>Order number</span><strong>{order.orderNumber}</strong><span>Last updated</span><strong>{dateTime(order.updatedAt || order.createdAt)}</strong>{order.archivedAt && <><span>Archive date</span><strong>{dateTime(order.archivedAt)} · {order.archivedBy?.username || 'Admin'}</strong></>}</div></div>
        <div className="invoice-customer-grid"><div><span className="invoice-label">PEMESAN</span><strong>{order.user?.username || 'Your account'}</strong>{isAdmin && <small>{order.user?.email || '-'}</small>}</div><div><span className="invoice-label">ITEM COUNT</span><strong>{number(order.totalQuantity)} unit</strong><small>{number(order.items?.length || 0)} resource types</small></div></div>
        <div className="invoice-section-title">Resource Detailss</div>
        <div className="table-wrap invoice-table-wrap"><table className="invoice-table"><thead><tr><th>Resource</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>{order.items?.map((item) => <tr key={item.id}><td><strong>{item.resourceName}</strong></td><td>{categoryLabel(item.category)}</td><td>{number(item.quantity)} {item.unit}</td><td>{money(item.unitPrice)}</td><td className="strong-cell">{money(item.lineTotal)}</td></tr>)}</tbody></table></div>
        <div className="invoice-total-box"><div><span>Total Quantity</span><strong>{number(order.totalQuantity)} unit</strong></div><div className="invoice-grand-total"><span>Total amount</span><strong>{money(order.totalAmount)}</strong></div></div>
        <div className="invoice-note-grid"><section><span className="invoice-label">MEMBER NOTE</span><p>{order.notes?.trim() || 'No note from the member.'}</p></section>{(isAdmin || order.adminNotes) && <section><span className="invoice-label">ADMIN NOTE</span><p>{order.adminNotes?.trim() || 'No admin note yet.'}</p></section>}</div>
        <section className="order-timeline"><div className="invoice-section-title"><History size={15}/> Order Status History</div><div className="timeline-list">{history.map((event) => <div className="timeline-event" key={event.id}><span className="timeline-dot"/><div className="timeline-event-body"><div><strong>{event.fromStatus ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}` : statusLabel(event.toStatus)}</strong><time>{dateTime(event.createdAt)}</time></div><p>{event.note || 'Order status updated.'}</p><small>By: {event.changedBy?.username || 'System'}</small></div></div>)}</div></section>
        <footer className="invoice-footer"><span>30sFams · Private Resource Supply</span><span>Document generated by the 30sFams order system.</span></footer>
      </div>
      <div className="order-detail-footer no-print"><button className="button button-ghost" onClick={onClose}>Close</button><button className="button button-primary" onClick={onPrint}><Printer size={15}/> Print Invoice / Save PDF</button></div>
    </section>
  </div>;
}

function exportOrdersForExcel(orders) {
  const headers = ['Order Number', 'Date', 'Status', 'Date Arsip', 'Archived By', 'Username', 'Email', 'Member Notes', 'Admin Notes', 'Resource', 'Category', 'Quantity', 'Unit', 'Unit Price (USD)', 'Subtotal (USD)', 'Total Quantity Orders', 'Total Nominal Orders (USD)'];
  const rows = orders.flatMap((order) => (order.items || []).map((item) => [
    order.orderNumber, new Date(order.createdAt).toLocaleString('en-US'), statusLabel(order.status),
    order.archivedAt ? new Date(order.archivedAt).toLocaleString('en-US') : '', order.archivedBy?.username || '',
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
  const [draft, setDraft] = useState({ name: '', sku: '', category: 'CLASS1', description: '', unit: 'unit', unitPrice: '0', initialStock: '0', minStock: '0' });
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  async function create(event) {
    event.preventDefault();
    const ok = await onCreate({ ...draft, unitPrice: Number(draft.unitPrice), initialStock: Number(draft.initialStock), minStock: Number(draft.minStock) });
    if (ok) {
      setDraft({ name: '', sku: '', category: 'CLASS1', description: '', unit: 'unit', unitPrice: '0', initialStock: '0', minStock: '0' });
      setShowCreate(false);
    }
  }
  const normalizedSearch = search.trim().toLowerCase();
  const shown = useMemo(() => resources.filter((resource) => {
    const available = Number(resource.stockAvailable || 0);
    const minimum = Number(resource.minStock || 0);
    const isLow = resource.isActive && (available <= 0 || (minimum > 0 && available <= minimum));
    const matchesCategory = filter === 'ALL' || resource.category === filter;
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'ACTIVE' && resource.isActive)
      || (statusFilter === 'INACTIVE' && !resource.isActive)
      || (statusFilter === 'LOW' && isLow);
    const matchesSearch = `${resource.name} ${resource.sku} ${resource.description || ''}`.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesStatus && matchesSearch;
  }), [resources, filter, statusFilter, normalizedSearch]);
  const visibleResources = useMemo(
    () => shown.slice((page - 1) * pageSize, page * pageSize),
    [shown, page]
  );
  useEffect(() => setPage(1), [filter, statusFilter, search, resources]);
  return <>
    <SectionHeader eyebrow="INVENTORY CONTROL" title="Inventory Management" description="Add resources, update prices, and track every inventory change." action={<button className="button button-primary" onClick={() => setShowCreate((v) => !v)}><PackagePlus size={16} /> Add Resource</button>} />
    {showCreate && <form className="panel create-resource-form" onSubmit={create}><div className="panel-heading"><div><h3>New Resource</h3><p>The resource will appear in the catalog and can be ordered based on available stock.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}><X size={17} /></button></div><div className="form-grid"><label>Resource name<input required minLength={2} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Example: WEAPON_PISTOL" /></label><label>SKU / unique code<input required value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} placeholder="WPN-001" /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option value={c} key={c}>{categoryLabel(c)}</option>)}</select></label><label>Unit<input required value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="unit / pcs / pack" /></label><label>Unit price (USD)<input required type="number" min="0" step="1" value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} /></label><label>Initial Stock<input required type="number" min="0" step="1" value={draft.initialStock} onChange={(e) => setDraft({ ...draft, initialStock: e.target.value })} /></label><label>Minimum stock threshold<input required type="number" min="0" max="1000000" step="1" value={draft.minStock} onChange={(e) => setDraft({ ...draft, minStock: e.target.value })} /><small className="field-hint">Isi 0 jika tidak memakai batas minimum.</small></label><label className="span-two">Description<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Brief resource description" /></label></div><div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={busy}>Save Resource</button></div></form>}
    <div className="panel"><div className="panel-heading"><div><h3>Inventory List</h3><p>{number(shown.length)} dari {number(resources.length)} items shown</p></div><div className="inventory-count">{number(shown.length)} hasil</div></div>
      <div className="catalog-toolbar inventory-toolbar">
        <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resource name or SKU..." /></div>
        <div className="filter-select compact"><SlidersHorizontal size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by category"><option value="ALL">All categories</option>{CATEGORIES.map((c) => <option value={c} key={c}>{categoryLabel(c)}</option>)}</select><ChevronDown size={14} /></div>
        <div className="filter-select compact"><SlidersHorizontal size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="LOW">Low stock / habis</option></select><ChevronDown size={14} /></div>
      </div>
      {shown.length ? <><div className="table-wrap"><table><thead><tr><th>Resource</th><th>Category</th><th>Price / unit</th><th>Available stock</th><th>Reserved</th><th>Total Stock</th><th>Minimum threshold</th><th>Status</th><th>Manage</th></tr></thead><tbody>{visibleResources.map((resource) => {
        const available = Number(resource.stockAvailable || 0);
        const minimum = Number(resource.minStock || 0);
        const low = available <= 0 || (minimum > 0 && available <= minimum);
        return <tr key={resource.id}><td><div className="resource-table-name"><div className="item-symbol resource-thumb">{resource.imageUrl ? <img src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" decoding="async" /> : <Package size={17} />}</div><div><strong>{resource.name}</strong><small>{resource.sku}</small></div></div></td><td><span className="category-label">{categoryLabel(resource.category)}</span></td><td>{money(resource.unitPrice)}</td><td className="strong-cell">{number(resource.stockAvailable)}</td><td>{number(resource.stockReserved)}</td><td>{number(resource.stockTotal)}</td><td>{number(minimum)} {resource.unit}</td><td><div className="inventory-status-stack"><span className={`stock-tag ${resource.isActive ? 'in-stock' : 'out-stock'}`}>{resource.isActive ? 'Active' : 'Inactive'}</span>{resource.isActive && low && <span className={`stock-tag ${available <= 0 ? 'out-stock' : 'low-stock'}`}>{available <= 0 ? 'Out of stock' : 'Low stock'}</span>}</div></td><td><div className="table-actions"><label className={`action-button image-upload-control ${busy ? 'disabled' : ''}`} title={resource.imageUrl ? 'Change Image' : 'Upload Image'}><Upload size={15} /><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onImage(resource, file); event.target.value = ''; }} /></label>{resource.imageUrl && <button className="action-button reject" disabled={busy} onClick={() => onRemoveImage(resource)} title="Remove Image"><Trash2 size={14} /></button>}<button className="button button-small button-outline" disabled={busy} onClick={() => onStock(resource)}>Adjust Stock</button><button className="action-button" disabled={busy} onClick={() => onEdit(resource)} title="Edit resource details"><Pencil size={15} /></button><button className="action-button" disabled={busy} onClick={() => onToggle(resource)} title={resource.isActive ? 'Nonaktifkan' : 'Aktifkan'}>{resource.isActive ? <X size={15} /> : <Check size={15} />}</button></div></td></tr>;
      })}</tbody></table></div><DataPagination page={page} pageSize={pageSize} total={shown.length} onPageChange={setPage} /></> : <EmptyState title="No resources found" detail={resources.length ? 'Try changing the search term or category/status filter.' : 'No resources yet. Add your first resource using the Add Resource button.'} />}
    </div>
  </>;
}



function StashPage({ resources = [], onCreate, onStock, busy }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: '', sku: '', unit: 'unit', initialStock: '0', description: '' });
  const pageSize = 25;
  const totalAvailable = resources.reduce((sum, item) => sum + Number(item.stockAvailable || 0), 0);
  const totalReserved = resources.reduce((sum, item) => sum + Number(item.stockReserved || 0), 0);
  const totalStock = resources.reduce((sum, item) => sum + Number(item.stockTotal ?? (Number(item.stockAvailable || 0) + Number(item.stockReserved || 0))), 0);
  const filtered = useMemo(() => resources.filter((resource) => {
    const matchesCategory = filter === 'ALL' || resource.category === filter;
    const matchesSearch = `${resource.name} ${resource.sku} ${resource.description || ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [resources, filter, search]);
  const visible = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  useEffect(() => setPage(1), [search, filter, resources]);

  async function createOtherItem(event) {
    event.preventDefault();
    const saved = await onCreate({
      name: draft.name,
      sku: draft.sku.toUpperCase(),
      category: 'OTHER',
      unit: draft.unit,
      unitPrice: 0,
      initialStock: Number(draft.initialStock),
      description: draft.description,
    });
    if (saved) {
      setDraft({ name: '', sku: '', unit: 'unit', initialStock: '0', description: '' });
      setShowCreate(false);
    }
  }

  return <>
    <SectionHeader eyebrow="BRANGKAS / STASH" title="Stash" description="All items stored in the stash. Catalog resource stock stays linked, while items in the Other category are stored on this page only." action={<button className="button button-primary" onClick={() => setShowCreate((value) => !value)}><PackagePlus size={16} /> Add Stash Item</button>} />
    <div className="stats-grid">
      <StatCard label="Item Types" value={number(resources.length)} detail="All items registered in the stash" icon={Boxes} tone="blue" />
      <StatCard label="Total Stash Stock" value={number(totalStock)} detail="Available + reserved" icon={Package} tone="green" />
      <StatCard label="Available stock" value={number(totalAvailable)} detail="Stock not currently reserved" icon={PackagePlus} tone="purple" />
      <StatCard label="Stock dicadangkan" value={number(totalReserved)} detail="Reserved for active orders" icon={ClipboardList} tone="orange" />
    </div>
    {showCreate && <form className="panel create-resource-form" onSubmit={createOtherItem}>
      <div className="panel-heading"><div><h3>New Stash-only Item</h3><p>The category is automatically set to Other. This item will not appear in catalog inventory management or the catalog/order page.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={17} /></button></div>
      <div className="form-grid">
        <label>Item Name<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Example: Storage supplies" /></label>
        <label>SKU / unique code<input required minLength={2} maxLength={40} value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value.toUpperCase() })} placeholder="OTH-001" /></label>
        <label>Unit<input required maxLength={24} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="unit / pcs / pack" /></label>
        <label>Initial Stock<input required type="number" min="0" max="1000000" step="1" value={draft.initialStock} onChange={(event) => setDraft({ ...draft, initialStock: event.target.value })} /></label>
        <label className="span-two">Description<input maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Item details (optional)" /></label>
      </div>
      <div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={busy}>Save to Stash</button></div>
    </form>}
    <div className="panel">
      <div className="panel-heading">
        <div><h3>Stash Contents</h3><p>Catalog items use the same Resource stock without creating duplicate inventory.</p></div>
        <div className="filter-select compact"><SlidersHorizontal size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All categories</option>{STASH_CATEGORIES.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}</select><ChevronDown size={14} /></div>
      </div>
      <div className="catalog-toolbar stash-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item name or SKU..." /></div></div>
      {visible.length ? <>
        <div className="resource-grid stash-resource-grid">{visible.map((resource) => {
          const itemTotal = Number(resource.stockTotal ?? (Number(resource.stockAvailable || 0) + Number(resource.stockReserved || 0)));
          const statusText = !resource.isActive ? 'Inactive' : itemTotal > 0 ? 'In stock' : 'Out of stock';
          const statusClass = resource.isActive && itemTotal > 0 ? 'in-stock' : 'out-stock';
          return <article className="resource-card stash-resource-card" key={resource.id}>
            <div className={`resource-art ${resource.category.toLowerCase()} ${resource.imageUrl ? 'with-photo' : ''}`}>
              {resource.imageUrl && <img className="resource-art-photo" src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" decoding="async" />}
              <div className="resource-art-grid" />
              <span>{categoryLabel(resource.category)}</span>
              {!resource.imageUrl && <div className="resource-art-icon"><Package size={30} /></div>}
              <small>{resource.sku}</small>
            </div>
            <div className="resource-card-body">
              <div className="resource-name-row"><h3>{resource.name}</h3><span className={`stock-tag ${statusClass}`}>{statusText}</span></div>
              <p>{resource.description || 'No description available for this item.'}</p>
              <div className="resource-meta"><span>Total in stash</span><strong>{number(itemTotal)} {resource.unit}</strong></div>
              <div className="resource-meta"><span>Available stock</span><strong>{number(resource.stockAvailable)} {resource.unit}</strong></div>
              <div className="resource-meta"><span>Reserved</span><strong>{number(resource.stockReserved)} {resource.unit}</strong></div>
              <div className="resource-action"><button className="button button-outline button-full" disabled={busy} onClick={() => onStock(resource)}><SlidersHorizontal size={14} /> Adjust Stock</button></div>
            </div>
          </article>;
        })}</div>
        <DataPagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </> : <EmptyState icon={Archive} title="No items found" detail={resources.length ? 'Try changing the search term or category.' : 'There are no items in the stash yet. Add a stash-only item using the Add Stash Item button.'} />}
    </div>
  </>;
}

function Reports({ reports }) {
  if (!reports) return <div className="panel loading-panel">Loading reports...</div>;
  const summary = reports.summary;
  const categories = Object.entries(reports.categories || {});
  return <>
    <SectionHeader eyebrow="ANALYTICS & REPORTS" title="Transaction Reports" description="A summary of quantities and amounts based on completed, approved, and pending orders." action={<div className="date-chip"><FileText size={15} /> Overall Summary</div>} />
    <div className="stats-grid">
      <StatCard label="Completed Amount" value={money(summary.completedAmount)} detail={`${number(summary.completedQuantity)} unit · Completed`} icon={CircleDollarSign} tone="green" />
      <StatCard label="Reserved Value" value={money(summary.reservedAmount)} detail={`${number(summary.reservedQuantity)} unit · Approved`} icon={Package} tone="blue" />
      <StatCard label="Pending Value" value={money(summary.pendingAmount)} detail={`${number(summary.pendingQuantity)} unit · Pending`} icon={Clock3} tone="orange" />
      <StatCard label="Total Orders" value={number(summary.totalOrders)} detail={`${number(summary.totalUsers)} user · ${number(summary.activeResources)} resource aktif`} icon={ClipboardList} tone="purple" />
    </div>
    <div className="dashboard-grid reports-grid"><div className="panel"><div className="panel-heading"><div><h3>Sales by Category</h3><p>Completed orders only</p></div></div>{categories.length ? <div className="table-wrap"><table><thead><tr><th>Category</th><th>Quantity Sold</th><th>Nominal</th></tr></thead><tbody>{categories.map(([category, values]) => <tr key={category}><td className="strong-cell">{categoryLabel(category)}</td><td>{number(values.quantity)} unit</td><td>{money(values.amount)}</td></tr>)}</tbody></table></div> : <EmptyState title="No completed sales yet" detail="Category reports will appear once orders are completed." />}</div>
      <div className="panel"><div className="panel-heading"><div><h3>Top Resources</h3><p>Based on completed order quantities</p></div></div>{reports.topResources?.length ? <div className="compact-list">{reports.topResources.map((item, i) => <div className="compact-row" key={item.resourceId}><div className="rank-number">{String(i + 1).padStart(2, '0')}</div><div className="compact-main"><strong>{item.name}</strong><span>{number(item.quantity)} units sold</span></div><div className="compact-side"><strong>{money(item.amount)}</strong></div></div>)}</div> : <EmptyState title="No data yet" detail="Top Resources akan muncul di sini." />}</div></div>
    <div className="panel status-report"><div className="panel-heading"><div><h3>Order Status</h3><p>Number of orders at each stage</p></div></div><div className="status-summary">{[['PENDING','Pending',summary.pendingOrders],['APPROVED','Approved',summary.approvedOrders],['COMPLETED','Completed',summary.completedOrders],['REJECTED','Rejected',summary.rejectedOrders],['CANCELLED','Cancelled',summary.cancelledOrders]].map(([key, label, value]) => <div key={key}><StatusPill status={key} /><strong>{number(value)}</strong><span>{label}</span></div>)}</div></div>
  </>;
}

function UsersPage({ users, onCreate, onToggle, onDelete, onApprove, onRankChange, onRoleChange, currentUserId, busy }) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ username: '', email: '', password: '', rank: 'HANGAROUND' });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const pageSize = 25;
  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    const status = user.registrationStatus === 'PENDING' ? 'PENDING' : user.registrationStatus === 'REJECTED' ? 'REJECTED' : user.isActive ? 'ACTIVE' : 'INACTIVE';
    return matchesSearch && (statusFilter === 'ALL' || status === statusFilter) && (roleFilter === 'ALL' || user.role === roleFilter);
  });
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, statusFilter, roleFilter, users]);
  async function submit(event) {
    event.preventDefault();
    const created = await onCreate(draft);
    if (created) { setDraft({ username: '', email: '', password: '', rank: 'HANGAROUND' }); setShowCreate(false); }
  }
  function statusText(user) {
    if (user.registrationStatus === 'PENDING') return 'Pending';
    if (user.registrationStatus === 'REJECTED') return 'Rejected';
    return user.isActive ? 'Active' : 'Inactive';
  }
  function statusClass(user) {
    if (user.registrationStatus === 'PENDING' || user.registrationStatus === 'REJECTED' || !user.isActive) return 'out-stock';
    return 'in-stock';
  }
  function rankLabel(rank) { return MEMBER_RANKS.find((item) => item.value === rank)?.label || 'Hangaround'; }
  return <>
    <SectionHeader eyebrow="MEMBER MANAGEMENT" title="Members" description="Accounts, ranks, and access." action={<button className="button button-primary" onClick={() => setShowCreate((value) => !value)}><UserPlus size={16} /> New member</button>} />
    {users.some((user) => user.registrationStatus === 'PENDING') && <div className="notice warning"><Clock3 size={17}/><span>{number(users.filter((user) => user.registrationStatus === 'PENDING').length)} pendaftaran menunggu persetujuan.</span></div>}
    {showCreate && <form className="panel create-resource-form" onSubmit={submit}>
      <div className="panel-heading"><div><h3>New member</h3><p>New accounts are activated immediately with the initial rank set to Hangaround.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}><X size={17} /></button></div>
      <div className="form-grid user-create-grid">
        <label>Username<input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="username" /></label>
        <label>Email<input required type="email" maxLength={150} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="email@domain.com" /></label>
        <label>Initial Password<input required type="password" minLength={12} maxLength={100} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="At least 12 characters" autoComplete="new-password" /></label>
        <label>Initial Rank<select value={draft.rank} onChange={(event) => setDraft({ ...draft, rank: event.target.value })}>{MEMBER_RANKS.map((rank) => <option key={rank.value} value={rank.value}>{rank.label}</option>)}</select></label>
      </div>
      <div className="form-footer"><button type="button" className="button button-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="button button-primary" disabled={busy}><UserPlus size={15}/> Create member</button></div>
    </form>}
    <div className="panel members-panel">
      <div className="members-toolbar">
        <label className="members-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or username" /></label>
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Any status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option></select>
        <select aria-label="Filter role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="ALL">Any role</option><option value="ADMIN">Super Admin</option><option value="USER">Member</option></select>
      </div>
      {filteredUsers.length ? <>
        <div className="table-wrap members-table-wrap"><table className="members-table"><thead><tr><th>Member</th><th>Rank</th><th>Role</th><th>Status</th><th>Orders</th><th>Actions</th></tr></thead><tbody>
          {visibleUsers.map((user) => <tr key={user.id}>
            <td><div className="members-name"><span className="avatar-mini">{user.username.slice(0,1).toUpperCase()}</span><strong>{user.username}</strong></div></td>
            <td><select className="rank-select" aria-label={`Rank ${user.username}`} value={user.rank || 'HANGAROUND'} disabled={busy} onChange={(event) => onRankChange(user, event.target.value)}>{MEMBER_RANKS.map((rank) => <option key={rank.value} value={rank.value}>{rank.label}</option>)}</select></td>
            <td><span className={`member-role-pill ${user.role === 'ADMIN' ? 'admin' : 'member'}`}>{user.role === 'ADMIN' ? 'Super Admin' : 'Member'}</span></td>
            <td><span className={`stock-tag ${statusClass(user)}`}>{statusText(user)}</span></td>
            <td className="strong-cell">{number(user._count?.orders || 0)}</td>
            <td><div className="table-actions"><select className="rank-select" aria-label={`Role ${user.username}`} value={user.role} disabled={busy || user.id === currentUserId} onChange={(event) => onRoleChange(user, event.target.value)}><option value="USER">Member</option><option value="ADMIN">Super Admin</option></select>{user.role === 'USER' ? <>{user.registrationStatus === 'PENDING' ? <><button className="button button-small button-primary" disabled={busy} onClick={() => onApprove(user, 'APPROVED')}><Check size={13}/> Approve</button><button className="button button-small button-ghost-danger" disabled={busy} onClick={() => onApprove(user, 'REJECTED')}><X size={13}/> Reject</button></> : user.registrationStatus === 'REJECTED' ? <button className="button button-small button-outline" disabled={busy} onClick={() => onApprove(user, 'APPROVED')}><UserPlus size={13}/> Approve again</button> : <button className={`button button-small ${user.isActive ? 'button-ghost-danger' : 'button-outline'}`} disabled={busy} onClick={() => onToggle(user)}>{user.isActive ? <><UserX size={13}/> Deactivate</> : <><UserPlus size={13}/> Activate</>}</button>}<button className="button button-small button-ghost-danger" disabled={busy} onClick={() => onDelete(user)}><Trash2 size={13}/> Delete</button></> : <span className="muted">{user.id === currentUserId ? 'Your account' : 'Full access'}</span>}</div></td>
          </tr>)}
        </tbody></table></div>
        <div className="members-table-footer"><span>{number(filteredUsers.length ? (page - 1) * pageSize + 1 : 0)}–{number(Math.min(page * pageSize, filteredUsers.length))} of {number(filteredUsers.length)}</span><DataPagination page={page} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} /></div>
      </> : <EmptyState icon={Users} title="No members found" detail="Try changing the search term or filters." />}
    </div>
  </>;
}

function jakartaDateInput(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return '';
  }
}
function todayJakartaInput() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function cashEntryLabel(entry) {
  if (entry.type === 'ADJUSTMENT_IN') return entry.category === 'Balance adjustment' ? 'Balance adjustment (+)' : 'Manual balance increase';
  if (entry.type === 'ADJUSTMENT_OUT') return 'Balance adjustment (-)';
  return ({ OPENING_BALANCE: 'Opening balance', ORDER_INCOME: 'Resource purchase', EXPENSE: 'Gang Expenses' })[entry.type] || entry.type;
}

function FinancePage({ finance, cash, onStartPeriod, onUpdatePeriod, onResetPeriod, onSetOpeningBalance, onAddExpense, onAddCashIncome, onAdjustCash, busy }) {
  const currentPeriod = finance?.currentPeriod;
  const [periodDraft, setPeriodDraft] = useState({ name: 'Spending Period', startDate: todayJakartaInput(), endDate: '' });
  const [openingDraft, setOpeningDraft] = useState('');
  const [expenseDraft, setExpenseDraft] = useState({ amount: '', category: 'Operations', description: '' });
  const [incomeDraft, setIncomeDraft] = useState({ amount: '', category: 'Manual income', description: '' });
  const [adjustmentDraft, setAdjustmentDraft] = useState({ direction: 'OUT', amount: '', description: '' });
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  const [cashPage, setCashPage] = useState(1);
  const cashPageSize = 25;
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
    const typed = window.prompt('The current period will be saved to history and a new period will begin. Lifetime totals will not be deleted. Type RESET PERIOD 30SFAMS to continue:');
    if (typed !== 'RESET PERIOD 30SFAMS') return;
    await onResetPeriod({ confirmation: typed, name: periodDraft.name || 'Periode baru' });
  }
  async function submitOpening(event) {
    event.preventDefault();
    const saved = await onSetOpeningBalance({ amount: Number(openingDraft), description: 'Set opening balance for the 30sFams gang fund' });
    if (saved) setOpeningDraft('');
  }
  async function submitExpense(event) {
    event.preventDefault();
    const saved = await onAddExpense({ ...expenseDraft, amount: Number(expenseDraft.amount) });
    if (saved) setExpenseDraft({ amount: '', category: 'Operations', description: '' });
  }
  async function submitIncome(event) {
    event.preventDefault();
    const saved = await onAddCashIncome({ ...incomeDraft, amount: Number(incomeDraft.amount) });
    if (saved) setIncomeDraft({ amount: '', category: 'Manual income', description: '' });
  }
  async function submitAdjustment(event) {
    event.preventDefault();
    const saved = await onAdjustCash({ ...adjustmentDraft, amount: Number(adjustmentDraft.amount) });
    if (saved) setAdjustmentDraft({ direction: 'OUT', amount: '', description: '' });
  }

  if (!finance || !cash) return <div className="panel loading-panel">Loading financial data...</div>;
  const lifetime = finance.lifetime || {};
  const currentSummary = currentPeriod?.summary || {};
  const cashSummary = cash.summary || {};
  const periods = finance.periods || [];
  const cashEntries = cash.entries || [];
  const visibleCashEntries = cashEntries.filter((entry) => ledgerFilter === 'ALL' || (ledgerFilter === 'IN' ? ['OPENING_BALANCE','ORDER_INCOME','ADJUSTMENT_IN'].includes(entry.type) : ['EXPENSE','ADJUSTMENT_OUT'].includes(entry.type)));
  const cashPageCount = Math.max(1, Math.ceil(visibleCashEntries.length / cashPageSize));
  const safeCashPage = Math.min(cashPage, cashPageCount);
  const visibleCashRows = visibleCashEntries.slice((safeCashPage - 1) * cashPageSize, safeCashPage * cashPageSize);
  useEffect(() => setCashPage(1), [ledgerFilter]);

  return <>
    <SectionHeader eyebrow="FINANCE & GANG FUND" title="Finance & Gang Fund" description="This page is restricted to admins. Spending is calculated from Completed orders; the cash balance is calculated from the cash ledger." action={<div className="date-chip"><ShieldCheck size={15}/> Admin only</div>} />
    <div className="stats-grid finance-stats-grid">
      <StatCard label="Lifetime Spending" value={money(lifetime.totalAmount)} detail={`${number(lifetime.completedOrders)} completed orders · ${number(lifetime.totalQuantity)} unit`} icon={ChartNoAxesCombined} tone="purple" />
      <StatCard label="Current Period Spending" value={money(currentSummary.totalAmount)} detail={`${number(currentSummary.completedOrders)} completed orders`} icon={CalendarDays} tone="blue" />
      <StatCard label="Gang Fund Balance" value={money(cashSummary.balance)} detail="Current balance based on the cash ledger" icon={Wallet} tone="green" />
      <StatCard label="Total Gang Expenses" value={money(cashSummary.expenses)} detail="Expenses recorded by admins" icon={ArrowDownToLine} tone="orange" />
    </div>

    <div className="finance-grid">
      <section className="panel finance-panel">
        <div className="panel-heading"><div><h3>Spending Period</h3><p>Set the start and end dates. Resetting starts a new period without deleting lifetime totals.</p></div><CalendarDays size={19}/></div>
        <form className="finance-form" onSubmit={savePeriod}>
          <div className="form-grid finance-period-grid">
            <label>Period Name<input required minLength={3} maxLength={80} value={periodDraft.name} onChange={(event) => setPeriodDraft({ ...periodDraft, name: event.target.value })} placeholder="Example: November 2026" /></label>
            <label>Start Date<input required type="date" value={periodDraft.startDate} onChange={(event) => setPeriodDraft({ ...periodDraft, startDate: event.target.value })} /></label>
            <label>End Date <small>(leave blank for no end date)</small><input type="date" value={periodDraft.endDate} min={periodDraft.startDate} onChange={(event) => setPeriodDraft({ ...periodDraft, endDate: event.target.value })} /></label>
          </div>
          <div className="finance-actions"><button className="button button-primary" disabled={busy}><Check size={15}/>{currentPeriod ? 'Save Period Range' : 'Create First Period'}</button>{currentPeriod && <button type="button" className="button button-ghost-danger" disabled={busy} onClick={resetPeriod}><RotateCcw size={15}/> Reset to New Period</button>}</div>
        </form>
        <div className="finance-period-summary">
          <div><span>Current Period</span><strong>{currentPeriod ? currentPeriod.name : 'Not configured'}</strong></div>
          <div><span>Period Total</span><strong>{money(currentSummary.totalAmount)}</strong></div>
          <div><span>Resource Quantity</span><strong>{number(currentSummary.totalQuantity || 0)} unit</strong></div>
        </div>
        <div className="panel-subheading"><h4>Period History</h4><small>Resetting only closes the period; previous transactions remain saved.</small></div>
        {periods.length ? <div className="table-wrap"><table><thead><tr><th>Period</th><th>Date Range</th><th>Orders</th><th>Total</th><th>Status</th></tr></thead><tbody>{periods.map((period) => <tr key={period.id}><td className="strong-cell">{period.name}</td><td>{dateTime(period.startAt)} – {period.endAt ? dateTime(period.endAt) : 'In Progress'}</td><td>{number(period.summary?.completedOrders || 0)}</td><td>{money(period.summary?.totalAmount || 0)}</td><td><span className={`stock-tag ${period.isCurrent ? 'in-stock' : 'out-stock'}`}>{period.isCurrent ? 'Active' : 'Archived'}</span></td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No periods yet" detail="Set the date range above to start tracking period spending." />}
      </section>

      <section className="panel finance-panel">
        <div className="panel-heading"><div><h3>30sFams Gang Fund</h3><p>Only admins can view and manage this cash ledger.</p></div><Wallet size={19}/></div>
        <div className="cash-balance-card"><span>CURRENT CASH BALANCE</span><strong>{money(cashSummary.balance)}</strong><div><span>Order Income</span><b>{money(cashSummary.orderIncome)}</b></div><div><span>Additional Income & Positive Adjustments</span><b>{money(cashSummary.adjustmentIncome)}</b></div><div><span>Gang Expenses</span><b>{money(cashSummary.expenses)}</b></div><div><span>Negative Balance Adjustments</span><b>{money(cashSummary.adjustmentExpense)}</b></div></div>
        {!cash.initialized ? <form className="finance-form cash-form" onSubmit={submitOpening}>
          <div className="panel-subheading"><h4>Set Opening Cash Balance</h4><small>Enter the actual cash balance when this feature is first used. Once saved, the balance can still be increased or adjusted through new transactions.</small></div>
          <label>Opening Balance (USD)<input required type="number" min="0" step="0.01" value={openingDraft} onChange={(event) => setOpeningDraft(event.target.value)} placeholder="Example: 250.00" /></label>
          <button className="button button-primary" disabled={busy || openingDraft === ''}><Wallet size={15}/> Save Opening Balance</button>
        </form> : <div className="cash-management-forms">
          <form className="finance-form cash-form" onSubmit={submitIncome}>
            <div className="panel-subheading"><h4>Add Cash Balance</h4><small>Record contributions or other income outside resource purchases.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Amount (USD)<input required type="number" min="0.01" step="0.01" value={incomeDraft.amount} onChange={(event) => setIncomeDraft({ ...incomeDraft, amount: event.target.value })} placeholder="Example: 100.00" /></label>
              <label>Category<select value={incomeDraft.category} onChange={(event) => setIncomeDraft({ ...incomeDraft, category: event.target.value })}><option value="Manual income">Manual income</option><option value="Member contribution">Member contribution</option><option value="Donation">Donation</option><option value="Other income">Other income</option></select></label>
              <label className="span-two">Description<input required minLength={3} maxLength={300} value={incomeDraft.description} onChange={(event) => setIncomeDraft({ ...incomeDraft, description: event.target.value })} placeholder="Example: additional gang fund contribution" /></label>
            </div>
            <button className="button button-primary" disabled={busy || !incomeDraft.amount || !incomeDraft.description.trim()}><ArrowUpRight size={15}/> Save Balance Increase</button>
          </form>
          <form className="finance-form cash-form" onSubmit={submitExpense}>
            <div className="panel-subheading"><h4>Gang Expenses</h4><small>Expenses are recorded as new transactions and cannot be deleted.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Amount (USD)<input required type="number" min="0.01" step="0.01" value={expenseDraft.amount} onChange={(event) => setExpenseDraft({ ...expenseDraft, amount: event.target.value })} placeholder="Example: 25.00" /></label>
              <label>Category<select value={expenseDraft.category} onChange={(event) => setExpenseDraft({ ...expenseDraft, category: event.target.value })}><option>Operations</option><option>Event</option><option>Supplies</option><option>Transportation</option><option>Other</option></select></label>
              <label className="span-two">Description<input required minLength={3} maxLength={300} value={expenseDraft.description} onChange={(event) => setExpenseDraft({ ...expenseDraft, description: event.target.value })} placeholder="Example: event operating costs" /></label>
            </div>
            <button className="button button-primary" disabled={busy || !expenseDraft.amount || !expenseDraft.description.trim()}><ArrowDownToLine size={15}/> Save Expense</button>
          </form>
          <form className="finance-form cash-form cash-adjustment-form" onSubmit={submitAdjustment}>
            <div className="panel-subheading"><h4>Cash Balance Adjustment</h4><small>Use this to reconcile the system balance with actual cash. Adjustments do not overwrite previous transactions.</small></div>
            <div className="form-grid cash-expense-grid">
              <label>Adjustment Direction<select value={adjustmentDraft.direction} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, direction: event.target.value })}><option value="OUT">Decrease Balance</option><option value="IN">Increase Balance</option></select></label>
              <label>Amount (USD)<input required type="number" min="0.01" step="0.01" value={adjustmentDraft.amount} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, amount: event.target.value })} placeholder="Example: 15.00" /></label>
              <label className="span-two">Adjustment Reason<input required minLength={3} maxLength={300} value={adjustmentDraft.description} onChange={(event) => setAdjustmentDraft({ ...adjustmentDraft, description: event.target.value })} placeholder="Example: adjustment after cash audit" /></label>
            </div>
            <button className="button button-outline" disabled={busy || !adjustmentDraft.amount || !adjustmentDraft.description.trim()}><SlidersHorizontal size={15}/> Save Balance Adjustment</button>
          </form>
        </div>}
        <div className="panel-subheading cash-history-heading"><div><h4>Income & Expense History</h4><small>Purchase income is recorded automatically when an order is marked Completed.</small></div><div className="header-actions"><div className="filter-select compact"><select value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value)}><option value="ALL">All</option><option value="IN">Income</option><option value="OUT">Expenses</option></select><ChevronDown size={14}/></div><button type="button" className="button button-outline button-small" onClick={() => exportCashEntries(visibleCashEntries)} disabled={!visibleCashEntries.length}><ArrowDownToLine size={14}/> Export CSV</button></div></div>
        {visibleCashEntries.length ? <div className="cash-ledger-list">{visibleCashRows.map((entry) => {
          const positive = ['OPENING_BALANCE', 'ORDER_INCOME', 'ADJUSTMENT_IN'].includes(entry.type);
          return <div className="cash-ledger-row" key={entry.id}><div className={`cash-ledger-icon ${positive ? 'income' : 'expense'}`}>{positive ? <ArrowUpRight size={16}/> : <ArrowDownToLine size={16}/>}</div><div className="cash-ledger-main"><strong>{cashEntryLabel(entry)}</strong><span>{entry.description}</span><small>{{ Operasional: "Operations", "Manual income": "Manual income", "Member contribution": "Member contribution", Donation: "Donation", "Other income": "Other income", Perlengkapan: "Supplies", Transportasi: "Transportation", Lainnya: "Other" }[entry.category] || entry.category}{entry.order?.orderNumber ? ` · ${entry.order.orderNumber} · ${entry.order.user?.username || ''}` : ''}</small><small>{dateTime(entry.createdAt)} · {entry.createdBy?.username || 'System'}</small></div><strong className={positive ? 'cash-positive' : 'cash-negative'}>{positive ? '+' : '−'}{money(entry.amount)}</strong></div>;
        })}</div> : <EmptyState icon={Wallet} title="No Records" detail={ledgerFilter === 'ALL' ? 'Set an opening balance to start tracking gang income and expenses.' : 'No transactions match this filter.'} />}
        {visibleCashEntries.length > cashPageSize && <DataPagination page={safeCashPage} pageSize={cashPageSize} total={visibleCashEntries.length} onPageChange={setCashPage} />}
      </section>
    </div>
    <div className="finance-footnote"><ShieldCheck size={15}/><span>{cash.note} Lifetime Spending dihitung dari semua completed orders dan tidak pernah dihapus saat periode di-reset.</span></div>
  </>;
}

function FavoritesPage({ resources, favoriteIds, onToggleFavorite, cart, setCart, busy }) {
  const [page, setPage] = useState(1);
  const pageSize = 18;
  const favorites = resources.filter((resource) => favoriteIds.includes(resource.id));
  const visibleFavorites = favorites.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [resources, favoriteIds]);
  function addToCart(resource) {
    setCart((current) => ({ ...current, [resource.id]: Math.min((current[resource.id] || 0) + 1, resource.stockAvailable) }));
  }
  return <>
    <SectionHeader eyebrow="SAVED RESOURCES" title="Favorite Resources" description="Save frequently ordered items for faster access." />
    {favorites.length ? <><div className="resource-grid">{visibleFavorites.map((resource) => <article className="resource-card" key={resource.id}>
      <div className={`resource-art ${resource.category.toLowerCase()} ${resource.imageUrl ? 'with-photo' : ''}`}>
        {resource.imageUrl && <img className="resource-art-photo" src={assetUrl(resource.imageUrl)} alt={resource.name} loading="lazy" decoding="async" />}
        <div className="resource-art-grid"/><span>{categoryLabel(resource.category)}</span>{!resource.imageUrl && <div className="resource-art-icon"><Package size={30}/></div>}<small>{resource.sku}</small>
      </div>
      <div className="resource-card-body"><div className="resource-name-row"><h3>{resource.name}</h3><button type="button" className="favorite-toggle active" onClick={() => onToggleFavorite(resource)} title="Delete favorit"><Star size={16} fill="currentColor"/></button></div>
        <p>{resource.description || 'No description.'}</p><div className="resource-meta"><span>Price / {resource.unit}</span><strong>{money(resource.unitPrice)}</strong></div><div className="resource-meta"><span>Available stock</span><strong>{number(resource.stockAvailable)} {resource.unit}</strong></div>
        <button className="button button-primary button-full" disabled={busy || resource.stockAvailable <= 0 || (cart[resource.id] || 0) >= resource.stockAvailable} onClick={() => addToCart(resource)}><ShoppingCart size={15}/> Add to Cart</button>
      </div>
    </article>)}</div><DataPagination page={page} pageSize={pageSize} total={favorites.length} onPageChange={setPage} /></> : <div className="panel"><EmptyState icon={Star} title="No favorite resources yet" detail="Open the catalog and select the star icon on any resource you want to save."/></div>}
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
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const filtered = movements.filter((movement) => type === 'ALL' || movement.type === type);
  const visibleMovements = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [type, movements]);
  const labels = { RESTOCK: 'Stock In', ADJUSTMENT: 'Stock Adjustment', RESERVED: 'Reserved', RELEASED: 'Reservation Released', COMPLETED: 'Handed Over' };
  function exportMovements() {
    const rows = filtered.map((m) => [dateTime(m.createdAt), m.resource?.name, m.resource?.sku, labels[m.type] || m.type, m.quantity, m.resource?.unit, m.order?.orderNumber, m.user?.username || 'System', m.note]);
    downloadCsv(`30sFams-stock-movements-${new Date().toISOString().slice(0,10)}.csv`, ['Date & Time', 'Resource', 'SKU', 'Activity', 'Quantity', 'Unit', 'Order Number', 'Performed By', 'Notes'], rows);
  }
  return <>
    <SectionHeader eyebrow="INVENTORY AUDIT TRAIL" title="Stock Movement History" description="All restocks, adjustments, reservations, released reservations, and resource handovers are recorded here." action={<div className="header-actions"><div className="filter-select compact"><SlidersHorizontal size={15}/><select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">All Activities</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={14}/></div><button className="button button-outline button-small" onClick={exportMovements} disabled={!filtered.length}><ArrowDownToLine size={14}/> Export CSV</button></div>} />
    <div className="panel"><div className="panel-heading"><div><h3>Stock Ledger</h3><p>{number(filtered.length)} latest records · maximum 200 records</p></div><History size={19}/></div>
      {filtered.length ? <><div className="table-wrap"><table><thead><tr><th>Date & Time</th><th>Resource</th><th>Activity</th><th>Quantity</th><th>Order number</th><th>Performed By</th><th>Notes</th></tr></thead><tbody>{visibleMovements.map((movement) => <tr key={movement.id}><td>{dateTime(movement.createdAt)}</td><td><strong>{movement.resource?.name || 'Resource'}</strong><small className="cell-sub">{movement.resource?.sku || ''}</small></td><td><span className={`stock-tag ${['RESTOCK','RELEASED'].includes(movement.type) ? 'in-stock' : movement.type === 'ADJUSTMENT' ? 'out-stock' : 'reserved'}`}>{labels[movement.type] || movement.type}</span></td><td className="strong-cell">{number(movement.quantity)} {movement.resource?.unit || 'unit'}</td><td>{movement.order?.orderNumber || '—'}</td><td>{movement.user?.username || 'System'}</td><td>{movement.note || '—'}</td></tr>)}</tbody></table></div><DataPagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} /></> : <EmptyState icon={History} title="No stock records yet" detail="Activity inventory akan tercatat saat stok dibuat, disesuaikan, dicadangkan, dikembalikan, atau diserahkan."/>}
    </div>
  </>;
}

function MemberStatsPage({ data }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  useEffect(() => setPage(1), [data?.members]);
  if (!data) return <div className="panel loading-panel">Loading member statistics...</div>;
  const summary = data.summary || {};
  const members = data.members || [];
  const visibleMembers = members.slice((page - 1) * pageSize, page * pageSize);
  function exportMembers() {
    const rows = members.map((m) => [m.username, m.email, m.deletedAt ? 'Deleted' : m.isActive ? 'Active' : 'Inactive', m.registrationStatus, m.completedOrders, m.completedQuantity, m.totalSpend, m.pendingOrders, m.approvedOrders, m.lastCompletedAt ? dateTime(m.lastCompletedAt) : '']);
    downloadCsv(`30sFams-member-statistics-${new Date().toISOString().slice(0,10)}.csv`, ['Username', 'Email', 'Account Status', 'Registration Status', 'Completed Orders', 'Total Quantity', 'Total Spending (USD)', 'Pending', 'Approved', 'Last Purchase'], rows);
  }
  return <>
    <SectionHeader eyebrow="MEMBER INSIGHTS" title="Member Statistics" description="Track each member’s ordering activity based on completed orders." action={<div className="header-actions"><div className="date-chip"><ShieldCheck size={15}/> Admin only</div><button className="button button-outline button-small" onClick={exportMembers} disabled={!members.length}><ArrowDownToLine size={14}/> Export CSV</button></div>} />
    <div className="stats-grid"><StatCard label="Total Members" value={number(summary.totalMembers)} detail={`${number(summary.activeMembers)} active accounts`} icon={Users} tone="blue"/><StatCard label="Awaiting Activation" value={number(summary.pendingRegistrations)} detail="New registrations" icon={Clock3} tone="orange"/><StatCard label="Completed Orders" value={number(summary.completedOrders)} detail={`${number(summary.completedQuantity)} unit`} icon={Package} tone="green"/><StatCard label="Total Spending" value={money(summary.completedAmount)} detail="All members combined" icon={CircleDollarSign} tone="purple"/></div>
    <div className="panel"><div className="panel-heading"><div><h3>Member Purchase Activity</h3><p>Sorted by highest completed spending.</p></div><Users size={19}/></div>
      {members.length ? <><div className="table-wrap"><table><thead><tr><th>Anggota</th><th>Account Status</th><th>Completed Orders</th><th>Total Quantity</th><th>Total Spending</th><th>Active Orders</th><th>Last Purchase</th></tr></thead><tbody>{visibleMembers.map((member) => <tr key={member.id}><td><strong>{member.username}</strong><small className="cell-sub">{member.email}</small></td><td><span className={`stock-tag ${!member.deletedAt && member.isActive && member.registrationStatus === 'APPROVED' ? 'in-stock' : 'out-stock'}`}>{member.deletedAt ? 'Deleted' : member.registrationStatus === 'PENDING' ? 'Pending' : member.registrationStatus === 'REJECTED' ? 'Rejected' : member.isActive ? 'Active' : 'Inactive'}</span></td><td>{number(member.completedOrders)}</td><td>{number(member.completedQuantity)} unit</td><td className="strong-cell">{money(member.totalSpend)}</td><td>{number(member.pendingOrders)} Pending · {number(member.approvedOrders)} Approved</td><td>{member.lastCompletedAt ? dateTime(member.lastCompletedAt) : 'None yet'}</td></tr>)}</tbody></table></div><DataPagination page={page} pageSize={pageSize} total={members.length} onPageChange={setPage} /></> : <EmptyState icon={Users} title="No members yet" detail="Registered members will appear here."/>}
    </div>
  </>;
}

function exportCashEntries(entries) {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (USD)', 'Admin Username', 'Order Number'];
  const typeLabel = { OPENING_BALANCE: 'Opening balance', ORDER_INCOME: 'Order Income', ADJUSTMENT_IN: 'Income / positive adjustment', EXPENSE: 'Expenses', ADJUSTMENT_OUT: 'Negative adjustment' };
  const rows = entries.map((entry) => [new Date(entry.createdAt).toLocaleString('en-US'), typeLabel[entry.type] || entry.type, entry.category, entry.description, entry.amount, entry.createdBy?.username || 'System', entry.order?.orderNumber || '']);
  const safe = (value) => { let text = String(value ?? ''); if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(safe).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = `30sFams-cash-ledger-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

const MANUAL_NOTE_CATEGORIES = [
  { value: 'UMUM', label: 'General' },
  { value: 'OPERASIONAL', label: 'Operations' },
  { value: 'STOK', label: 'Stock' },
  { value: 'PESANAN', label: 'Orders' },
  { value: 'PENGUMUMAN', label: 'Announcements' },
  { value: 'LAINNYA', label: 'Other' },
];

function ManualNotesPage({ notes = [], onSave, onDelete, busy }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyDraft = { title: '', category: 'UMUM', content: '' };
  const [draft, setDraft] = useState(emptyDraft);
  const pageSize = 12;

  const filtered = notes.filter((note) => {
    const matchesCategory = filter === 'ALL' || note.category === filter;
    const searchable = `${note.title || ''} ${note.content || ''} ${note.createdBy?.username || ''}`.toLowerCase();
    return matchesCategory && searchable.includes(search.toLowerCase());
  });
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, filter, notes]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setShowForm(true);
  }

  function openEdit(note) {
    setEditingId(note.id);
    setDraft({ title: note.title || '', category: note.category || 'UMUM', content: note.content || '' });
    setShowForm(true);
  }

  async function submit(event) {
    event.preventDefault();
    const saved = await onSave({
      title: draft.title.trim(),
      category: draft.category,
      content: draft.content.trim(),
    }, editingId);
    if (saved) {
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft);
    }
  }

  return <>
    <SectionHeader
      eyebrow="ADMIN NOTES & RECORDS"
      title="Notes Log"
      description="Manual notes for operations, stock, orders, announcements, and other important information."
      action={<button className="button button-primary" onClick={openCreate}><FileText size={16} /> Add Note</button>}
    />

    {showForm && <form className="panel create-resource-form manual-note-form" onSubmit={submit}>
      <div className="panel-heading">
        <div><h3>{editingId ? 'Edit Note' : 'New Note'}</h3><p>These notes are visible to and managed by Super Admins only.</p></div>
        <button type="button" className="icon-button" disabled={busy} onClick={() => { setShowForm(false); setEditingId(null); }} aria-label="Close"><X size={17} /></button>
      </div>
      <div className="form-grid manual-note-fields">
        <label>Note Title<input required minLength={3} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Example: This week’s operations notes" /></label>
        <label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{MANUAL_NOTE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="span-two">Note Content<textarea required maxLength={20000} rows={7} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Write your notes in detail here..." /></label>
      </div>
      <div className="form-footer">
        <button type="button" className="button button-ghost" disabled={busy} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
        <button className="button button-primary" disabled={busy || draft.title.trim().length < 3 || !draft.content.trim()}><Check size={15} /> {busy ? 'Saving...' : editingId ? 'Save Changes' : 'Save Note'}</button>
      </div>
    </form>}

    <div className="panel manual-notes-panel">
      <div className="panel-heading">
        <div><h3>Notes List</h3><p>{number(filtered.length)} notes found · {number(notes.length)} saved in total</p></div>
        <div className="filter-select compact"><SlidersHorizontal size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All categories</option>{MANUAL_NOTE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={14} /></div>
      </div>
      <div className="catalog-toolbar manual-notes-toolbar">
        <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search note title, content, or author..." /></div>
      </div>
      {visible.length ? <>
        <div className="manual-notes-grid">{visible.map((note) => {
          const categoryLabelText = MANUAL_NOTE_CATEGORIES.find((item) => item.value === note.category)?.label || note.category;
          const updated = note.updatedAt && note.createdAt && new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000;
          return <article className="manual-note-card" key={note.id}>
            <div className="manual-note-card-top"><span className="manual-note-category">{categoryLabelText}</span><time>{dateTime(note.createdAt)}</time></div>
            <h3>{note.title}</h3>
            <p className="manual-note-content">{note.content}</p>
            <div className="manual-note-meta"><span>By <strong>{note.createdBy?.username || 'Deleted Account'}</strong></span>{updated && <span>Updated {dateTime(note.updatedAt)}</span>}</div>
            <div className="manual-note-actions">
              <button className="button button-small button-outline" disabled={busy} onClick={() => openEdit(note)}><Pencil size={13} /> Edit</button>
              <button className="action-button reject" disabled={busy} onClick={() => onDelete(note)} title="Delete Note"><Trash2 size={14} /></button>
            </div>
          </article>;
        })}</div>
        <DataPagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </> : <EmptyState icon={FileText} title="No notes yet" detail={notes.length ? 'No records match this search or category.' : 'Add your first manual note to start documenting operational information.'} />}
    </div>
  </>;
}

function ActivityPage({ logs, discordStatus, onTestDiscord, busy }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const visibleLogs = logs.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [logs]);
  return <>
    <SectionHeader eyebrow="AUDIT TRAIL & INTEGRATIONS" title="Activity admin" description="A record of resource changes, stock movements, order status updates, and integration tests." action={<button className="button button-outline" disabled={busy || !discordStatus?.configured} onClick={onTestDiscord}><Bell size={15}/> Test Discord</button>} />
    <div className="panel integration-status-panel"><div className="panel-heading"><div><h3>Discord Integration</h3><p>The webhook URL is stored in backend/.env and is never displayed in the browser.</p></div><div className={`stock-tag ${discordStatus?.configured ? 'in-stock' : 'out-stock'}`}>{discordStatus?.configured ? 'Webhook Configured' : 'Not Configured'}</div></div><p className="muted-copy">{discordStatus?.message || 'Checking Discord configuration...'}</p><small>To enable this integration, set DISCORD_WEBHOOK_URL in backend/.env and restart the backend. Use a private Discord channel accessible only to authorized staff.</small></div>
    <div className="panel">{logs.length ? <><div className="activity-list">{visibleLogs.map((log) => <div className="activity-row" key={log.id}><div className="activity-icon"><Activity size={17} /></div><div className="activity-content"><strong>{log.detail}</strong><span>{log.user?.username || 'System'} · {log.action}</span></div><time>{dateTime(log.createdAt)}</time></div>)}</div><DataPagination page={page} pageSize={pageSize} total={logs.length} onPageChange={setPage} /></> : <EmptyState icon={Activity} title="No activity yet" detail="Admin activity will be recorded here." />}</div>
  </>;
}

const adminNav = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { key: 'catalog', label: 'Catalog & Orders', icon: ShoppingCart, group: 'WORKSPACE' },
  { key: 'my-orders', label: 'Orders saya', icon: ClipboardList, group: 'WORKSPACE' },
  { key: 'inventory', label: 'Inventory Management', icon: Boxes, group: 'WORKSPACE' },
  { key: 'stash', label: 'Stash', icon: Archive, group: 'WORKSPACE' },
  { key: 'stock-history', label: 'Stock History', icon: History, group: 'WORKSPACE' },
  { key: 'notes', label: 'Notes Log', icon: FileText, group: 'WORKSPACE' },
  { key: 'admin-orders', label: 'All Orders', icon: ClipboardList, group: 'WORKSPACE' },
  { key: 'archived-orders', label: 'Archived Orders', icon: Archive, group: 'WORKSPACE' },
  { key: 'reports', label: 'Transaction Reports', icon: ChartNoAxesCombined, group: 'INSIGHTS' },
  { key: 'finance', label: 'Finance & Gang Fund', icon: Wallet, group: 'INSIGHTS' },
  { key: 'users', label: 'Members', icon: Users, group: 'INSIGHTS' },
  { key: 'member-stats', label: 'Member Statistics', icon: ChartNoAxesCombined, group: 'INSIGHTS' },
  { key: 'activity', label: 'Activity admin', icon: Activity, group: 'INSIGHTS' },
];
const userNav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'MAIN MENU' },
  { key: 'catalog', label: 'Resource Catalog', icon: Boxes, group: 'MAIN MENU' },
  { key: 'favorites', label: 'Favorite Resources', icon: Star, group: 'MAIN MENU' },
  { key: 'my-orders', label: 'Orders saya', icon: ClipboardList, group: 'MAIN MENU' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [page, setPageState] = useState(readPageFromUrl);
  const pageRef = useRef(page);
  pageRef.current = page;
  const setPage = useCallback((nextPage) => {
    const target = typeof nextPage === 'function' ? nextPage(pageRef.current) : nextPage;
    pageRef.current = target;
    setPageState(target);
    const url = new URL(window.location.href);
    const current = url.searchParams.get('page') || 'dashboard';
    if (current === target) return;
    if (target === 'dashboard') url.searchParams.delete('page');
    else url.searchParams.set('page', target);
    window.history.pushState({ page: target }, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageLoadError, setPageLoadError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [resources, setResources] = useState([]); // Catalog resources (and member dashboard data).
  const [inventoryResources, setInventoryResources] = useState([]);
  const [stashResources, setStashResources] = useState([]);
  const [orders, setOrders] = useState([]); // Member orders / Super Admin all-orders page.
  const [adminMyOrders, setAdminMyOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [reports, setReports] = useState(null);
  const [finance, setFinance] = useState(null);
  const [cash, setCash] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [memberStats, setMemberStats] = useState(null);
  const [stockMovements, setStockMovements] = useState([]);
  const [manualNotes, setManualNotes] = useState([]);
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
  const [detailLoading, setDetailsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
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
    // Keep recently loaded pages in memory longer so navigation remains responsive.
    // The active page still receives background sync every minute.
    if (!force && cachedAt && Date.now() - cachedAt < 300000) {
      if (activePageKeyRef.current === cacheKey) setPageLoading(false);
      return;
    }
    if (pageRequestsRef.current[cacheKey]) return pageRequestsRef.current[cacheKey];

    if (activePageKeyRef.current === cacheKey) {
      setPageLoading(!loadedPagesRef.current.has(cacheKey));
    }
    const task = (async () => {
      if (role === 'ADMIN') {
        switch (targetPage) {
          case 'dashboard': {
            const data = await api('/admin/dashboard');
            setDashboardData(data);
            setOrders(data.recentOrders || []);
            break;
          }
          case 'catalog': {
            const data = await api('/resources');
            setResources(data.resources || []);
            break;
          }
          case 'my-orders': {
            const data = await api('/orders/mine');
            setAdminMyOrders(data.orders || []);
            break;
          }
          case 'inventory': {
            const data = await api('/resources?all=true');
            setInventoryResources(data.resources || []);
            break;
          }
          case 'stash': {
            const data = await api('/resources/stash');
            setStashResources(data.resources || []);
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
          case 'notes': {
            const data = await api('/admin/notes');
            setManualNotes(data.notes || []);
            break;
          }
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

  async function retryCurrentPage() {
    if (!user) return;
    setPageLoadError(null);
    try {
      await loadPageData(page, user.role, true);
    } catch (error) {
      setPageLoadError({ key: currentPageKey, message: error.message || 'Data halaman gagal dimuat.' });
      setNoticeSafe({ type: 'error', message: error.message || 'Data halaman gagal dimuat.' });
    }
  }

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
    const pageKey = `${user.role}:${user.id}:${page}`;
    setPageLoadError(null);
    loadPageData(page, user.role).catch((error) => {
      setPageLoadError({ key: pageKey, message: error.message || 'Data halaman gagal dimuat.' });
      setNotice({ type: 'error', message: error.message || 'Data halaman gagal dimuat.' });
    });
  }, [user?.id, user?.role, page, loadPageData]);

  useEffect(() => {
    if (!user || !loadedPages[currentPageKey]) return undefined;
    let cancelled = false;
    const commonPages = user.role === 'ADMIN'
      ? ['catalog', 'inventory', 'stash', 'my-orders', 'admin-orders']
      : ['catalog', 'favorites', 'my-orders'];

    const prefetchCommonPages = async () => {
      for (const targetPage of commonPages) {
        if (cancelled) return;
        if (targetPage === page) continue;
        try {
          await loadPageData(targetPage, user.role, false);
        } catch {
          // Prefetch is best-effort; the requested page reports its own loading error.
        }
      }
    };

    const timer = window.setTimeout(prefetchCommonPages, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user?.id, user?.role, page, currentPageKey, loadedPages[currentPageKey], loadPageData]);

  useEffect(() => {
    if (!user) return undefined;
    let syncing = false;
    const syncActivePage = async () => {
      if (document.visibilityState !== 'visible' || syncing) return;
      syncing = true;
      try {
        // Refresh only the page currently open, plus the notification center.
        // loadPageData deduplicates concurrent requests and keeps loaded content visible.
        await Promise.all([
          loadPageData(page, user.role, true),
          refreshNotifications(),
        ]);
      } catch {
        // A temporary polling failure should not interrupt the current screen.
      } finally {
        syncing = false;
      }
    };
    refreshNotifications().catch(() => {});
    const timer = window.setInterval(syncActivePage, AUTO_SYNC_INTERVAL_MS);
    window.addEventListener('focus', syncActivePage);
    document.addEventListener('visibilitychange', syncActivePage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncActivePage);
      document.removeEventListener('visibilitychange', syncActivePage);
    };
  }, [user?.id, user?.role, page, loadPageData, refreshNotifications]);

  const navItems = isAdmin ? adminNav : userNav;
  useEffect(() => {
    const onPopState = () => {
      const nextPage = readPageFromUrl();
      pageRef.current = nextPage;
      setPageState(nextPage);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!navItems.some((item) => item.key === page)) setPage('dashboard');
  }, [user?.id, user?.role, page, navItems, setPage]);
  const pageTitle = useMemo(() => navItems.find((item) => item.key === page)?.label || 'Dashboard', [navItems, page]);
  const setNoticeSafe = (value) => { setNotice(value); if (value) window.setTimeout(() => setNotice(null), 5500); };

  async function openOrderDetails(order) {
    setSelectedOrder(null);
    setDetailsLoading(true);
    try {
      const endpoint = user?.role === 'ADMIN' ? `/admin/orders/${order.id}` : `/orders/${order.id}`;
      const result = await api(endpoint);
      setSelectedOrder(result.order);
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
    } finally {
      setDetailsLoading(false);
    }
  }

  async function signOut() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* local state is still cleared */ }
    pageCacheRef.current = {}; pageRequestsRef.current = {}; loadedPagesRef.current.clear(); setLoadedPages({});
    setUser(null); setResources([]); setInventoryResources([]); setStashResources([]); setOrders([]); setAdminMyOrders([]); setArchivedOrders([]); setManualNotes([]); setNotifications([]); setUnreadCount(0); setFavoriteIds([]); setDiscordStatus(null); setCart({}); setPage('dashboard');
  }

  async function saveManualNote(data, noteId = null) {
    setBusy(true);
    try {
      const result = await api(noteId ? `/admin/notes/${noteId}` : '/admin/notes', {
        method: noteId ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      });
      await refresh();
      setNoticeSafe({ type: 'success', message: noteId ? 'Note updated successfully.' : 'Note saved successfully.' });
      return Boolean(result.note);
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteManualNote(note) {
    if (!window.confirm(`Delete Note "${note.title}"? Catatan yang dihapus tidak dapat dikembalikan.`)) return;
    setBusy(true);
    try {
      await api(`/admin/notes/${note.id}`, { method: 'DELETE' });
      await refresh();
      setNoticeSafe({ type: 'success', message: 'Note deleted successfully.' });
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
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

  async function changeUserRole(userRecord, role) {
    const label = role === 'ADMIN' ? 'Super Admin' : 'Member';
    if (!window.confirm(`Change ${userRecord.username}’s role to ${label}? This account will be signed out.`)) return;
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function changeUserRank(userRecord, rank) {
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}/rank`, { method: 'PATCH', body: JSON.stringify({ rank }) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(userRecord) {
    const confirmed = window.confirm(
      `Delete akun Member "${userRecord.username}"? Akun akan langsung kehilangan akses dan dihapus dari daftar anggota. Riwayat pesanan, stok, dan transaksi tetap disimpan untuk audit. Tindakan ini tidak dapat dibatalkan dari aplikasi.`
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}`, { method: 'DELETE' });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleUser(userRecord) {
    const nextActive = !userRecord.isActive;
    if (!window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} account ${userRecord.username}? ${nextActive ? 'This user will be able to sign in again.' : 'This user will lose access on their next request.'}`)) return;
    setBusy(true);
    try {
      const result = await api(`/admin/users/${userRecord.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) });
      await refresh(); setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }


  async function approveRegistration(userRecord, status) {
    const action = status === 'APPROVED' ? 'menyetujui' : 'menolak';
    if (!window.confirm(`Confirm ${action} registration for ${userRecord.username}?`)) return;
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
    return financeRequest('/admin/finance/spending-periods', 'POST', payload, 'Spending Period dibuat.');
  }
  async function updateSpendingPeriod(payload) {
    return financeRequest('/admin/finance/spending-periods/current', 'PATCH', payload, 'Date Range periode diperbarui.');
  }
  async function resetSpendingPeriod(payload) {
    return financeRequest('/admin/finance/spending-periods/reset', 'POST', payload, 'Spending Period di-reset.');
  }
  async function setCashOpeningBalance(payload) {
    return financeRequest('/admin/finance/cash/opening-balance', 'POST', payload, 'Opening cash balance saved.');
  }
  async function addCashExpense(payload) {
    return financeRequest('/admin/finance/cash/expenses', 'POST', payload, 'Cash expense recorded.');
  }
  async function addCashIncome(payload) {
    return financeRequest('/admin/finance/cash/income', 'POST', payload, 'Cash balance increase recorded.');
  }
  async function adjustCash(payload) {
    return financeRequest('/admin/finance/cash/adjustments', 'POST', payload, 'Cash Balance Adjustment dicatat.');
  }

  async function testDiscord() {
    setBusy(true);
    try {
      const result = await api('/admin/integrations/discord/test', { method: 'POST', body: JSON.stringify({}) });
      await refresh();
      setNoticeSafe({ type: 'success', message: result.message || 'Test Discord berhasil.' });
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
    if (!window.confirm(`Create a new order based on ${order.orderNumber}? Current resource prices will apply and stock availability will be checked again.`)) return;
    setBusy(true);
    try {
      const result = await api(`/orders/${order.id}/reorder`, { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([refresh(), refreshNotifications()]); setPage('my-orders');
      setNoticeSafe({ type: 'success', message: result.message });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function cancelOwnOrder(order, action) {
    if (action !== 'cancel') return;
    if (!window.confirm(`Cancel pesanan ${order.orderNumber}? Stock yang sudah dicadangkan akan dikembalikan ke inventory.`)) return;
    setBusy(true);
    try {
      const result = await api(`/orders/${order.id}/cancel`, { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([refresh(), refreshNotifications()]);
      setNoticeSafe({ type: 'success', message: result.order?.orderNumber ? `Orders ${result.order.orderNumber} berhasil dibatalkan.` : 'Orders berhasil dibatalkan.' });
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function submitOrder(notes = '') {
    const items = Object.entries(cart).map(([resourceId, quantity]) => ({ resourceId, quantity }));
    if (!items.length) return;
    setBusy(true);
    try {
      const result = await api('/orders', { method: 'POST', body: JSON.stringify({ items, notes }) });
      setCart({}); await Promise.all([refresh(), refreshNotifications()]); setPage('my-orders');
      setNoticeSafe({ type: 'success', message: isAdmin ? `${result.order.orderNumber} dibuat atas nama akun Super Admin. Buka Semua Orders untuk meninjau dan memprosesnya.` : `${result.order.orderNumber} was submitted successfully. Awaiting admin approval.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function orderAction(order, action) {
    let adminNotes = '';
    let handoverNote = '';
    const userCancel = !isAdmin && action === 'cancel';
    if (isAdmin && action === 'complete') {
      handoverNote = window.prompt(`Confirm direct handover for ${order.orderNumber}. Handover note (optional):`, '') ?? null;
      if (handoverNote === null) return;
    }
    if (isAdmin && (action === 'reject' || action === 'cancel')) {
      adminNotes = window.prompt(action === 'reject' ? 'Reason for rejection (optional):' : 'Cancellation note (optional):', '') ?? null;
      if (adminNotes === null) return;
    }
    const endpoint = userCancel ? `/orders/${order.id}/cancel` : `/admin/orders/${order.id}/${action}`;
    setBusy(true);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify({ adminNotes, handoverNote }) });
      await Promise.all([refresh(), refreshNotifications()]); setSelectedOrder(null); setNoticeSafe({ type: 'success', message: `Order ${order.orderNumber} updated successfully.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function archiveAllOrders() {
    if (!orders.length) { setNoticeSafe({ type: 'error', message: 'Tidak ada active orders untuk diarsipkan.' }); return; }
    const typed = window.prompt(`You are about to archive ${orders.length} active orders. Order data, invoices, reports, and stock records will be retained.

Type RESET 30SFAMS to continue:`);
    if (typed !== 'RESET 30SFAMS') { if (typed !== null) setNoticeSafe({ type: 'error', message: 'Confirmation did not match. No orders were archived.' }); return; }
    const reason = window.prompt('Archive reason (optional):', 'Penutupan periode pemesanan 30sFams');
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
    if (!window.confirm(`Restore ${order.orderNumber} ke daftar active orders? Status dan stok tidak akan diubah.`)) return;
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
    if (!candidates.length) { setNoticeSafe({ type: 'error', message: 'There are no Pending or Approved orders to cancel.' }); return; }
    const approved = candidates.filter((order) => order.status === 'APPROVED').length;
    const proceed = window.confirm(`Cancel ${candidates.length} active orders?
${approved} Approved orders will return reserved stock to available stock. Completed orders will remain unchanged.`);
    if (!proceed) return;
    const typed = window.prompt('This action will change order statuses and stock. Type CANCEL 30SFAMS to continue:');
    if (typed !== 'CANCEL 30SFAMS') { if (typed !== null) setNoticeSafe({ type: 'error', message: 'Confirmation did not match. No orders were cancelled.' }); return; }
    const reason = window.prompt('Reason for bulk cancellation:', 'Bulk cancellation by admin');
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
    try { await api('/resources', { method: 'POST', body: JSON.stringify(data) }); await refresh(); setNoticeSafe({ type: 'success', message: data.category === 'OTHER' ? 'Item successfully added to Stash.' : 'Resource successfully added to the catalog.' }); return true; }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); return false; }
    finally { setBusy(false); }
  }

  async function adjustStock(resource) {
    const raw = window.prompt(`Available stock saat ini: ${resource.stockAvailable}\nMasukkan perubahan stok. Gunakan angka positif untuk menambah, negatif untuk mengurangi.`, '10');
    if (raw === null) return;
    const delta = Number(raw);
    if (!Number.isInteger(delta) || delta === 0) { setNoticeSafe({ type: 'error', message: 'Enter a non-zero whole number.' }); return; }
    const note = window.prompt('Reason for stock adjustment:', delta > 0 ? 'Restock' : 'Stock adjustment');
    if (note === null || note.trim().length < 3) return;
    setBusy(true);
    try { await api(`/resources/${resource.id}/stock`, { method: 'PATCH', body: JSON.stringify({ delta, note }) }); await refresh(); setNoticeSafe({ type: 'success', message: `Stock ${resource.name} berhasil diperbarui.` }); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  function editResource(resource) {
    setEditingResource(resource);
  }

  async function saveResourceEdits(resourceId, changes) {
    setBusy(true);
    try {
      await api(`/resources/${resourceId}`, { method: 'PATCH', body: JSON.stringify(changes) });
      await refresh();
      setEditingResource(null);
      setNoticeSafe({ type: 'success', message: 'Resource details updated successfully.' });
      return true;
    } catch (error) {
      setNoticeSafe({ type: 'error', message: error.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateResourceImage(resource, file) {
    if (!file.type.startsWith('image/')) { setNoticeSafe({ type: 'error', message: 'Please select a valid image file.' }); return; }
    if (file.size > 5 * 1024 * 1024) { setNoticeSafe({ type: 'error', message: 'Image size must not exceed 5 MB.' }); return; }
    setBusy(true);
    try {
      await uploadFile(`/resources/${resource.id}/image`, file);
      await refresh();
      setNoticeSafe({ type: 'success', message: `Image for ${resource.name} updated successfully.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function removeResourceImage(resource) {
    if (!window.confirm(`Remove Image ${resource.name}?`)) return;
    setBusy(true);
    try {
      await api(`/resources/${resource.id}/image`, { method: 'DELETE' });
      await refresh();
      setNoticeSafe({ type: 'success', message: `Image for ${resource.name} deleted successfully.` });
    } catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  async function toggleResource(resource) {
    const nextActive = !resource.isActive;
    const confirmed = window.confirm(`${nextActive ? 'Activate' : 'Deactivate'} ${resource.name}?`);
    if (!confirmed) return;
    setBusy(true);
    try { await api(`/resources/${resource.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: nextActive }) }); await refresh(); setNoticeSafe({ type: 'success', message: `Resource ${nextActive ? 'activated' : 'deactivated'}.` }); }
    catch (error) { setNoticeSafe({ type: 'error', message: error.message }); }
    finally { setBusy(false); }
  }

  if (booting) return <div className="boot-screen"><BrandLogo className="boot-brand-logo" /><span>Menyiapkan 30sFams Order Portal...</span></div>;
  if (!user) return <><AuthScreen onAuthenticated={(account) => { setUser(account); setPage('dashboard'); }} setNotice={setNoticeSafe} /><Notice notice={notice} clear={() => setNotice(null)} /></>;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-brand"><BrandLogo className="sidebar-brand-logo" /><span>30s<span className="brand-accent">FAMS</span></span><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="workspace-switch"><div className="workspace-avatar"><Command size={17} /></div><div><strong>30sFams Supply</strong><span>Resource order workspace</span></div><ChevronDown size={15} /></div>
      <nav className="sidebar-nav">{[...new Set(navItems.map((item) => item.group))].map((group) => <div className="nav-group" key={group}><div className="nav-caption">{group}</div>{navItems.filter((item) => item.group === group).map((item) => <button key={item.key} className={`nav-link ${page === item.key ? 'active' : ''}`} onClick={() => { setPage(item.key); setMobileNav(false); }}><item.icon size={18} /><span>{item.label}</span>{item.key === 'admin-orders' && orders.filter((order) => order.status === 'PENDING').length > 0 && <em>{orders.filter((order) => order.status === 'PENDING').length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><div className="user-avatar">{user.username.slice(0, 1).toUpperCase()}</div><div className="sidebar-user-info"><strong>{user.username}</strong><span>{isAdmin ? 'Administrator' : 'Member'}</span></div><button className="icon-button" onClick={() => setShowPasswordModal(true)} title="Change password"><KeyRound size={17} /></button><button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={17} /></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumb"><span>30sFams</span><span>/</span><strong>{pageTitle}</strong></div></div><div className="topbar-right"><div className="system-status"><span className="live-dot" /> System operational</div><NotificationCenter notifications={notifications} unreadCount={unreadCount} onReadAll={markAllNotificationsRead} onSelect={selectNotification} /><div className="topbar-divider" /><div className="topbar-profile"><div className="user-avatar small">{user.username.slice(0, 1).toUpperCase()}</div><div><strong>{user.username}</strong><span>{isAdmin ? 'Admin' : 'User'}</span></div></div></div></header>
      <div className="content-area"><Notice notice={notice} clear={() => setNotice(null)} />
        {pageLoadError?.key === currentPageKey ? <div className="panel loading-panel page-load-error"><strong>Page failed to load</strong><p>{pageLoadError.message}</p><button type="button" className="button button-outline" onClick={retryCurrentPage}>Reload Page</button></div> : pageLoading && !loadedPages[currentPageKey] ? <div className="panel loading-panel">Loading page data...</div> : <>
        {pageLoading && loadedPages[currentPageKey] && <div className="page-refresh-indicator" role="status">Refreshing data...</div>}
        {page === 'dashboard' && <Dashboard user={user} resources={isAdmin ? [] : resources} orders={orders} reports={reports} dashboardData={dashboardData} goTo={setPage} />}
        {page === 'catalog' && <Catalog resources={resources} cart={cart} setCart={setCart} search={search} setSearch={setSearch} category={category} setCategory={setCategory} submitOrder={submitOrder} busy={busy} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} showFavorites={!isAdmin} isAdminMode={isAdmin} />}
        {page === 'my-orders' && <><SectionHeader eyebrow="ORDER HISTORY" title="Orders saya" description="Track your orders, view invoices, cancel Pending orders, or reorder completed transactions." /><div className="panel"><OrderTable orders={isAdmin ? adminMyOrders : orders} isAdmin={false} onAction={isAdmin ? cancelOwnOrder : orderAction} onDetails={openOrderDetails} onReorder={reorderOrder} busy={busy} /></div></>}
        {page === 'inventory' && isAdmin && <Inventory resources={inventoryResources} onCreate={createResource} onStock={adjustStock} onEdit={editResource} onToggle={toggleResource} onImage={updateResourceImage} onRemoveImage={removeResourceImage} busy={busy} />}
        {page === 'stash' && isAdmin && <StashPage resources={stashResources} onCreate={createResource} onStock={adjustStock} busy={busy} />}
        {page === 'stock-history' && isAdmin && <StockMovementPage movements={stockMovements} />}
        {page === 'member-stats' && isAdmin && <MemberStatsPage data={memberStats} />}
        {page === 'favorites' && !isAdmin && <FavoritesPage resources={resources} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} cart={cart} setCart={setCart} busy={busy} />}
        {page === 'admin-orders' && isAdmin && <><SectionHeader eyebrow="ORDER MANAGEMENT" title="All Orders" description="Review requests, approve stock reservations, and mark orders as Completed once resources have been handed over. Reservations do not expire automatically and are managed manually by admins." action={<div className="header-actions"><button className="button button-outline" onClick={() => exportOrdersForExcel(orders)} disabled={!orders.length}><ArrowDownToLine size={15}/> Export CSV</button><button className="button button-outline" onClick={cancelAllActiveOrders} disabled={busy || !orders.some((order) => ['PENDING', 'APPROVED'].includes(order.status))}><XCircle size={15}/> Cancel Active Orders</button><button className="button button-ghost-danger" onClick={archiveAllOrders} disabled={busy || !orders.length}><Archive size={15}/> Archive All</button><div className="date-chip"><ClipboardList size={15} /> {number(orders.length)} active orders</div></div>} /><div className="panel"><OrderTable orders={orders} isAdmin onAction={orderAction} onDetails={openOrderDetails} busy={busy} /></div></>}
        {page === 'archived-orders' && isAdmin && <><SectionHeader eyebrow="ORDER ARCHIVE" title="Archived Orders" description="All Orders yang diarsipkan. Data tetap tersedia untuk detail, invoice, laporan, dan audit." action={<div className="header-actions"><button className="button button-outline" onClick={() => exportOrdersForExcel(archivedOrders)} disabled={!archivedOrders.length}><ArrowDownToLine size={15}/> Export Archive CSV</button><div className="date-chip"><Archive size={15} /> {number(archivedOrders.length)} arsip</div></div>} /><div className="panel"><OrderTable orders={archivedOrders} isAdmin readOnly isArchived onDetails={openOrderDetails} onRestore={restoreArchivedOrder} busy={busy} /></div></>}
        {page === 'reports' && isAdmin && <Reports reports={reports} />}
        {page === 'users' && isAdmin && <UsersPage users={users} onCreate={createUser} onToggle={toggleUser} onDelete={deleteUser} onApprove={approveRegistration} onRankChange={changeUserRank} onRoleChange={changeUserRole} currentUserId={user.id} busy={busy} />}
        {page === 'finance' && isAdmin && <FinancePage finance={finance} cash={cash} onStartPeriod={startSpendingPeriod} onUpdatePeriod={updateSpendingPeriod} onResetPeriod={resetSpendingPeriod} onSetOpeningBalance={setCashOpeningBalance} onAddExpense={addCashExpense} onAddCashIncome={addCashIncome} onAdjustCash={adjustCash} busy={busy} />}
        {page === 'notes' && isAdmin && <ManualNotesPage notes={manualNotes} onSave={saveManualNote} onDelete={deleteManualNote} busy={busy} />}
        {page === 'activity' && isAdmin && <ActivityPage logs={logs} discordStatus={discordStatus} onTestDiscord={testDiscord} busy={busy} />}
        {((isAdmin && ['favorites'].includes(page)) || (!isAdmin && ['inventory','stash','stock-history','notes','admin-orders','archived-orders','reports','finance','users','member-stats','activity'].includes(page))) && <div className="panel"><EmptyState icon={ShieldCheck} title="Page Unavailable" detail="This menu is not available for your account role." /></div>}
        </>}
      </div>
      {detailLoading && <div className="order-detail-overlay"><section className="order-detail-modal loading-panel">Loading order details...</section></div>}
      <OrderDetailsModal order={selectedOrder} isAdmin={isAdmin} onClose={() => setSelectedOrder(null)} onPrint={printSelectedOrder} />
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} onSubmit={changePassword} busy={busy} />}
      {editingResource && <EditResourceModal resource={editingResource} onClose={() => setEditingResource(null)} onSave={saveResourceEdits} busy={busy} />}
      <footer className="main-footer"><span>© {new Date().getFullYear()} 30sFams</span><span>30sFams Resource Orders <i /> Private workspace</span></footer>
    </main>
  </div>;
}
