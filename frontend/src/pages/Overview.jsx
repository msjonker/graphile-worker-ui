import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  PlayCircle,
  RotateCcw,
  XOctagon,
  CalendarClock,
  Boxes,
  AlertTriangle,
  Cpu,
  Timer,
  Layers,
  Gauge,
} from 'lucide-react';
import { api } from '../lib/api';
import { useApiResource } from '../lib/useApiResource';
import { STATE_META } from '../lib/jobState';
import { formatNumber, formatDuration, relativeTime, truncate } from '../lib/format';
import { Card, CardHeader, StatCard, Segmented, Spinner, ErrorPanel, EmptyState } from '../components/ui';
import { StateAreaChart, ThroughputChart } from '../components/Charts';
import { cn } from '../lib/cn';

const WINDOWS = [
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
];

// Maps a stat card to the closest server-expressible Jobs filter.
const CARD_FILTER = {
  available: 'available',
  running: 'running',
  retrying: 'errored',
  failed: 'errored',
  scheduled: 'scheduled',
};

function HealthTile({ icon: Icon, label, value, warn }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
      <div className={cn('rounded-md p-1.5', warn ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={cn('text-sm font-semibold tabular-nums', warn && 'text-amber-400')}>{value}</div>
      </div>
    </div>
  );
}

function TaskBars({ tasks }) {
  const top = tasks.slice(0, 8);
  const max = Math.max(1, ...top.map((t) => t.total));
  const order = ['running', 'retrying', 'failed', 'scheduled', 'available'];
  return (
    <div className="space-y-3 p-5">
      {top.map((t) => (
        <div key={t.task}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate font-mono">{t.task}</span>
            <span className="tabular-nums text-muted-foreground">{formatNumber(t.total)}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" style={{ width: `${(t.total / max) * 100}%`, minWidth: '2%' }}>
            {order.map((s) =>
              t[s] > 0 ? (
                <div
                  key={s}
                  className="h-full"
                  style={{ background: STATE_META[s].chart, width: `${(t[s] / t.total) * 100}%` }}
                  title={`${STATE_META[s].label}: ${t[s]}`}
                />
              ) : null,
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [window, setWindow] = useState('1h');
  const { data, error, loading } = useApiResource(() => api.overview());
  const { data: ts } = useApiResource(() => api.timeseries(window), [window]);
  const { data: queues } = useApiResource(() => api.queues());

  if (error) return <ErrorPanel error={error} />;
  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const o = data?.overview || {};
  const tasks = data?.tasks || [];
  const errors = data?.errors || [];
  const points = ts?.points || [];
  const topQueues = (queues || []).slice(0, 6);

  const cards = [
    { key: 'available', label: 'Available', value: o.available, icon: PlayCircle },
    { key: 'running', label: 'Running', value: o.running, icon: Activity },
    { key: 'retrying', label: 'Retrying', value: o.retrying, icon: RotateCcw },
    { key: 'failed', label: 'Failed', value: o.failed, icon: XOctagon },
    { key: 'scheduled', label: 'Scheduled', value: o.scheduled, icon: CalendarClock },
    { key: 'total', label: 'Total in queue', value: o.total, icon: Boxes, plain: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Live state of your graphile-worker queue</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const meta = STATE_META[c.key];
          return (
            <StatCard
              key={c.key}
              label={c.label}
              value={formatNumber(c.value)}
              icon={c.icon}
              dot={meta?.dot}
              accent={meta?.accent}
              onClick={c.plain ? () => navigate('/jobs') : () => navigate(`/jobs?state=${CARD_FILTER[c.key]}`)}
            />
          );
        })}
      </div>

      {/* State over time + health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Jobs by state over time"
            subtitle="Sampled from live counts — successful jobs are deleted by graphile-worker"
            icon={Activity}
            action={<Segmented options={WINDOWS} value={window} onChange={setWindow} />}
          />
          <div className="p-2">
            {points.length > 1 ? (
              <StateAreaChart points={points} />
            ) : (
              <EmptyState icon={Timer} title="Collecting data…" message="Charts populate as the backend samples the queue. Give it a moment." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Health" icon={Gauge} />
          <div className="grid grid-cols-1 gap-2.5 p-4">
            <HealthTile icon={PlayCircle} label="Ready to run now" value={formatNumber(o.readyNow)} warn={o.readyNow > 0 && o.activeWorkers === 0} />
            <HealthTile icon={Timer} label="Oldest waiting job" value={formatDuration(o.oldestAvailableSecs)} warn={o.oldestAvailableSecs > 300} />
            <HealthTile icon={Cpu} label="Active workers" value={formatNumber(o.activeWorkers)} />
            <HealthTile icon={AlertTriangle} label="Longest-held lock" value={formatDuration(o.oldestLockSecs)} warn={o.oldestLockSecs > 3600} />
          </div>
        </Card>
      </div>

      {/* Throughput + queues */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Throughput" subtitle="Jobs enqueued per minute (derived from the id sequence)" icon={Gauge} />
          <div className="p-2">
            {points.length > 1 ? (
              <ThroughputChart points={points} />
            ) : (
              <EmptyState icon={Gauge} title="No samples yet" message="Enqueue-rate appears once at least two samples exist." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Busiest queues" icon={Layers} action={<button className="text-xs text-primary hover:underline" onClick={() => navigate('/queues')}>View all</button>} />
          <div className="divide-y">
            {topQueues.length === 0 && <EmptyState icon={Layers} title="No queues" message="Jobs without a named queue don't appear here." />}
            {topQueues.map((q) => (
              <button key={q.queueName} onClick={() => navigate('/queues')} className="flex w-full items-center justify-between px-5 py-2.5 text-sm hover:bg-muted/50">
                <span className="flex items-center gap-2 truncate">
                  {q.lockedBy && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  <span className="truncate font-mono text-xs">{q.queueName}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{formatNumber(q.total)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Tasks + errors */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top tasks" subtitle="Distribution by state" icon={Boxes} action={<button className="text-xs text-primary hover:underline" onClick={() => navigate('/tasks')}>View all</button>} />
          {tasks.length ? <TaskBars tasks={tasks} /> : <EmptyState icon={Boxes} title="No jobs in queue" />}
        </Card>

        <Card>
          <CardHeader title="Top errors" subtitle="Grouped by first line of the error" icon={AlertTriangle} />
          <div className="divide-y">
            {errors.length === 0 && <EmptyState icon={AlertTriangle} title="No errors 🎉" message="Nothing is failing right now." />}
            {errors.map((e, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <code className="text-xs text-rose-400 break-all">{truncate(e.error, 120)}</code>
                  <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-400 tabular-nums">
                    {formatNumber(e.count)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {e.dead > 0 && <span className="text-rose-400">{e.dead} dead</span>}
                  <span>{e.tasks.slice(0, 3).join(', ')}{e.tasks.length > 3 ? '…' : ''}</span>
                  <span>· {relativeTime(e.lastSeen)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
