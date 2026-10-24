import { query } from './db.js';

// Single source of truth for how a graphile-worker job row maps to a UI state.
// graphile-worker deletes jobs on success, so every row we can see is in one of
// these five live states. Expects the row aliased as `j` (the graphile_worker
// `jobs` view, which resolves task_identifier and queue_name for us).
export const STATE_SQL = `
  CASE
    WHEN j.locked_at IS NOT NULL THEN 'running'
    WHEN j.last_error IS NOT NULL AND j.attempts >= j.max_attempts THEN 'failed'
    WHEN j.last_error IS NOT NULL THEN 'retrying'
    WHEN j.run_at > now() THEN 'scheduled'
    ELSE 'available'
  END`;

export const STATES = ['available', 'running', 'retrying', 'failed', 'scheduled'];

// Whole-system snapshot: one row of counts + a few health signals.
//
// The metrics collector runs this every few seconds whether or not anyone is
// looking, so it has to stay cheap at any queue depth. Two things keep it so:
//   - It reads _private_jobs, not the `jobs` view: every column STATE_SQL needs
//     is on the table, and the view's task/queue joins only widen each row.
//   - active_workers is a subquery over the locked rows alone. As
//     `count(DISTINCT locked_by)` in the main aggregate, Postgres presorted
//     EVERY job row by locked_by to feed it, and with a backed-up queue that
//     sort went to disk: ~25MB of temp file per call, 21TB over seven weeks on
//     one install, from a dashboard nobody had open.
export async function getOverview() {
  const [row] = await query(`
    WITH s AS (
      SELECT ${STATE_SQL} AS state, j.run_at, j.locked_at, j.id
      FROM graphile_worker._private_jobs j
    )
    SELECT
      count(*)                                            AS total,
      count(*) FILTER (WHERE state = 'available')         AS available,
      count(*) FILTER (WHERE state = 'running')           AS running,
      count(*) FILTER (WHERE state = 'retrying')          AS retrying,
      count(*) FILTER (WHERE state = 'failed')            AS failed,
      count(*) FILTER (WHERE state = 'scheduled')         AS scheduled,
      count(*) FILTER (WHERE state = 'available'
                         AND run_at <= now())             AS ready_now,
      max(id)                                             AS max_job_id,
      (SELECT count(DISTINCT locked_by) FROM graphile_worker._private_jobs
        WHERE locked_by IS NOT NULL)                      AS active_workers,
      extract(epoch FROM (now() - min(run_at) FILTER (WHERE state = 'available')))::int AS oldest_available_secs,
      extract(epoch FROM (now() - min(locked_at) FILTER (WHERE locked_at IS NOT NULL)))::int AS oldest_lock_secs
    FROM s
  `);
  return {
    total: Number(row.total) || 0,
    available: Number(row.available) || 0,
    running: Number(row.running) || 0,
    retrying: Number(row.retrying) || 0,
    failed: Number(row.failed) || 0,
    scheduled: Number(row.scheduled) || 0,
    readyNow: Number(row.ready_now) || 0,
    maxJobId: row.max_job_id == null ? null : Number(row.max_job_id),
    activeWorkers: Number(row.active_workers) || 0,
    oldestAvailableSecs: row.oldest_available_secs == null ? null : Number(row.oldest_available_secs),
    oldestLockSecs: row.oldest_lock_secs == null ? null : Number(row.oldest_lock_secs),
  };
}

// Per-task breakdown for the Tasks page + Overview "top tasks" panel.
export async function getTaskBreakdown() {
  return (await query(`
    SELECT
      j.task_identifier AS task,
      count(*)::int                                       AS total,
      count(*) FILTER (WHERE ${STATE_SQL} = 'running')::int    AS running,
      count(*) FILTER (WHERE ${STATE_SQL} = 'retrying')::int   AS retrying,
      count(*) FILTER (WHERE ${STATE_SQL} = 'failed')::int     AS failed,
      count(*) FILTER (WHERE ${STATE_SQL} = 'scheduled')::int  AS scheduled,
      count(*) FILTER (WHERE ${STATE_SQL} = 'available')::int  AS available,
      max(j.updated_at)                                   AS last_updated
    FROM graphile_worker.jobs j
    GROUP BY j.task_identifier
    ORDER BY total DESC
  `)).map((r) => ({ ...r, lastUpdated: r.last_updated }));
}

