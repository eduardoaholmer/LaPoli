import React from 'react';

interface ScreenLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

/** Cabeçalho de página padrão (título em Fraunces, subtítulo e ações) e conteúdo. */
export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ children, title, subtitle, action }) => (
  <div>
    {(title || subtitle || action) && (
      <div className="page-head">
        <div className="head-main">
          {title && <h1>{title}</h1>}
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {action && <div className="actions">{action}</div>}
      </div>
    )}
    {children}
  </div>
);
