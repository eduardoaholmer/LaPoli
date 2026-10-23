import React from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../calculations';

const dshort = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Entradas e saídas dos últimos dias, em barras pequenas (visão rápida, sem eixo). */
export const MiniBars: React.FC<{ days: { date: Date; in: number; out: number }[] }> = ({ days }) => {
  const max = Math.max(1, ...days.map(d => Math.max(d.in, d.out)));
  const W = 300;
  const H = 80;
  const bw = 7;
  const gap = (W - days.length * bw * 2) / days.length;
  const total = days.reduce((s, d) => s + d.in + d.out, 0);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Entradas e saídas dos últimos ${days.length} dias`} style={{ width: '100%', height: 'auto' }}>
      {days.map((d, i) => {
        const x = i * (bw * 2 + gap) + gap / 2;
        const h1 = (d.in / max) * (H - 16);
        const h2 = (d.out / max) * (H - 16);
        return (
          <g key={i}>
            <rect x={x} y={H - 14 - h1} width={bw} height={d.in ? Math.max(h1, 2) : 0} rx={3} fill="var(--color-secondary)" />
            <rect x={x + bw + 1} y={H - 14 - h2} width={bw} height={d.out ? Math.max(h2, 2) : 0} rx={3} fill="var(--color-primary-light)" />
            {i % 3 === 0 && (
              <text x={x + bw} y={H - 1} textAnchor="middle" style={{ fontSize: 10 }}>
                {dshort(d.date)}
              </text>
            )}
          </g>
        );
      })}
      {total === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" style={{ fontSize: 12 }}>
          Sem movimentações neste período
        </text>
      )}
    </svg>
  );
};

/** Evolução do saldo de caixa no período (gráfico de linha, com eixo e tooltip). */
export const CashLineChart: React.FC<{ points: { date: Date; balance: number }[] }> = ({ points }) => {
  const data = points.map(p => ({ label: dshort(p.date), value: p.balance }));
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.length / 6))} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={v => formatCurrency(v).replace('R$', '').trim()} />
          <Tooltip formatter={v => formatCurrency(Number(v))} labelFormatter={l => `Dia ${l}`} />
          <Line type="monotone" dataKey="value" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
