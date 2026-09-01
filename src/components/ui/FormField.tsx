import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldWrapProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldWrapProps) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-strawberry-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <Field label={label} htmlFor={inputId} error={error} hint={hint}>
        <input
          id={inputId}
          ref={ref}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
      </Field>
    );
  },
);
TextInput.displayName = 'TextInput';

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ label, error, id, children, className = '', ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <Field label={label} htmlFor={inputId} error={error}>
        <select
          id={inputId}
          ref={ref}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
      </Field>
    );
  },
);
SelectInput.displayName = 'SelectInput';
