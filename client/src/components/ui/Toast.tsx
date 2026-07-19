import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, ToastType } from '../../store/toastStore';

// Design system:
// Position: top-right  |  Duration: 4 seconds (set in store)
// Types: success, error, warning, info

const toastConfig: Record<
  ToastType,
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: <CheckCircle2 size={18} className="shrink-0" />,
    classes: 'bg-success-500 text-white',
  },
  error: {
    icon: <XCircle size={18} className="shrink-0" />,
    classes: 'bg-danger-500 text-white',
  },
  warning: {
    icon: <AlertTriangle size={18} className="shrink-0" />,
    classes: 'bg-warning-500 text-white',
  },
  info: {
    icon: <Info size={18} className="shrink-0" />,
    classes: 'bg-info-500 text-white',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    // Design system: top-right position
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm"
    >
      {toasts.map((toast) => {
        const { icon, classes } = toastConfig[toast.type];
        return (
          <div
            key={toast.id}
            role="alert"
            className={[
              'flex items-start gap-3 px-4 py-3 rounded-lg shadow-md text-sm',
              'animate-slide-in',
              classes,
            ].join(' ')}
          >
            {/* Icon */}
            <span className="mt-0.5">{icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="font-semibold leading-tight">{toast.title}</p>
              )}
              <p className={toast.title ? 'opacity-90 text-xs mt-0.5' : 'font-medium'}>
                {toast.message}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-1 mt-0.5 opacity-80 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
