// Small, dependency-light formatting helpers used across the UI.

export function formatNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat().format(n);
}

export function compactNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

// Human "3m ago" / "in 2h" relative time from an ISO string or Date.
export function relativeTime(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const units = [
    ['year', 31536000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      const v = Math.round(diff / ms);
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
      return rtf.format(v, unit);
    }
  }
  return 'just now';
}

// Compact duration from seconds: "2d 3h", "45m", "12s".
export function formatDuration(secs) {
  if (secs == null) return '—';
  secs = Math.max(0, Math.round(secs));
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ${secs % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatClock(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function truncate(str, len = 80) {
  if (str == null) return '';
  const s = String(str);
  return s.length > len ? s.slice(0, len - 1) + '…' : s;
}
