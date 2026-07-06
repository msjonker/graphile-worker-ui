// Thin REST client for the observability + actions API exposed by the backend.
// Flexible job *browsing* uses GraphQL (see graphql.js); everything else here.

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:5001/graphql';
export const API_BASE =
  import.meta.env.VITE_API_URL || GRAPHQL_URL.replace(/\/graphql\/?$/, '') + '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  overview: () => request('/overview'),
  timeseries: (window = '1h') => request(`/metrics/timeseries?window=${encodeURIComponent(window)}`),
  tasks: () => request('/tasks'),
  queues: () => request('/queues'),
  workers: () => request('/workers'),
  errors: (limit = 20) => request(`/errors?limit=${limit}`),
  crontabs: () => request('/crontabs'),

  // action: retry | runNow | reschedule | setPriority | fail | complete | delete
  jobAction: (action, ids, opts = {}) =>
    request(`/jobs/${action}`, { method: 'POST', body: JSON.stringify({ ids, ...opts }) }),

  unlockQueues: (queueNames) =>
    request('/queues/unlock', { method: 'POST', body: JSON.stringify({ queueNames }) }),

  unlockWorkers: (workerIds) =>
    request('/workers/unlock', { method: 'POST', body: JSON.stringify({ workerIds }) }),
};
