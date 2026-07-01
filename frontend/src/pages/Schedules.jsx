import React from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { formatDateTime, relativeTime } from '../lib/format';
import { Card, Spinner, EmptyState, ErrorPanel, Badge } from '../components/ui';
import { useClientSort, SortTh } from '../components/sortable';

// graphile-worker records known crontabs but not their cadence, so we can't know
// the exact next run. We flag entries that have never run, or haven't run in a
// day, as worth a look.
const STALE_MS = 24 * 60 * 60 * 1000;

// Client-side sort value per column. Higher status rank = more urgent.
function scheduleValue(c, key) {
  switch (key) {
    case 'identifier':
      return c.identifier.toLowerCase();
    case 'status': {
      const last = c.lastExecution ? new Date(c.lastExecution).getTime() : null;
      return last == null ? 2 : Date.now() - last > STALE_MS ? 1 : 0;
    }
    case 'lastExecution':
      return c.lastExecution ? new Date(c.lastExecution).getTime() : -Infinity;
    case 'knownSince':
      return c.knownSince ? new Date(c.knownSince).getTime() : -Infinity;
    default:
      return 0;
  }
}

export default function Schedules() {
  const { data, loading, error } = useApiResource(() => api.crontabs());
  const crontabs = data || [];
  const { sorted, sort, toggle } = useClientSort(crontabs, { key: 'identifier', dir: 'asc' }, scheduleValue);

  if (error) return <ErrorPanel error={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          {crontabs.length} known crontab(s) from <code className="font-mono text-xs">known_crontabs</code>
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface text-left text-xs text-muted-foreground">
                <SortTh label="Identifier" sortKey="identifier" sort={sort} toggle={toggle} />
                <SortTh label="Status" sortKey="status" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Last execution" sortKey="lastExecution" defaultDir="desc" sort={sort} toggle={toggle} />
                <SortTh label="Known since" sortKey="knownSince" defaultDir="desc" className="hidden md:table-cell" sort={sort} toggle={toggle} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((c) => {
                const last = c.lastExecution ? new Date(c.lastExecution).getTime() : null;
                const staleOrNever = last == null || Date.now() - last > STALE_MS;
                return (
                  <tr key={c.identifier} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-mono text-xs">{c.identifier}</td>
                    <td className="px-4 py-2.5">
                      {staleOrNever ? (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3" />{last == null ? 'Never run' : 'Stale'}</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" />Recent</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.lastExecution ? (
                        <span>
                          {relativeTime(c.lastExecution)}
                          <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(c.lastExecution)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">{formatDateTime(c.knownSince)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && !crontabs.length && <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>}
        {!loading && !crontabs.length && <EmptyState icon={CalendarClock} title="No scheduled tasks" message="No crontab entries are registered. Add cron jobs to your graphile-worker config to see them here." />}
      </Card>
    </div>
  );
}
