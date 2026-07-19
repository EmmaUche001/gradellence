import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

// Design system: same height/padding/radius as Input

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  /** Optional placeholder option shown when no value is selected */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label className="label-base">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={[
              'input-base appearance-none pr-10 cursor-pointer',
              hasError
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron / error icon */}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {hasError ? (
              <AlertCircle size={16} className="text-danger-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </span>
        </div>

        {error && (
          <p id={`${props.id}-error`} className="mt-1.5 text-xs font-medium text-danger-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${props.id}-helper`} className="mt-1.5 text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
