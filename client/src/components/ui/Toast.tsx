import { useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import gsap from 'gsap';
import { useToastStore, ToastType } from '../../store/toastStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const toastConfig: Record<ToastType, { icon: React.ReactNode; classes: string; bar: string; iconColor: string }> = {
  success: { icon: <CheckCircle2 size={17} className="shrink-0" />, classes: 'bg-gray-900 text-white', bar: 'bg-success-500', iconColor: 'text-success-400' },
  error:   { icon: <XCircle      size={17} className="shrink-0" />, classes: 'bg-gray-900 text-white', bar: 'bg-danger-500',  iconColor: 'text-danger-400'  },
  warning: { icon: <AlertTriangle size={17} className="shrink-0" />, classes: 'bg-gray-900 text-white', bar: 'bg-warning-500', iconColor: 'text-warning-400' },
  info:    { icon: <Info          size={17} className="shrink-0" />, classes: 'bg-gray-900 text-white', bar: 'bg-info-500',    iconColor: 'text-info-400'    },
};

// Individual toast with GSAP entrance / exit animations
function ToastItem({ toast, onRemove }: { toast: any; onRemove: (id: string) => void }) {
  const ref     = useRef<HTMLDivElement>(null);
  const barRef  = useRef<HTMLDivElement>(null);
  const { icon, classes, bar, iconColor } = toastConfig[toast.type as ToastType];
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;

    if (prefersReduced) {
      // Under reduced motion, show instantly without animation
      gsap.set(ref.current, { x: 0, opacity: 1, scale: 1 });
      if (barRef.current) {
        gsap.set(barRef.current, { scaleX: 1 });
      }
    } else {
      // Standard animation: spring-in from right (reduced from 400ms to 250ms)
      gsap.fromTo(ref.current,
        { x: 80, opacity: 0, scale: 0.92 },
        { x: 0, opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' },
      );
      if (barRef.current) {
        gsap.fromTo(barRef.current,
          { scaleX: 1 },
          { scaleX: 0, duration: 4, ease: 'none', transformOrigin: 'left' },
        );
      }
    }
  }, [prefersReduced]);

  const dismiss = () => {
    if (!ref.current) { onRemove(toast.id); return; }
    gsap.to(ref.current, {
      x: 80, opacity: 0, scale: 0.92,
      duration: 0.2, ease: 'power2.in',
      onComplete: () => onRemove(toast.id),
    });
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={[
        'relative flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm overflow-hidden',
        classes,
      ].join(' ')}
      style={{ opacity: 0 }}
    >
      {/* Progress bar */}
      <div
        ref={barRef}
        className={`absolute bottom-0 left-0 right-0 h-[3px] ${bar} opacity-70`}
        style={{ transformOrigin: 'left' }}
      />

      <span className={`mt-0.5 ${iconColor}`}>{icon}</span>

      <div className="flex-1 min-w-0">
        {toast.title && <p className="font-semibold text-sm leading-tight">{toast.title}</p>}
        <p className={`${toast.title ? 'opacity-75 text-xs mt-0.5' : 'font-medium text-sm'}`}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={dismiss}
        className="ml-1 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-[360px]"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
