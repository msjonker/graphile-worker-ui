import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { useJobActions } from '../lib/useJobActions';
import { formatNumber, formatDuration, relativeTime } from '../lib/format';
import { Card, Spinner, EmptyState, ErrorPanel, Button, Badge } from '../components/ui';
import { useClientSort, SortTh } from '../components/sortable';
import { cn } from '../lib/cn';

// A lock held for longer than this is very likely a crashed worker.
const STALE_LOCK_SECS = 15 * 60;

function queueValue(q, key) {
  switch (key) {
    case 'queueName':
      return q.queueName.toLowerCase();
    case 'lock':
      return q.lockedForSecs ?? -1;
    case 'nextRunAt':
      return q.nextRunAt ? new Date(q.nextRunAt).getTime() : Infinity;
    default:
      return q[key] ?? 0;
  }
}

export default function Queues() {
  const navigate = useNavigate();
  const actions = useJobActions();
  const { data, loading, error } = useApiResource(() => api.queues());
  const queues = data || [];
  const locked = queues.filter((q) => q.lockedBy).length;
  const { sorted, sort, toggle } = useClientSort(queues, { key: 'total', dir: 'desc' }, queueValue);

  if (error) return <ErrorPanel error={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Queues</h1>
        <p className="text-sm text-muted-foreground">{queues.length} named queue(s) · {locked} currently locked</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                <SortTh label="Queue" sortKey="queueName" sort={sort} toggle={toggle} />
                <SortTh label="Lock" sortKey="lock" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Available" sortKey="available" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Running" sortKey="running" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Failed" sortKey="failed" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Total" sortKey="total" align="right" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Next run" sortKey="nextRunAt" className="hidden lg:table-cell" sort={sort} toggle={toggle} />
                <SortTh label="Actions" align="right" sort={sort} toggle={toggle} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((q) => {
                const stale = q.lockedForSecs != null && q.lockedForSecs > STALE_LOCK_SECS;
                return (
                  <tr key={q.queueName} className="hover:bg-muted/50">
                    <td className="cursor-pointer px-4 py-2.5 font-mono text-xs" onClick={() => navigate(`/jobs?queue=${encodeURIComponent(q.queueName)}`)}>
                      {q.queueName}
                    </td>
                    <td className="px-4 py-2.5">
                      {q.lockedBy ? (
                        <Badge className={stale ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}>
                          {stale ? <AlertTriangle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          {formatDuration(q.lockedForSecs)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">idle</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sky-400">{formatNumber(q.available)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400">{formatNumber(q.running)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rose-400">{formatNumber(q.failed)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatNumber(q.total)}</td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">{q.nextRunAt ? relativeTime(q.nextRunAt) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {q.lockedBy && (
                        <Button variant="outline" onClick={() => actions.unlockQueues([q.queueName])} className={cn(stale && 'border-amber-500/40 text-amber-400')}>
                          <Unlock className="h-3.5 w-3.5" />Unlock
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && !queues.length && <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}
        {!loading && !queues.length && <EmptyState icon={Layers} title="No named queues" message="Jobs enqueued without a queue name run on the default queue and aren't listed here." />}
      </Card>
    </div>
  );
}
