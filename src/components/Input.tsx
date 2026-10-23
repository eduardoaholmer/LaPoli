import React, { useId } from 'react';

interface FieldProps {
  label?: string;
  error?: string;
  help?: string;
  optional?: boolean;
  fullWidth?: boolean;
}

interface InputProps
  extends FieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'inputMode' | 'prefix'> {
  icon?: React.ReactNode;
  prefix?: React.ReactNode; // ex.: "R$"
  suffix?: React.ReactNode; // ex.: "g", "%", "horas"
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'none';
}

const Field: React.FC<{
  id: string;
  label?: string;
  error?: string;
  help?: string;
  optional?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ id, label, error, help, optional, fullWidth, className = '', children }) => (
  <div className={`field ${className}`} style={fullWidth ? { width: '100%' } : undefined}>
    {label && (
      <label htmlFor={id}>
        {label}
        {optional && <span className="opt">(opcional)</span>}
      </label>
    )}
    {children}
    {error ? (
      <span id={`${id}-error`} className="help neg" role="alert">
        {error}
      </span>
    ) : (
      help && (
        <span id={`${id}-help`} className="help">
          {help}
        </span>
      )
    )}
  </div>
);

/** Campo de texto. Com `prefix`/`suffix` vira um grupo (R$ 0,00 · 100 g). */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  help,
  optional,
  icon,
  prefix,
  suffix,
  fullWidth = false,
  className = '',
  id,
  inputMode,
  ...props
}) => {
  const auto = useId();
  const inputId = id || auto;
  const describedBy = error ? `${inputId}-error` : help ? `${inputId}-help` : undefined;
  const cls = ['input', error ? 'is-error' : '', props.type === 'number' ? 'num-in' : '', className]
    .filter(Boolean)
    .join(' ');

  const control = (
    <input
      id={inputId}
      className={cls}
      aria-invalid={!!error}
      aria-describedby={describedBy}
      inputMode={inputMode}
      {...props}
    />
  );

  return (
    <Field id={inputId} label={label} error={error} help={help} optional={optional} fullWidth={fullWidth}>
      {prefix || suffix ? (
        <div className="input-group">
          {prefix && <span className="prefix">{prefix}</span>}
          {control}
          {suffix && <span className="suffix">{suffix}</span>}
        </div>
      ) : icon ? (
        <div className="search">
          {icon}
          {control}
        </div>
      ) : (
        control
      )}
    </Field>
  );
};

export const Select: React.FC<FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  label,
  error,
  help,
  optional,
  fullWidth = false,
  className = '',
  id,
  children,
  ...props
}) => {
  const auto = useId();
  const selectId = id || auto;
  return (
    <Field id={selectId} label={label} error={error} help={help} optional={optional} fullWidth={fullWidth}>
      <select
        id={selectId}
        className={['select', error ? 'is-error' : '', className].filter(Boolean).join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : help ? `${selectId}-help` : undefined}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
};

export const TextArea: React.FC<FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  label,
  error,
  help,
  optional,
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const auto = useId();
  const textareaId = id || auto;
  return (
    <Field id={textareaId} label={label} error={error} help={help} optional={optional} fullWidth={fullWidth}>
      <textarea
        id={textareaId}
        className={['textarea', error ? 'is-error' : '', className].filter(Boolean).join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : help ? `${textareaId}-help` : undefined}
        {...props}
      />
    </Field>
  );
};

/** Caixa de seleção com rótulo clicável (checklists e opções sim/não). */
export const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  id?: string;
}> = ({ checked, onChange, label, description, id }) => {
  const auto = useId();
  const inputId = id || auto;
  return (
    <label htmlFor={inputId} className="check-simple">
      <input id={inputId} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>
        <b>{label}</b>
        {description && <span className="small muted" style={{ display: 'block' }}>{description}</span>}
      </span>
    </label>
  );
};
