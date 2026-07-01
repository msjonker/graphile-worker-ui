import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from './api';
import { useLive } from './live.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';

// Centralises every mutating action: runs it, shows a toast, and triggers a
// global refresh so counts/tables update immediately.
export function useJobActions() {
  const { refreshNow } = useLive();
  const confirm = useConfirm();

  const wrap = useCallback(
    async (label, fn) => {
      try {
        const result = await fn();
        const n = result?.affected ?? result?.stillLocked;
        toast.success(typeof n === 'number' ? `${label} (${n})` : label);
        refreshNow();
        return result;
      } catch (err) {
        toast.error(`${label} failed: ${err.message}`);
        throw err;
      }
    },
    [refreshNow],
  );

  return {
    retry: (ids) => wrap('Retried', () => api.jobAction('retry', ids)),
    runNow: (ids) => wrap('Scheduled to run now', () => api.jobAction('runNow', ids)),
    reschedule: (ids, runAt) => wrap('Rescheduled', () => api.jobAction('reschedule', ids, { runAt })),
    setPriority: (ids, priority) =>
      wrap('Priority updated', () => api.jobAction('setPriority', ids, { priority })),
    complete: (ids) => wrap('Marked complete', () => api.jobAction('complete', ids)),

    fail: async (ids) => {
      const ok = await confirm({
        title: `Permanently fail ${ids.length} job(s)?`,
        message: 'They will stop retrying and be marked as failed.',
        confirmLabel: 'Fail jobs',
        danger: true,
      });
      if (ok) return wrap('Permanently failed', () => api.jobAction('fail', ids));
    },

    remove: async (ids) => {
      const ok = await confirm({
        title: `Delete ${ids.length} job(s)?`,
        message: 'This permanently removes the jobs. Running jobs are skipped.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (ok) return wrap('Deleted', () => api.jobAction('delete', ids));
    },

    unlockQueues: async (names) => {
      const ok = await confirm({
        title: `Unlock ${names.length} queue(s)?`,
        message: 'Clears a stuck lock so jobs can be picked up again. Only do this if the worker holding it has crashed.',
        confirmLabel: 'Unlock',
        danger: true,
      });
      if (ok) return wrap('Queue unlocked', () => api.unlockQueues(names));
    },

    unlockWorkers: async (ids) => {
      const ok = await confirm({
        title: `Release locks for ${ids.length} worker(s)?`,
        message: 'Frees their in-flight jobs and queue locks. Use only for workers you know have crashed.',
        confirmLabel: 'Release locks',
        danger: true,
      });
      if (ok) return wrap('Locks released', () => api.unlockWorkers(ids));
    },
  };
}
