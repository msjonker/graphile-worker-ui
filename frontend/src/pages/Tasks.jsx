import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { api } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { STATE_META } from '../lib/jobState';
import { formatNumber, relativeTime } from '../lib/format';
import { Card, Spinner, EmptyState, ErrorPanel } from '../components/ui';
import { useClientSort, SortTh } from '../components/sortable';

const SEGMENTS = ['running', 'retrying', 'failed', 'scheduled', 'available'];

function taskValue(t, key) {
  if (key === 'task') return t.task.toLowerCase();
  if (key === 'lastUpdated') return t.lastUpdated ? new Date(t.lastUpdated).getTime() : -Infinity;
  return t[key] ?? 0;
}

function Distribution({ row }) {
  const total = Math.max(1, row.total);
  return (
    <div className="flex h-2 w-40 overflow-hidden rounded-full bg-muted">
      {SEGMENTS.map((s) =>
        row[s] > 0 ? (
          <div key={s} style={{ background: STATE_META[s].chart, width: `${(row[s] / total) * 100}%` }} title={`${STATE_META[s].label}: ${row[s]}`} />
        ) : null,
      )}
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const { data, loading, error } = useApiResource(() => api.tasks());
  const tasks = data || [];
  const { sorted, sort, toggle } = useClientSort(tasks, { key: 'total', dir: 'desc' }, taskValue);

  if (error) return <ErrorPanel error={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">{tasks.length} task identifier(s) with jobs in the queue</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                <SortTh label="Task" sortKey="task" sort={sort} toggle={toggle} />
                <SortTh label="Distribution" sort={sort} toggle={toggle} />
                <SortTh label="Running" sortKey="running" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Retrying" sortKey="retrying" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Failed" sortKey="failed" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Total" sortKey="total" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Updated" sortKey="lastUpdated" align="right" defaultDir="desc" className="hidden md:table-cell" sort={sort} toggle={toggle} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((t) => (
                <tr key={t.task} onClick={() => navigate(`/jobs?task=${encodeURIComponent(t.task)}`)} className="cursor-pointer hover:bg-muted/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.task}</td>
                  <td className="px-4 py-2.5"><Distribution row={t} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400">{formatNumber(t.running)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-400">{formatNumber(t.retrying)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-rose-400">{formatNumber(t.failed)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatNumber(t.total)}</td>
                  <td className="hidden px-4 py-2.5 text-right text-xs text-muted-foreground md:table-cell">{relativeTime(t.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && !tasks.length && <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}
        {!loading && !tasks.length && <EmptyState icon={Boxes} title="No tasks" message="No jobs are currently in the queue." />}
      </Card>
    </div>
  );
}
