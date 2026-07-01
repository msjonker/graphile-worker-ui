import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  ArrowLeft,
  RotateCcw,
  PlayCircle,
  XOctagon,
  CheckCircle2,
  Trash2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { GET_JOB_DETAIL } from '../lib/graphql';
import { deriveState } from '../lib/jobState';
import { useLive } from '../lib/live.jsx';
import { useJobActions } from '../lib/useJobActions';
import { formatDateTime, relativeTime, formatNumber } from '../lib/format';
import { Card, CardHeader, StateBadge, Button, Spinner, ErrorPanel } from '../components/ui';
import { JsonView } from '../components/JsonView';

function Field({ label, children, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs text-right break-all' : 'text-right'}>{children ?? '—'}</span>
    </div>
  );
}

function TimelineRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-24 text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatDateTime(value)}</span>
      <span className="ml-auto text-xs text-muted-foreground">{relativeTime(value)}</span>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nonce } = useLive();
  const actions = useJobActions();
  const [priority, setPriority] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_JOB_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const job = data?._privateJobById;

  const act = async (fn) => {
    await fn([id]);
    refetch();
  };

  if (error && !job) return <ErrorPanel error={error} />;
  if (loading && !job) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="space-y-4">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <Card className="p-10 text-center text-muted-foreground">
          Job <span className="font-mono">{id}</span> was not found. It may have completed and been deleted.
        </Card>
      </div>
    );
  }

  const st = deriveState(job);
  const view = job.jobById || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-semibold">{view.taskIdentifier || 'job'}</h1>
              <StateBadge state={st} pulse={st.key === 'running'} />
            </div>
            <p className="text-xs text-muted-foreground">Job #{job.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => act(actions.retry)}><RotateCcw className="h-3.5 w-3.5" />Retry</Button>
          <Button variant="outline" onClick={() => act(actions.runNow)}><PlayCircle className="h-3.5 w-3.5" />Run now</Button>
          <Button variant="outline" onClick={() => act(actions.complete)}><CheckCircle2 className="h-3.5 w-3.5" />Complete</Button>
          <Button variant="outline" onClick={() => act(actions.fail)}><XOctagon className="h-3.5 w-3.5" />Fail</Button>
          <Button variant="danger" onClick={() => act(actions.remove)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {job.lastError && (
            <Card className="border-rose-500/30">
              <CardHeader title="Last error" icon={AlertTriangle} className="text-rose-400" />
              <pre className="max-h-72 overflow-auto p-5 text-xs leading-relaxed text-rose-300/90 whitespace-pre-wrap break-words">
                {job.lastError}
              </pre>
            </Card>
          )}

          <Card>
            <CardHeader title="Payload" subtitle="Arguments passed to the task" />
            <div className="p-4">
              <JsonView value={job.payload} />
            </div>
          </Card>

          {job.flags && (
            <Card>
              <CardHeader title="Flags" subtitle="Forbidden-flag locks" />
              <div className="p-4"><JsonView value={job.flags} maxHeight="max-h-40" /></div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <div className="divide-y">
              <Field label="Task" mono>{view.taskIdentifier}</Field>
              <Field label="Queue" mono>{view.queueName || 'default (unnamed)'}</Field>
              <Field label="Priority">{job.priority}</Field>
              <Field label="Attempts">
                <span className={job.attempts >= job.maxAttempts ? 'text-rose-400' : ''}>{job.attempts}</span>
                <span className="text-muted-foreground"> / {job.maxAttempts}</span>
              </Field>
              <Field label="Key" mono>{job.key}</Field>
              <Field label="Locked by" mono>{job.lockedBy}</Field>
              <Field label="Revision">{job.revision}</Field>
              <Field label="Available">{job.isAvailable ? 'yes' : 'no'}</Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Timeline" icon={Clock} />
            <div className="divide-y">
              <TimelineRow label="Created" value={job.createdAt} icon={Clock} />
              <TimelineRow label="Updated" value={job.updatedAt} icon={Clock} />
              <TimelineRow label="Next run" value={job.runAt} icon={PlayCircle} />
              <TimelineRow label="Locked" value={job.lockedAt} icon={Clock} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Set priority" subtitle="Lower = higher priority" />
            <div className="flex items-center gap-2 p-4">
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder={String(job.priority)}
                className="input w-28"
              />
              <Button
                variant="primary"
                disabled={priority === ''}
                onClick={async () => {
                  await actions.setPriority([id], Number(priority));
                  setPriority('');
                  refetch();
                }}
              >
                Set
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
