import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

// Design system: confirmation dialog variant of Modal

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
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
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
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        {variant === 'danger' && (
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-danger-50">
            <AlertTriangle size={20} className="text-danger-600" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1.5 text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
