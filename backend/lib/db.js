import pg from 'pg';

const { Pool } = pg;

// graphile-worker stores bigint job ids; make node-postgres return them as
// JS numbers when they're safely within range, otherwise keep the string so we
// never silently corrupt an id.
pg.types.setTypeParser(20 /* int8 */, (val) => {
  if (val === null) return null;
  const n = Number(val);
  return Number.isSafeInteger(n) ? n : val;
});

export const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

// A dedicated pool for the observability endpoints. PostGraphile keeps its own
// pool; we keep ours separate so heavy dashboard queries never starve GraphQL.
export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.GW_UI_POOL_MAX || 8),
  application_name: 'graphile-worker-ui',
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}
