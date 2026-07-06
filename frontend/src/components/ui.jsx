import React from 'react';
import { cn } from '../lib/cn';
import { STATE_META } from '../lib/jobState';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-5 py-4 border-b', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-none truncate">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = 'ghost', size = 'sm', className, children, ...props }) {
  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'btn-outline',
    danger: 'btn-danger',
  };
  const sizes = { sm: 'btn-sm', md: 'btn-md', icon: 'h-8 w-8 p-0' };
  return (
    <button className={cn('btn', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function Badge({ className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StateBadge({ state, pulse = false }) {
  const meta = typeof state === 'string' ? STATE_META[state] : state;
  if (!meta) return null;
  return (
    <Badge className={meta.badge}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot, pulse && 'animate-pulse')} />
      {meta.label}
    </Badge>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent = 'text-foreground', dot, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'card p-4 text-left flex flex-col gap-2 animate-fade-in',
        onClick && 'hover:border-primary/50 transition-colors cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', accent)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Comp>
  );
}

export function Spinner({ className }) {
  return (
    <svg className={cn('animate-spin h-4 w-4', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function EmptyState({ icon: Icon, title, message, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/40" />}
      <h3 className="mt-3 text-sm font-medium">{title}</h3>
      {message && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{message}</p>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function ErrorPanel({ error }) {
  return (
    <div className="card border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-400">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-rose-400/80">{error?.message || String(error)}</p>
    </div>
  );
}

// Segmented control used for filters and time-window pickers.
export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cn('inline-flex items-center rounded-lg border bg-surface p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={String(opt.value ?? opt.key)}
          onClick={() => onChange(opt.value ?? opt.key)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            (opt.value ?? opt.key) === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
