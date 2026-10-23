import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
});

/** Novelo de fio: não existe na biblioteca de ícones, então segue o mesmo traço fino (1,5 px). */
export const YarnIcon: React.FC<IconProps> = ({ size = 20, className, style }) => (
  <svg {...base(size)} className={className} style={style}>
    <circle cx="12" cy="12" r="9" />
    <path d="M4 9c5 2 11 2 16 0" />
    <path d="M3.5 14c5 2.5 12 2.5 17 0" />
    <path d="M8 4.5c1 5 1 10 0 15" />
    <path d="M19 19c1.5 1 2.5 1.2 3 .5" />
  </svg>
);
