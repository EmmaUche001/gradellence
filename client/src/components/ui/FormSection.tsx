import { ReactNode } from 'react';

/**
 * Reusable card section for forms.
 * Wraps a titled group of fields inside the design-system Card spec.
 */
interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <div className={`bg-surface rounded-card p-6 shadow-sm border border-border ${className}`}>
      {(title || description) && (
        <div className="mb-5 pb-4 border-b border-border">
          {title && <h3 className="text-card-title text-gray-900">{title}</h3>}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Sticky footer row with Cancel / Submit buttons */
interface FormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
  cancelLabel?: string;
}

export function FormActions({
  onCancel,
  submitLabel,
  loading = false,
  cancelLabel = 'Cancel',
}: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center h-10 px-5 text-sm font-medium text-gray-700 bg-surface border border-border rounded-btn hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center h-10 px-5 text-sm font-medium text-white bg-primary-600 rounded-btn hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving…
          </span>
        ) : submitLabel}
      </button>
    </div>
  );
}
