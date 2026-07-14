import { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Input } from './Input';
import { Select } from './Select';

interface BaseFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

interface TextFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type: 'text' | 'email' | 'password';
}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'type'> {
  type: 'select';
  options: Array<{ value: string; label: string }>;
}

type FieldProps = TextFieldProps | SelectFieldProps;

export function FormField({ label, error, helperText, required, ...props }: FieldProps) {
  const requiredMark = required ? <span className="text-red-500 ml-1">*</span> : null;

  if (props.type === 'select') {
    const { options, ...selectProps } = props as SelectFieldProps;
    return (
      <Select
        label={label ? <>{label}{requiredMark}</> : undefined}
        error={error}
        helperText={helperText}
        options={options}
        {...selectProps}
      />
    );
  }

  const { type, ...inputProps } = props as TextFieldProps;
  return (
    <Input
      label={label ? <>{label}{requiredMark}</> : undefined}
      error={error}
      helperText={helperText}
      type={type}
      {...inputProps}
    />
  );
}