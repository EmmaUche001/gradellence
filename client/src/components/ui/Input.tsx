import { InputHTMLAttributes, ReactNode, forwardRef, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  helperText?: string;
  success?: boolean; // Show success state after validation passes
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, success, startIcon, endIcon, className = '', onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError  = Boolean(error);
    const hasValue  = props.value !== undefined ? props.value !== '' : false;
    const isLifted  = isFocused || hasValue; // label floats when focused OR has value

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    }, [onBlur]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className={[
              'block font-medium transition-all duration-200 ease-out select-none',
              isLifted
                ? `text-[11px] font-semibold mb-1 -translate-y-0.5 ${isFocused ? 'text-primary-600' : success ? 'text-success-600' : 'text-gray-500'}`
                : 'text-sm text-gray-700 mb-1.5',
            ].join(' ')}
            style={isLifted ? { transform: 'translateY(-2px)' } : undefined}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <span className={[
              'absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150',
              isFocused ? 'text-primary-500' : success ? 'text-success-500' : 'text-gray-400',
            ].join(' ')}>
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={[
              'input-base',
              'transition-all duration-200',
              startIcon ? 'pl-10' : '',
              endIcon || hasError || success ? 'pr-10' : '',
              hasError
                ? 'border-l-4 border-l-danger-500 border-danger-500 focus:border-danger-500 focus:ring-danger-500 ml-[-4px] pl-2'
                : success
                  ? 'border-success-500 focus:border-success-500 focus:ring-success-500 bg-success-50/30'
                  : isFocused
                    ? 'border-primary-400 shadow-[0_0_0_3px_rgba(37,99,235,0.08)] animate-focus-ring'
                    : 'hover:border-gray-300',
              className,
            ].filter(Boolean).join(' ')}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {hasError ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-danger-500 pointer-events-none">
              <AlertCircle size={16} className="animate-pulse" />
            </span>
          ) : success ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-success-500 pointer-events-none animate-scale-in">
              <CheckCircle2 size={16} />
            </span>
          ) : endIcon ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {endIcon}
            </span>
          ) : null}
        </div>

        {error && (
          <p id={`${props.id}-error`} role="alert"
            className="mt-1.5 text-xs font-semibold text-danger-600 animate-slideDown flex items-center gap-1">
            {error}
          </p>
        )}
        {success && !error && (
          <p id={`${props.id}-success`} className="mt-1.5 text-xs font-medium text-success-600 animate-slideDown flex items-center gap-1">
            ✓ Looking good
          </p>
        )}
        {helperText && !error && !success && (
          <p id={`${props.id}-helper`} className="mt-1.5 text-xs text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
