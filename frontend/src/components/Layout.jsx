import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Layers,
  Cpu,
  Boxes,
  CalendarClock,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { useTheme } from '../lib/theme.jsx';
import { useLive, REFRESH_OPTIONS } from '../lib/live.jsx';
import { Segmented } from './ui';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/jobs', label: 'Jobs', icon: ListChecks },
  { to: '/queues', label: 'Queues', icon: Layers },
  { to: '/workers', label: 'Workers', icon: Cpu },
  { to: '/tasks', label: 'Tasks', icon: Boxes },
  { to: '/schedules', label: 'Schedules', icon: CalendarClock },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
        <Radio className="h-4 w-4 text-white" strokeWidth={2.4} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Graphile Worker</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observability</div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-muted-foreground border-t">
        Postgres-backed job queue monitor
      </div>
    </div>
  );
}

function TopBar({ onMenu }) {
  const { theme, toggle } = useTheme();
  const { intervalMs, setIntervalMs, live, hidden, refreshNow } = useLive();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <button className="btn btn-ghost btn-sm lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            'flex h-2.5 w-2.5 rounded-full',
            live ? 'bg-emerald-500 animate-pulse-ring' : 'bg-muted-foreground/40',
          )}
        />
        <span className="font-medium text-muted-foreground">
          {hidden ? 'Paused (tab hidden)' : live ? 'Live' : 'Paused'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Segmented
          options={REFRESH_OPTIONS}
          value={intervalMs}
          onChange={setIntervalMs}
          className="hidden sm:inline-flex"
        />
        <button className="btn btn-outline btn-sm" onClick={refreshNow} title="Refresh now">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button className="btn btn-outline btn-sm" onClick={toggle} title="Toggle theme">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-surface">
            <button className="btn btn-ghost btn-sm absolute right-2 top-3" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1400px] p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
