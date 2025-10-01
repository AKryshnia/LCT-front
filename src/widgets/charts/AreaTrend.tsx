// src/widgets/charts/AreaTrend.tsx
import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

export type TrendPoint =
  | { t: string; v: number }
  | { t: string; avg: number; min?: number; max?: number };

type Props = { data: TrendPoint[]; height?: number };

const fmtNum = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);

const C = {
  line: '#3B82F6',
  fillFrom: '#93C5FD',
  fillTo: '#EFF6FF',
  min: '#22C55E',
  max: '#EF4444',
  grid: '#E5E7EB',
  axis: '#94A3B8',
  tooltipBg: 'rgba(255,255,255,0.96)',
  tooltipBorder: '#E2E8F0',
};

export default function AreaTrend({ data, height = 180 }: Props) {
  const id = useId();
  const safeData = Array.isArray(data) ? data : [];
  const hasAvg = safeData.length > 0 && (safeData[0] as any).avg !== undefined;
  const yKey: 'avg' | 'v' = hasAvg ? 'avg' : 'v';

  const { yDomain, minIdx, maxIdx, minVal, maxVal, minLabel, maxLabel } = useMemo(() => {
    if (!safeData.length) {
      return { yDomain: [0, 1] as [number, number], minIdx: -1, maxIdx: -1, minVal: 0, maxVal: 0, minLabel: '', maxLabel: '' };
    }
    const vals = safeData.map((p: any) => Number(p?.[yKey] ?? 0));
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const top = Math.ceil(max * 1.15);
    const _minIdx = vals.indexOf(min);
    const _maxIdx = vals.indexOf(max);
    return {
      yDomain: [0, top > 0 ? top : 1] as [number, number],
      minIdx: _minIdx,
      maxIdx: _maxIdx,
      minVal: min,
      maxVal: max,
      minLabel: (safeData[_minIdx] as any)?.t ?? '',
      maxLabel: (safeData[_maxIdx] as any)?.t ?? '',
    };
  }, [safeData, yKey]);

  if (!safeData.length) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        Нет данных для отображения
      </div>
    );
  }

  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    if (index === minIdx) return <circle cx={cx} cy={cy} r={4} fill={C.min} stroke="#fff" strokeWidth={1.5} />;
    if (index === maxIdx) return <circle cx={cx} cy={cy} r={4} fill={C.max} stroke="#fff" strokeWidth={1.5} />;
    return null;
  };

  return (
    <div className="min-w-0">
      <div className="flex justify-end gap-4 text-[12px] mb-2">
        <LegendDot color={C.line} label="Показатель" />
        <LegendDot color={C.min} label="Мин." />
        <LegendDot color={C.max} label="Макс." />
      </div>

      <ResponsiveContainer width="100%" height={height} debounce={120}>
        <AreaChart data={safeData as any} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id={`areaFill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.fillFrom} stopOpacity={0.6} />
              <stop offset="100%" stopColor={C.fillTo} stopOpacity={0.6} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 3" />

          <XAxis
            dataKey="t"
            tick={{ fontSize: 12, fill: C.axis }}
            tickMargin={8}
            axisLine={{ stroke: C.grid }}
            tickLine={{ stroke: C.grid }}
            minTickGap={24}
            interval="preserveStartEnd"
          />

          <YAxis
            width={52}
            domain={yDomain}
            allowDecimals={false}
            padding={{ top: 8 }}
            tick={{ fontSize: 12, fill: C.axis }}
            tickMargin={8}
            axisLine={{ stroke: C.grid }}
            tickLine={{ stroke: C.grid }}
            tickFormatter={(v: any) => fmtNum(Number(v))}
          />

          <Tooltip
            cursor={{ stroke: C.grid }}
            wrapperStyle={{ pointerEvents: 'none' }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const curVal = Number((payload[0] as any)?.value ?? 0);

              const Row = ({ color, name, value, hint }: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />
                  <span style={{ color: '#64748b', minWidth: 64 }}>{name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(value)}</span>
                  {hint ? <span style={{ color: '#94a3b8', marginLeft: 6 }}>{hint}</span> : null}
                </div>
              );

              return (
                <div
                  style={{
                    background: C.tooltipBg,
                    border: `1px solid ${C.tooltipBorder}`,
                    borderRadius: 12,
                    padding: '8px 10px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#334155', marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <Row color={C.line} name="Показатель" value={curVal} />
                    <Row color={C.min}  name="Мин."   value={minVal} hint={minLabel && `• ${minLabel}`} />
                    <Row color={C.max}  name="Макс."  value={maxVal} hint={maxLabel && `• ${maxLabel}`} />
                  </div>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey={yKey}
            stroke={C.line}
            strokeWidth={2}
            strokeLinecap="round"
            fill={`url(#areaFill-${id})`}
            isAnimationActive={false}
            dot={<CustomDot />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: color }} />
      <span className="text-slate-500">{label}</span>
    </span>
  );
}
