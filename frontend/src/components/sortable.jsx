import React, { useCallback, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/cn';

// Reusable client-side table sorting. `valueFn(row, key)` should return a
// comparable primitive for a given column; keep it at module scope in callers so
// the memo stays stable.
export function useClientSort(rows, initial, valueFn) {
  const [sort, setSort] = useState(initial);

  const sorted = useMemo(() => {
    const list = [...(rows || [])];
    list.sort((a, b) => {
      const av = valueFn(a, sort.key);
      const bv = valueFn(b, sort.key);
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? c : -c;
    });
    return list;
  }, [rows, sort, valueFn]);

  const toggle = useCallback(
    (key, defaultDir = 'asc') =>
      setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: defaultDir })),
    [],
  );

  return { sorted, sort, toggle };
}

// A sortable <th>. Pass `sort`/`toggle` from useClientSort. Omit `sortKey` for a
// plain, non-sortable header.
export function SortTh({ label, sortKey, sort, toggle, defaultDir = 'asc', align = 'left', className }) {
  const active = sortKey && sort.key === sortKey;
  return (
    <th className={cn('px-4 py-2.5 font-medium', align === 'right' && 'text-right', className)}>
      {sortKey ? (
        <button
          onClick={() => toggle(sortKey, defaultDir)}
          className={cn('group inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
        >
          {label}
          {active ? (
            sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40" />
          )}
        </button>
      ) : (
        label
      )}
    </th>
  );
}
