import { pool, query } from './db.js';
import { getOverview } from './observability.js';

const SNAPSHOT_SCHEMA = 'graphile_worker_ui';
const INTERVAL_MS = Number(process.env.GW_UI_SNAPSHOT_INTERVAL_MS || 5000);
const RETENTION_DAYS = Number(process.env.GW_UI_SNAPSHOT_RETENTION_DAYS || 7);

let timer = null;
let lastPruneAt = 0;

// Idempotently create our own schema/table. We deliberately keep this OUT of the
// graphile_worker schema so we never interfere with the worker's own migrations.
export async function ensureSchema() {
  await query(`CREATE SCHEMA IF NOT EXISTS ${SNAPSHOT_SCHEMA}`);
  await query(`
    CREATE TABLE IF NOT EXISTS ${SNAPSHOT_SCHEMA}.metrics_snapshots (
      ts             timestamptz NOT NULL DEFAULT now(),
      available      int         NOT NULL DEFAULT 0,
      running        int         NOT NULL DEFAULT 0,
      retrying       int         NOT NULL DEFAULT 0,
      failed         int         NOT NULL DEFAULT 0,
      scheduled      int         NOT NULL DEFAULT 0,
      total          int         NOT NULL DEFAULT 0,
      max_job_id     bigint,
      active_workers int         NOT NULL DEFAULT 0
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS metrics_snapshots_ts_idx
    ON ${SNAPSHOT_SCHEMA}.metrics_snapshots (ts)
  `);
}

async function takeSnapshot() {
  const o = await getOverview();
  await query(
    `INSERT INTO ${SNAPSHOT_SCHEMA}.metrics_snapshots
       (available, running, retrying, failed, scheduled, total, max_job_id, active_workers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [o.available, o.running, o.retrying, o.failed, o.scheduled, o.total, o.maxJobId, o.activeWorkers],
  );

  // Prune at most once an hour to avoid churn.
  if (Date.now() - lastPruneAt > 3600_000) {
    lastPruneAt = Date.now();
    await query(
      `DELETE FROM ${SNAPSHOT_SCHEMA}.metrics_snapshots WHERE ts < now() - ($1 || ' days')::interval`,
      [String(RETENTION_DAYS)],
    );
  }
}

export function startCollector() {
  const tick = async () => {
    try {
      await takeSnapshot();
    } catch (err) {
      console.error('[metrics] snapshot failed:', err.message);
    }
  };
  tick();
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref?.();
  console.log(`📈 Metrics collector running every ${INTERVAL_MS}ms (retention ${RETENTION_DAYS}d)`);
}

export function stopCollector() {
  if (timer) clearInterval(timer);
}

const WINDOWS = {
  '15m': 15 * 60,
  '1h': 60 * 60,
  '6h': 6 * 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
};

// Returns a bucketed, downsampled series (~200 points max) plus a derived
// enqueue rate from the max_job_id delta between buckets.
export async function getTimeseries(windowKey = '1h') {
  const windowSecs = WINDOWS[windowKey] || WINDOWS['1h'];
  const bucketSecs = Math.max(INTERVAL_MS / 1000, Math.ceil(windowSecs / 200));

  const rows = await query(
    `
    SELECT
      to_timestamp(floor(extract(epoch FROM ts) / $1) * $1) AS bucket,
      round(avg(available))::int      AS available,
      round(avg(running))::int        AS running,
      round(avg(retrying))::int       AS retrying,
      round(avg(failed))::int         AS failed,
      round(avg(scheduled))::int      AS scheduled,
      round(avg(total))::int          AS total,
      round(avg(active_workers))::int AS active_workers,
      max(max_job_id)                 AS max_job_id,
      min(max_job_id)                 AS min_job_id
    FROM ${SNAPSHOT_SCHEMA}.metrics_snapshots
    WHERE ts >= now() - ($2 || ' seconds')::interval
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [bucketSecs, String(windowSecs)],
  );

  // Derive enqueue rate (jobs added / minute) from how far the id sequence moved
  // within each bucket. This is our best proxy for throughput since successful
  // jobs are deleted and never counted.
  const series = rows.map((r, i) => {
    let enqueuedPerMin = null;
    if (i > 0 && r.max_job_id != null && rows[i - 1].max_job_id != null) {
      const delta = Number(r.max_job_id) - Number(rows[i - 1].max_job_id);
      enqueuedPerMin = delta >= 0 ? Math.round((delta / bucketSecs) * 60) : null;
    }
    return {
      ts: r.bucket,
      available: Number(r.available),
      running: Number(r.running),
      retrying: Number(r.retrying),
      failed: Number(r.failed),
      scheduled: Number(r.scheduled),
      total: Number(r.total),
      activeWorkers: Number(r.active_workers),
      enqueuedPerMin,
    };
  });

  return { window: windowKey, bucketSecs, points: series };
}
