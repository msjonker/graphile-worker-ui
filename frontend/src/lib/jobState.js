// Client mirror of the backend STATE_SQL (lib/observability.js). Keep these in
// sync: a graphile-worker job is always in exactly one of these five states.

export const STATE_META = {
  running: {
    key: 'running',
    label: 'Running',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
    accent: 'text-emerald-400',
    chart: '#10b981',
  },
  available: {
    key: 'available',
    label: 'Available',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-500',
    accent: 'text-sky-400',
    chart: '#0ea5e9',
  },
  retrying: {
    key: 'retrying',
    label: 'Retrying',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    accent: 'text-amber-400',
    chart: '#f59e0b',
  },
  failed: {
    key: 'failed',
    label: 'Failed',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
    accent: 'text-rose-400',
    chart: '#f43f5e',
  },
  scheduled: {
    key: 'scheduled',
    label: 'Scheduled',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    dot: 'bg-violet-500',
    accent: 'text-violet-400',
    chart: '#8b5cf6',
  },
};

export const STATE_ORDER = ['running', 'available', 'retrying', 'failed', 'scheduled'];

// Mirrors the CASE in backend STATE_SQL. `job` uses camelCase GraphQL fields.
export function deriveState(job) {
  if (!job) return STATE_META.available;
  if (job.lockedAt) return STATE_META.running;
  if (job.lastError && job.attempts >= job.maxAttempts) return STATE_META.failed;
  if (job.lastError) return STATE_META.retrying;
  if (job.runAt && new Date(job.runAt).getTime() > Date.now()) return STATE_META.scheduled;
  return STATE_META.available;
}

// Coarse, server-expressible filters for the Jobs table. The fine retrying/failed
// split (attempts vs max_attempts, a column-to-column compare) can't be expressed
// through the connection-filter plugin, so it's shown per-row via deriveState.
export function stateFilter(stateKey, nowIso) {
  switch (stateKey) {
    case 'running':
      return { lockedAt: { isNull: false } };
    case 'errored':
      return { lockedAt: { isNull: true }, lastError: { isNull: false } };
    case 'scheduled':
      return {
        lockedAt: { isNull: true },
        lastError: { isNull: true },
        runAt: { greaterThan: nowIso },
      };
    case 'available':
      return {
        lockedAt: { isNull: true },
        lastError: { isNull: true },
        runAt: { lessThanOrEqualTo: nowIso },
      };
    default:
      return null;
  }
}

export const JOB_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'running', label: 'Running' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'errored', label: 'Errored' },
];
