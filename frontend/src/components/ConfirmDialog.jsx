import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';

const ConfirmContext = createContext(null);

// Imperative confirm(): `const ok = await confirm({ title, message, danger })`.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative card w-full max-w-md p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              {state.danger && (
                <div className="rounded-full bg-rose-500/15 p-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{state.title || 'Are you sure?'}</h3>
                {state.message && (
                  <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => close(false)}>
                {state.cancelLabel || 'Cancel'}
              </Button>
              <Button
                variant={state.danger ? 'danger' : 'primary'}
                size="md"
                onClick={() => close(true)}
              >
                {state.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
