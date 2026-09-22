import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', checked, onChange, ...props }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 200);
      }
      onChange?.(e);
    };

    return (
      <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className={`
            w-4 h-4 rounded border-border
            text-primary-600
            focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
            cursor-pointer
            transition-all duration-150
            ${isAnimating || checked ? 'animate-checkbox-spring' : ''}
          `}
          {...props}
        />
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';