import React from 'react';
import { Cpu, Unlock, AlertTriangle, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { useJobActions } from '../lib/useJobActions';
import { formatNumber, formatDuration, relativeTime } from '../lib/format';
import { Card, CardHeader, Spinner, EmptyState, ErrorPanel, Button, Badge } from '../components/ui';
import { cn } from '../lib/cn';

// If a worker has held its oldest job this long it's very likely dead.
const STALE_SECS = 15 * 60;

export default function Workers() {
  const actions = useJobActions();
  const { data, loading, error } = useApiResource(() => api.workers());

  if (error) return <ErrorPanel error={error} />;
  const workers = data || [];
  const stale = workers.filter((w) => w.oldestLockSecs > STALE_SECS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Workers</h1>
        <p className="text-sm text-muted-foreground">
          {workers.length} active worker(s) inferred from job locks
          {stale.length > 0 && <span className="text-amber-400"> · {stale.length} possibly stalled</span>}
        </p>
      </div>

      {loading && !workers.length && <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}
      {!loading && !workers.length && (
        <Card><EmptyState icon={Cpu} title="No active workers" message="No jobs are currently locked, so no running workers can be detected. Idle workers polling for work don't hold locks and won't appear here." /></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workers.map((w) => {
          const isStale = w.oldestLockSecs > STALE_SECS;
          return (
            <Card key={w.workerId} className={cn(isStale && 'border-amber-500/40')}>
              <CardHeader
                title={<span className="font-mono text-xs">{w.workerId}</span>}
                icon={Cpu}
                action={
                  isStale ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3" />Stalled?</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><Activity className="h-3 w-3" />Active</Badge>
                  )
                }
              />
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-card p-4">
                  <div className="text-xs text-muted-foreground">Jobs locked</div>
                  <div className="text-xl font-semibold tabular-nums">{formatNumber(w.jobsLocked)}</div>
                </div>
                <div className="bg-card p-4">
                  <div className="text-xs text-muted-foreground">Oldest lock</div>
                  <div className={cn('text-xl font-semibold tabular-nums', isStale && 'text-amber-400')}>{formatDuration(w.oldestLockSecs)}</div>
                </div>
              </div>
              <div className="px-4 py-3 text-xs text-muted-foreground">
                <div className="mb-1">Last activity {relativeTime(w.newestLock)}</div>
                <div className="flex flex-wrap gap-1">
                  {w.tasks.slice(0, 6).map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{t}</span>
                  ))}
                  {w.tasks.length > 6 && <span>+{w.tasks.length - 6}</span>}
                </div>
              </div>
              <div className="border-t p-3">
                <Button variant="outline" className={cn('w-full', isStale && 'border-amber-500/40 text-amber-400')} onClick={() => actions.unlockWorkers([w.workerId])}>
                  <Unlock className="h-3.5 w-3.5" />Release locks
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
