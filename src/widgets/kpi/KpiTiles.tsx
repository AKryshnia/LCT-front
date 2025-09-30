// src/widgets/kpi/KpiTiles.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetKpiQuery, useGetTimeseriesQuery } from '@/shared/api/lctApi';

type Props =
  | {
      /** если передать числа — хук не дергаем */
      totalFlights: number;
      avgDurationMin: number;
      growthPct: number; // %, уже посчитан на странице
      dailyAvg: number;  // среднесуточное, уже посчитано на странице
      region?: string;
      period?: string;
    }
  | {
      /** если числа не переданы — грузим по region/period */
      totalFlights?: undefined;
      avgDurationMin?: undefined;
      growthPct?: undefined;
      dailyAvg?: undefined;
      region?: string;
      period?: string;
    };

export default function KpiTiles(props: Props) {
  // если хотя бы одно из чисел не передано — переходим в «неконтролируемый» режим
  const needFetch =
    props.totalFlights === undefined ||
    props.avgDurationMin === undefined ||
    props.growthPct === undefined ||
    props.dailyAvg === undefined;

  const region = ('region' in props && props.region) || 'RU';
  const period = ('period' in props && props.period) || '2025-Q3';

  // KPI (totalFlights, avgDurationMin, ratio)
  const { data: kpiData } = useGetKpiQuery(
    { period, region, metric: 'count' },
    { skip: !needFetch }
  );

  // Таймсерия: нужна только чтобы честно посчитать среднесуточное значение
  const { data: tsData } = useGetTimeseriesQuery(
    { period, metric: 'count', region },
    { skip: !needFetch }
  );

  // контролируемые значения приходят из props; иначе берём из API
  const totalFlights = needFetch
    ? Number(kpiData?.totalFlights ?? 0)
    : Number((props as any).totalFlights);

  const avgDurationMin = needFetch
    ? Math.round(Number(kpiData?.avgDurationMin ?? 0))
    : Math.round(Number((props as any).avgDurationMin ?? 0));

  const growthPct = needFetch
    ? Math.round(Number(kpiData?.ratio ?? 0))
    : Math.round(Number((props as any).growthPct ?? 0));

  // Среднесуточное: если контролируемый режим — берём из props;
  // иначе считаем по таймсерии (сумма значений / число дней)
  const dailyAvgAuto = React.useMemo(() => {
    if (!tsData || !Array.isArray(tsData) || tsData.length === 0) return 0;
    const sum = tsData.reduce((s, p) => s + Number(p?.value ?? 0), 0);
    return Math.round(sum / tsData.length);
  }, [tsData]);

  const dailyAvg = needFetch
    ? dailyAvgAuto
    : Number((props as any).dailyAvg ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-transparent">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {totalFlights.toLocaleString('ru-RU')}
          </div>
          <div className="text-slate-500 text-md">Общее число полетов</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {avgDurationMin} <span className="text-slate-500 text-xs">мин</span>
          </div>
          <div className="text-slate-500 text-md">Среднее время</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {growthPct}%
          </div>
          <div className="text-slate-500 text-md">Соотношение роста к падению</div>
        </CardContent>
      </Card>

      <Card className="bg-foreground text-background">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {dailyAvg.toLocaleString('ru-RU')}
          </div>
          <div className="text-slate-100 text-md">Среднесуточная статистика</div>
        </CardContent>
      </Card>
    </div>
  );
}
