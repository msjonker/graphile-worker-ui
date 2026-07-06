import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { STATE_META, STATE_ORDER } from '../lib/jobState';
import { formatClock, formatDateTime } from '../lib/format';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-elevated px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-muted-foreground">{formatDateTime(label)}</div>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="tabular-nums font-medium">{p.value}</span>
          </div>
        ))}
    </div>
  );
}

const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  tick: { fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

export function StateAreaChart({ points, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {STATE_ORDER.map((key) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={STATE_META[key].chart} stopOpacity={0.5} />
              <stop offset="100%" stopColor={STATE_META[key].chart} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="ts" tickFormatter={formatClock} {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={44} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        {STATE_ORDER.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={STATE_META[key].label}
            stackId="1"
            stroke={STATE_META[key].chart}
            fill={`url(#grad-${key})`}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ThroughputChart({ points, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="ts" tickFormatter={formatClock} {...axisProps} minTickGap={40} />
        <YAxis {...axisProps} width={44} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="enqueuedPerMin"
          name="Enqueued / min"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
