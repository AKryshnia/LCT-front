// src/widgets/charts/LastFlightCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PlaneTakeoff, PlaneLanding, Plane, Clock } from 'lucide-react';
import { useGetLastFlightQuery, type FlightRow } from '@/shared/api/lctApi';
import { getRegionName } from '@/shared/constants/regions';

type Props = {
  period: string;              // apiPeriod со страницы
  regionCode?: string | null;  // "01".."99" или null (Россия)
};

const toRuDate = (iso?: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : '—');

function durationMin(f?: FlightRow | null): number {
  if (!f) return 0;
  const eet = Number(f.eet);
  if (Number.isFinite(eet) && eet > 0) return Math.round(eet);
  const parse = (s?: string) => {
    if (!s) return NaN;
    const [hh, mm = '0', ss = '0'] = String(s).split(':');
    return Number(hh) * 60 + Number(mm) + Number(ss) / 60;
  };
  const d = parse(f.dep_time);
  const a = parse(f.arr_time);
  if (!Number.isFinite(d) || !Number.isFinite(a)) return 0;
  let diff = a - d;
  if (diff < 0) diff += 24 * 60; // через полночь
  return Math.round(diff);
}

const pluralMin = (n: number) => {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'минута';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'минуты';
  return 'минут';
};

export default function LastFlightCard({ period, regionCode }: Props) {
  const { data: last, isFetching } = useGetLastFlightQuery({
    period,
    region: regionCode ?? 'RU',
  });

  const dur = durationMin(last);
  const regionLabel = regionCode ? getRegionName(regionCode) : 'Россия';

  return (
    <Card className="rounded-2xl border-slate-200/70 shadow-sm">
      <CardContent className="p-4">
        {/* Header: дата слева, регион справа */}
        <div className="flex items-center justify-between text-[13px] leading-none text-slate-400 mb-3">
          <span>{toRuDate(last?.dof)}</span>
          <span className="truncate">{regionLabel}</span>
        </div>

        {isFetching ? (
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 rounded bg-slate-200" />
              <div className="h-px bg-slate-200 flex-1" />
              <div className="w-4 h-4 rounded bg-slate-200" />
              <div className="h-px bg-slate-200 flex-1" />
              <div className="w-4 h-4 rounded bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          </div>
        ) : last ? (
          <>
            {/* Три иконки и две «перемычки» */}
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <PlaneTakeoff className="w-4 h-4 shrink-0" />
              <div className="h-px bg-slate-200 flex-1" />
              <Plane className="w-4 h-4 shrink-0" />
              <div className="h-px bg-slate-200 flex-1" />
              <PlaneLanding className="w-4 h-4 shrink-0" />
            </div>

            {/* Три колонки как в макете */}
            <div className="grid grid-cols-3 items-start">
              {/* Вылет */}
              <div className="text-left">
                <div className="text-slate-900 font-semibold leading-tight">Вылет</div>
                <div className="text-slate-500 text-sm tabular-nums mt-0.5">
                  {hhmm(last.dep_time)}
                </div>
              </div>

              {/* Длительность */}
              <div className="text-center text-slate-500 text-sm flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {dur > 0 ? `${dur} ${pluralMin(dur)} в полёте` : '—'}
              </div>

              {/* Прилет */}
              <div className="text-right">
                <div className="text-slate-900 font-semibold leading-tight">Прилет</div>
                <div className="text-slate-500 text-sm tabular-nums mt-0.5">
                  {hhmm(last.arr_time)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-slate-500 text-sm">Нет данных о последнем полёте</div>
        )}
      </CardContent>
    </Card>
  );
}
