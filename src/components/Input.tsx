import React from 'react';
import { colors, borderRadius, spacing } from '../utils/theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  fullWidth = false,
  style,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : 'auto'
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: icon ? `${spacing.sm} ${spacing.lg} ${spacing.sm} ${spacing.md}` :
                   `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    border: `1px solid ${error ? colors.error : colors.border}`,
    fontSize: '16px',
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: '44px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...style
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primary}30`
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    right: spacing.md,
    color: colors.textLight,
    pointerEvents: 'none'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.text
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.error
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    Object.assign(e.target.style, inputFocusStyle);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = error ? colors.error : colors.border;
    e.target.style.boxShadow = 'none';
    props.onBlur?.(e);
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={inputId} style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        <input
          id={inputId}
          style={inputStyle}
          aria-label={label || props.placeholder}
          aria-invalid={!!error}
          aria-describedby={errorId}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {icon && <span style={iconStyle}>{icon}</span>}
      </div>
      {error && <span id={errorId} style={errorStyle} role="alert">{error}</span>}
    </div>
  );
};

export const Select: React.FC<InputProps & React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  label,
  error,
  fullWidth = false,
  style,
  children,
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${selectId}-error` : undefined;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : 'auto'
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    border: `1px solid ${error ? colors.error : colors.border}`,
    fontSize: '16px',
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: '44px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...style
  };

  const selectFocusStyle: React.CSSProperties = {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primary}30`
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.text
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.error
  };

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    Object.assign(e.target.style, selectFocusStyle);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    e.target.style.borderColor = error ? colors.error : colors.border;
    e.target.style.boxShadow = 'none';
    props.onBlur?.(e);
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={selectId} style={labelStyle}>{label}</label>}
      <select
        id={selectId}
        style={selectStyle}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={errorId}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}
      </select>
      {error && <span id={errorId} style={errorStyle} role="alert">{error}</span>}
    </div>
  );
};

export const TextArea: React.FC<InputProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  label,
  error,
  fullWidth = false,
  style,
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${textareaId}-error` : undefined;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    width: fullWidth ? '100%' : 'auto'
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    border: `1px solid ${error ? colors.error : colors.border}`,
    fontSize: '16px',
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: '88px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...style
  };

  const textareaFocusStyle: React.CSSProperties = {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primary}30`
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.text
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.error
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    Object.assign(e.target.style, textareaFocusStyle);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = error ? colors.error : colors.border;
    e.target.style.boxShadow = 'none';
    props.onBlur?.(e);
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={textareaId} style={labelStyle}>{label}</label>}
      <textarea
        id={textareaId}
        style={textareaStyle}
        aria-label={label || props.placeholder}
        aria-invalid={!!error}
        aria-describedby={errorId}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error && <span id={errorId} style={errorStyle} role="alert">{error}</span>}
    </div>
  );
};
