import { useRef, useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import gsap from 'gsap';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  itemCount?: number; // Show count of items being affected
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = 'Are you sure?', message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', loading = false, itemCount,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shakeScheduled, setShakeScheduled] = useState(false);

  // Shake the panel when user hovers over the confirm button — subtle warning
  const handleConfirmHover = useCallback(() => {
    if (variant !== 'danger' || !panelRef.current || shakeScheduled) return;
    
    setShakeScheduled(true);
    gsap.killTweensOf(panelRef.current);
    gsap.fromTo(panelRef.current,
      { x: 0 },
      {
        x: 5,
        duration: 0.07,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 5,
        overwrite: 'auto', // Prevent animation restart if user re-hovers
        onComplete: () => {
          gsap.set(panelRef.current!, { x: 0 });
          setShakeScheduled(false);
        },
      },
    );
  }, [variant, shakeScheduled]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            onMouseEnter={handleConfirmHover}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div ref={panelRef} className="flex gap-4">
        {variant === 'danger' && (
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-danger-50">
            <AlertTriangle size={20} className="text-danger-600" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {itemCount && (
            <p className="mt-1.5 text-sm font-medium text-danger-600">
              {itemCount} item{itemCount !== 1 ? 's' : ''} will be affected
            </p>
          )}
          <p className="mt-1.5 text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
