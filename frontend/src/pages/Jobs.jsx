import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  PlayCircle,
  XOctagon,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ListChecks,
  X,
} from 'lucide-react';
import { GET_JOBS } from '../lib/graphql';
import { deriveState, JOB_FILTERS, stateFilter } from '../lib/jobState';
import { useLive } from '../lib/live.jsx';
import { useJobActions } from '../lib/useJobActions';
import { formatNumber, relativeTime, truncate } from '../lib/format';
import { Card, StateBadge, Segmented, Spinner, EmptyState, ErrorPanel, Button } from '../components/ui';
import { cn } from '../lib/cn';

const PAGE_SIZES = [25, 50, 100];

export default function Jobs() {
  const navigate = useNavigate();
  const { nonce } = useLive();
  const actions = useJobActions();
  const [params, setParams] = useSearchParams();

  const state = params.get('state') || 'all';
  const taskSearch = params.get('task') || '';
  const queueSearch = params.get('queue') || '';
  const sort = params.get('sort') || 'CREATED_AT_DESC';
  const pageSize = Number(params.get('size')) || 25;
  const page = Number(params.get('page')) || 0;

  const [selected, setSelected] = useState(() => new Set());
  const [searchInput, setSearchInput] = useState(taskSearch);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, String(v));
    });
    // any filter change resets the page
    if (!('page' in patch)) next.delete('page');
    setParams(next);
    setSelected(new Set());
  };

  const filter = useMemo(() => {
    const nowIso = new Date().toISOString();
    const f = { ...(stateFilter(state, nowIso) || {}) };
    if (taskSearch) f.taskIdentifier = { includesInsensitive: taskSearch };
    if (queueSearch) f.queueName = { includesInsensitive: queueSearch };
    return Object.keys(f).length ? f : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, taskSearch, queueSearch]);

  const { data, loading, error, refetch } = useQuery(GET_JOBS, {
    // Omit `filter` entirely when empty — the connection-filter plugin rejects an
    // explicit `filter: null` ("Null literals are forbidden"). Apollo drops
    // undefined variables, so the argument is left off the request.
    variables: { first: pageSize, offset: page * pageSize, orderBy: [sort], filter: filter || undefined },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  // Re-run on the global live tick and after any action bumps the nonce.
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const conn = data?.allJobs;
  const jobs = conn?.nodes || [];
  const total = conn?.totalCount ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  const allSelected = jobs.length > 0 && jobs.every((j) => selected.has(j.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(jobs.map((j) => j.id)));
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedIds = [...selected];
  const runAction = async (fn) => {
    await fn(selectedIds);
    setSelected(new Set());
    refetch();
  };

  // Split the "BASE_DIR" sort string (e.g. RUN_AT_DESC) into column + direction.
  const [sortBase, sortDir] = useMemo(() => {
    const m = sort.match(/^(.*)_(ASC|DESC)$/);
    return m ? [m[1], m[2]] : ['CREATED_AT', 'DESC'];
  }, [sort]);

  const applySort = (base, defaultDir) => {
    const dir = sortBase === base ? (sortDir === 'ASC' ? 'DESC' : 'ASC') : defaultDir;
    setParam({ sort: `${base}_${dir}` });
  };

  // Renders a header cell; pass a `base` to make it a sort control.
  const Th = ({ label, base, defaultDir = 'DESC', align = 'left', className }) => {
    const active = base && sortBase === base;
    return (
      <th className={cn('px-3 py-2.5 font-medium', align === 'right' && 'text-right', className)}>
        {base ? (
          <button
            onClick={() => applySort(base, defaultDir)}
            className={cn('group inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
          >
            {label}
            {active ? (
              sortDir === 'ASC' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40" />
            )}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(total)} matching job(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={JOB_FILTERS} value={state} onChange={(v) => setParam({ state: v === 'all' ? '' : v })} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ task: searchInput });
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search task…"
            className="input w-56 pl-8"
          />
        </form>
        {queueSearch && (
          <span className="inline-flex items-center gap-1 rounded-md border bg-surface px-2 py-1 text-xs">
            queue: {queueSearch}
            <button onClick={() => setParam({ queue: '' })}><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 animate-fade-in">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runAction(actions.retry)}><RotateCcw className="h-3.5 w-3.5" />Retry</Button>
            <Button variant="outline" onClick={() => runAction(actions.runNow)}><PlayCircle className="h-3.5 w-3.5" />Run now</Button>
            <Button variant="outline" onClick={() => runAction(actions.fail)}><XOctagon className="h-3.5 w-3.5" />Fail</Button>
            <Button variant="danger" onClick={() => runAction(actions.remove)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {error && !data && <ErrorPanel error={error} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-[hsl(var(--primary))]" />
                </th>
                <Th label="State" />
                <Th label="Task" base="TASK_IDENTIFIER" defaultDir="ASC" />
                <Th label="Queue" base="QUEUE_NAME" defaultDir="ASC" className="hidden md:table-cell" />
                <Th label="Attempts" base="ATTEMPTS" align="right" />
                <Th label="Priority" base="PRIORITY" align="right" defaultDir="ASC" className="hidden lg:table-cell" />
                <Th label="Run at" base="RUN_AT" />
                <Th label="Updated" base="UPDATED_AT" className="hidden xl:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => {
                const st = deriveState(job);
                const isSel = selected.has(job.id);
                return (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className={cn('cursor-pointer transition-colors hover:bg-muted/50', isSel && 'bg-primary/5')}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggle(job.id)} className="accent-[hsl(var(--primary))]" />
                    </td>
                    <td className="px-3 py-2.5"><StateBadge state={st} pulse={st.key === 'running'} /></td>
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-xs">{job.taskIdentifier}</div>
                      {job.lastError && (
                        <div className="mt-0.5 max-w-[24rem] truncate text-[11px] text-rose-400/80">
                          {truncate(job.lastError.split('\n')[0], 90)}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <span className="text-xs text-muted-foreground">{job.queueName || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={cn(job.attempts >= job.maxAttempts && job.attempts > 0 && 'text-rose-400')}>
                        {job.attempts}
                      </span>
                      <span className="text-muted-foreground">/{job.maxAttempts}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground lg:table-cell">{job.priority}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{relativeTime(job.runAt)}</td>
                    <td className="hidden px-3 py-2.5 text-xs text-muted-foreground xl:table-cell">{relativeTime(job.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && !jobs.length && (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Spinner className="h-6 w-6" /></div>
        )}
        {!loading && !jobs.length && (
          <EmptyState icon={ListChecks} title="No jobs match" message="Try a different filter or clear your search." />
        )}
      </Card>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Rows:</span>
          {PAGE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setParam({ size: s, page: 0 })}
              className={cn('rounded px-1.5', s === pageSize ? 'font-semibold text-foreground' : 'hover:text-foreground')}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {total === 0 ? '0' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)}`} of {formatNumber(total)}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" disabled={page <= 0} onClick={() => setParam({ page: page - 1 })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= maxPage} onClick={() => setParam({ page: page + 1 })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
