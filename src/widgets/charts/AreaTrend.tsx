// src/widgets/charts/AreaTrend.tsx
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export type TrendPoint =
  | { t: string; v: number }
  | { t: string; avg: number; min: number; max: number };

type Props = {
  data: TrendPoint[];
  height?: number;
};

export default function AreaTrend({ data, height = 180 }: Props) {
  const hasBands =
    Array.isArray(data) && data.length > 0 && (data[0] as any).avg !== undefined;

  return (
    <div style={{ height }}>
      {hasBands && (
        <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#22c55e',
                display: 'inline-block',
              }}
            />
            Среднее
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#94a3b8',
                display: 'inline-block',
              }}
            />
            Мин.
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: '#334155',
                display: 'inline-block',
              }}
            />
            Макс.
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data as any}>
          <defs>
            <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis dataKey="t" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />

          {hasBands ? (
            <>
              <Line type="monotone" dataKey="avg" stroke="#22c55e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="min" stroke="#94a3b8" dot={false} strokeWidth={1} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="max" stroke="#334155" dot={false} strokeWidth={1} strokeDasharray="4 4" />
            </>
          ) : (
            <Area type="monotone" dataKey="v" stroke="#22c55e" fill="url(#areaGreen)" />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
