import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  showTexture?: boolean; // mantido por compatibilidade; a textura vem do CSS
}

/** Estado vazio: ilustração em linha, título em Fraunces e uma ação. Textura de crochê a ~5%. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, compact }) => (
  <div className={`empty ${compact ? 'compact' : ''}`}>
    {icon && <div className="ill-wrap">{icon}</div>}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && (
      <div className="acts">
        <button type="button" className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      </div>
    )}
  </div>
);
