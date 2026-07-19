import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

// Design system:
// Radius: 20px  |  Max-width: 640px
// Primary action: bottom-right  |  Cancel: secondary

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Optional subtitle shown below the title */
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Prevent closing by clicking the backdrop */
  disableBackdropClose?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-[640px]', // design system default
  lg: 'max-w-3xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  disableBackdropClose = false,
  size = 'md',
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
      // Focus trap — move focus into modal
      setTimeout(() => contentRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] animate-fade-in"
        onClick={disableBackdropClose ? undefined : onClose}
      />

      {/* Panel */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className={[
          'relative w-full bg-surface rounded-modal shadow-lg flex flex-col',
          'max-h-[90vh] overflow-hidden animate-fade-in',
          'focus:outline-none',
          sizeClasses[size],
        ].join(' ')}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
            <div>
              {title && (
                <h3 id="modal-title" className="text-card-title text-gray-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400
                hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
              type="button"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer — primary action bottom-right per design system */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export Button for convenience in modal footers
export { Button };