// Queue health: pairs the physical job_queues rows (locks) with live backlog.
export async function getQueues() {
  return (await query(`
    WITH backlog AS (
      SELECT
        j.queue_name,
        count(*)::int                                          AS total,
        count(*) FILTER (WHERE ${STATE_SQL} = 'available')::int AS available,
        count(*) FILTER (WHERE ${STATE_SQL} = 'running')::int   AS running,
        count(*) FILTER (WHERE ${STATE_SQL} = 'failed')::int    AS failed,
        min(j.run_at) FILTER (WHERE ${STATE_SQL} = 'available') AS next_run_at
      FROM graphile_worker.jobs j
      WHERE j.queue_name IS NOT NULL
      GROUP BY j.queue_name
    )
    SELECT
      COALESCE(q.queue_name, b.queue_name)                     AS queue_name,
      q.locked_at,
      q.locked_by,
      extract(epoch FROM (now() - q.locked_at))::int           AS locked_for_secs,
      COALESCE(b.total, 0)                                     AS total,
      COALESCE(b.available, 0)                                 AS available,
      COALESCE(b.running, 0)                                   AS running,
      COALESCE(b.failed, 0)                                    AS failed,
      b.next_run_at
    FROM graphile_worker._private_job_queues q
    FULL OUTER JOIN backlog b ON b.queue_name = q.queue_name
    ORDER BY total DESC, queue_name ASC
  `)).map((r) => ({
    queueName: r.queue_name,
    lockedAt: r.locked_at,
    lockedBy: r.locked_by,
    lockedForSecs: r.locked_for_secs == null ? null : Number(r.locked_for_secs),
    total: Number(r.total),
    available: Number(r.available),
    running: Number(r.running),
    failed: Number(r.failed),
    nextRunAt: r.next_run_at,
  }));
}

// Workers are not a first-class table in graphile-worker; we infer them from the
// distinct `locked_by` values across held jobs, and flag stale locks.
export async function getWorkers() {
  return (await query(`
    SELECT
      j.locked_by                                             AS worker_id,
      count(*)::int                                           AS jobs_locked,
      min(j.locked_at)                                        AS oldest_lock,
      max(j.locked_at)                                        AS newest_lock,
      extract(epoch FROM (now() - max(j.locked_at)))::int     AS idle_secs,
      extract(epoch FROM (now() - min(j.locked_at)))::int     AS oldest_lock_secs,
      array_agg(DISTINCT j.task_identifier)                   AS tasks
    FROM graphile_worker.jobs j
    WHERE j.locked_by IS NOT NULL
    GROUP BY j.locked_by
    ORDER BY jobs_locked DESC
  `)).map((r) => ({
    workerId: r.worker_id,
    jobsLocked: Number(r.jobs_locked),
    oldestLock: r.oldest_lock,
    newestLock: r.newest_lock,
    idleSecs: r.idle_secs == null ? null : Number(r.idle_secs),
    oldestLockSecs: r.oldest_lock_secs == null ? null : Number(r.oldest_lock_secs),
    tasks: (r.tasks || []).filter(Boolean),
  }));
}

// Top error signatures across retrying/failed jobs — the highest-signal panel
// given there's no completion history to mine.
export async function getTopErrors(limit = 10) {
  return (await query(`
    SELECT
      -- collapse to the first line so similar stack traces group together
      split_part(j.last_error, E'\\n', 1)                     AS error,
      count(*)::int                                           AS count,
      count(*) FILTER (WHERE j.attempts >= j.max_attempts)::int AS dead,
      array_agg(DISTINCT j.task_identifier)                   AS tasks,
      max(j.updated_at)                                       AS last_seen
    FROM graphile_worker.jobs j
    WHERE j.last_error IS NOT NULL AND j.locked_at IS NULL
    GROUP BY split_part(j.last_error, E'\\n', 1)
    ORDER BY count DESC
    LIMIT $1
  `, [limit])).map((r) => ({
    error: r.error,
    count: Number(r.count),
    dead: Number(r.dead),
    tasks: (r.tasks || []).filter(Boolean),
    lastSeen: r.last_seen,
  }));
}

// Scheduled cron entries with overdue detection.
export async function getCrontabs() {
  return (await query(`
    SELECT identifier, known_since, last_execution
    FROM graphile_worker._private_known_crontabs
    ORDER BY identifier ASC
  `)).map((r) => ({
    identifier: r.identifier,
    knownSince: r.known_since,
    lastExecution: r.last_execution,
  }));
}
