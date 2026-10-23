import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

/**
 * Botões do "Ateliê Aconchegante". As variantes mantêm os nomes de antes
 * (primary, secondary, danger, ghost); o visual vem de styles/components.css.
 * - primary: terracota (uma ação principal por tela)
 * - secondary: contorno
 * - danger: contorno vermelho (a confirmação destrutiva usa `danger-solid`)
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  type = 'button',
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    fullWidth ? 'btn-block' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
};

/** Botão só com ícone (sempre com rótulo para leitor de tela). */
export const IconButton: React.FC<
  Omit<ButtonProps, 'children' | 'icon'> & { label: string; icon: React.ReactNode }
> = ({ label, icon, variant = 'ghost', size = 'md', className = '', type = 'button', ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={['btn', `btn-${variant}`, 'btn-icon', size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ')}
    {...props}
  >
    {icon}
  </button>
);
