
const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:4000/api')
  : '/api';

const API_ORIGIN = /^https?:\/\//i.test(API_URL)
  ? API_URL.replace(/\/api\/?$/, '')
  : '';

export function assetUrl(path) {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) return path;

  if (!API_ORIGIN) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  return new URL(path, `${API_ORIGIN}/`).toString();
}

export async function uploadFile(path, file) {
  const form = new FormData();
  form.append('image', file);

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Upload gagal (${response.status}).`);
  }

  return payload;
}

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload =
    response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request gagal (${response.status}).`);
  }

  return payload;
}

export const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const number = (value) =>
  new Intl.NumberFormat('id-ID').format(Number(value || 0));

export const dateTime = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return '—';
  }
};

export const categoryLabel = (value) =>
  ({
    CLASS1: 'Class 1',
    CLASS2: 'Class 2',
    CLASS3: 'Class 3',
    NARKO: 'Narko',
    VEST: 'Vest',
    ATTACHMENT: 'Attachment',
    AMMO: 'Ammo',
  }[value] || value);

export const statusLabel = (value) =>
  ({
    PENDING: 'Pending',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  }[value] || value);
