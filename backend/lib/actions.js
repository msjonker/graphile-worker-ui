import { pool, query } from './db.js';

// Every job action funnels through here. We prefer graphile-worker's own admin
// functions (stable across versions, respect locks) and fall back to direct,
// parameterised SQL only where a function doesn't exist or can't express intent.

async function countFrom(sql, params) {
  const rows = await query(sql, params);
  return rows.length;
}

const jobActions = {
  // Revive & run now: clears the error and attempt counter so even "dead" jobs
  // (attempts >= max_attempts) become runnable again. Skips locked (running) jobs.
  async retry(ids) {
    const rows = await query(
      `UPDATE graphile_worker._private_jobs
         SET run_at = now(), attempts = 0, last_error = NULL
       WHERE id = ANY($1::bigint[]) AND locked_at IS NULL
       RETURNING id`,
      [ids],
    );
    return rows.length;
  },

  // Run at the current time without resetting the attempt counter.
  async runNow(ids) {
    return countFrom(
      `SELECT id FROM graphile_worker.reschedule_jobs($1::bigint[], run_at => now())`,
      [ids],
    );
  },

  // Move a job's next run to a specific time.
  async reschedule(ids, { runAt }) {
    if (!runAt) throw new Error('reschedule requires a runAt timestamp');
    return countFrom(
      `SELECT id FROM graphile_worker.reschedule_jobs($1::bigint[], run_at => $2::timestamptz)`,
      [ids, runAt],
    );
  },

  // Lower number = higher priority in graphile-worker.
  async setPriority(ids, { priority }) {
    if (priority == null) throw new Error('setPriority requires a priority');
    return countFrom(
      `SELECT id FROM graphile_worker.reschedule_jobs($1::bigint[], priority => $2::int)`,
      [ids, priority],
    );
  },

  // Mark as permanently failed (stops further retries) with a reason.
  async fail(ids, { reason }) {
    return countFrom(
      `SELECT id FROM graphile_worker.permanently_fail_jobs($1::bigint[], $2)`,
      [ids, reason || 'Manually failed from Graphile Worker UI'],
    );
  },

  // Mark as complete — graphile-worker deletes the row, same as a success.
  async complete(ids) {
    return countFrom(
      `SELECT id FROM graphile_worker.complete_jobs($1::bigint[])`,
      [ids],
    );
  },

  // Hard delete. Locked (running) jobs are left alone so we don't orphan a worker.
  async delete(ids) {
    const rows = await query(
      `DELETE FROM graphile_worker._private_jobs
       WHERE id = ANY($1::bigint[]) AND locked_at IS NULL
       RETURNING id`,
      [ids],
    );
    return rows.length;
  },
};

export async function runJobAction(action, ids, opts = {}) {
  const fn = jobActions[action];
  if (!fn) throw new Error(`Unknown job action: ${action}`);
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('No job ids supplied');
  const affected = await fn(ids, opts);
  return { action, requested: ids.length, affected };
}

// Clear a stuck queue lock so its jobs can be picked up again.
export async function unlockQueues(queueNames) {
  if (!Array.isArray(queueNames) || queueNames.length === 0) {
    throw new Error('No queue names supplied');
  }
  const rows = await query(
    `UPDATE graphile_worker._private_job_queues
       SET locked_at = NULL, locked_by = NULL
     WHERE queue_name = ANY($1::text[])
     RETURNING queue_name`,
    [queueNames],
  );
  return { affected: rows.length };
}

// Release every lock held by a (likely crashed) worker: its in-flight jobs and
// any queues it holds. Uses the native force_unlock_workers when available.
export async function unlockWorkers(workerIds) {
  if (!Array.isArray(workerIds) || workerIds.length === 0) {
    throw new Error('No worker ids supplied');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      await client.query(`SELECT graphile_worker.force_unlock_workers($1::text[])`, [workerIds]);
    } catch (err) {
      // Older graphile-worker versions lack force_unlock_workers — clear locks directly.
      await client.query(
        `UPDATE graphile_worker._private_jobs
           SET locked_at = NULL, locked_by = NULL
         WHERE locked_by = ANY($1::text[])`,
        [workerIds],
      );
      await client.query(
        `UPDATE graphile_worker._private_job_queues
           SET locked_at = NULL, locked_by = NULL
         WHERE locked_by = ANY($1::text[])`,
        [workerIds],
      );
    }
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM graphile_worker.jobs WHERE locked_by = ANY($1::text[])`,
      [workerIds],
    );
    await client.query('COMMIT');
    return { workers: workerIds.length, stillLocked: rows[0]?.n ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
