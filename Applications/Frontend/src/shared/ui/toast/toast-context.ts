import { createContext, useContext } from 'react';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
  /** Already translated text. */
  message: string;
  severity?: ToastSeverity;
  /** One optional action, e.g. "Try again". */
  action?: { label: string; onClick: () => void };
}

export interface ToastApi {
  show: (toast: ToastOptions) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Show a toast in the global toast area (rendered by ToastProvider). */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
