import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

// Design system:
// Height: 48px  |  Padding: 16px  |  Border radius: 10px
// Border: 1px gray-200  |  Focus: 2px primary-600 ring

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  helperText?: string;
  /** Icon placed on the left side inside the input */
  startIcon?: ReactNode;
  /** Icon / element placed on the right side inside the input */
  endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, startIcon, endIcon, className = '', ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label className="label-base">
            {label}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            className={[
              'input-base',
              startIcon ? 'pl-10' : '',
              endIcon || hasError ? 'pr-10' : '',
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
          />

          {/* Error icon takes priority over endIcon */}
          {hasError ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-danger-500 pointer-events-none">
              <AlertCircle size={16} />
            </span>
          ) : endIcon ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {endIcon}
            </span>
          ) : null}
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

Input.displayName = 'Input';
