import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toastCounter = 0;
let activeToasts: ToastItem[] = [];
const subscribers = new Set<(toasts: ToastItem[]) => void>();

function emitToastChange(): void {
  subscribers.forEach((subscriber) => subscriber([...activeToasts]));
}

export function useToast(): {
  showToast: (type: ToastType, message: string) => void;
  dismissToast: (id: string) => void;
} {
  const dismissToast = useCallback((id: string) => {
    activeToasts = activeToasts.filter((toast) => toast.id !== id);
    emitToastChange();
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${toastCounter += 1}`;
      activeToasts = [...activeToasts, { id, type, message }];
      emitToastChange();

      window.setTimeout(() => {
        dismissToast(id);
      }, type === 'error' ? 6000 : 4000);
    },
    [dismissToast]
  );

  return { showToast, dismissToast };
}

function toastAppearance(type: ToastType): {
  icon: LucideIcon;
  border: string;
  bg: string;
  iconColor: string;
} {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle2,
        border: 'rgba(74, 222, 128, 0.18)',
        bg: 'rgba(22, 163, 74, 0.12)',
        iconColor: '#4ade80',
      };
    case 'warning':
      return {
        icon: AlertCircle,
        border: 'rgba(252, 211, 77, 0.18)',
        bg: 'rgba(217, 119, 6, 0.12)',
        iconColor: '#fcd34d',
      };
    case 'error':
      return {
        icon: AlertCircle,
        border: 'rgba(252, 165, 165, 0.18)',
        bg: 'rgba(220, 38, 38, 0.12)',
        iconColor: '#fca5a5',
      };
    default:
      return {
        icon: Info,
        border: 'rgba(147, 197, 253, 0.18)',
        bg: 'rgba(37, 99, 235, 0.12)',
        iconColor: '#93c5fd',
      };
  }
}

export function ToastContainer(): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { dismissToast } = useToast();

  useEffect(() => {
    const handler = (nextToasts: ToastItem[]) => setToasts(nextToasts);
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-4 z-[170] flex w-[min(360px,calc(100%-32px))] flex-col gap-3">
      {toasts.map((toast) => {
        const appearance = toastAppearance(toast.type);
        const Icon = appearance.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className="surface-card flex items-start gap-3 px-4 py-3"
            style={{ borderColor: appearance.border, background: appearance.bg }}
          >
            <Icon size={18} style={{ color: appearance.iconColor }} />
            <p className="flex-1 text-body">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
