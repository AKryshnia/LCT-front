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
    props.totalFlights == null ||
    props.avgDurationMin == null ||
    props.growthPct == null ||
    props.dailyAvg == null;

  const region = props.region ?? 'RU';
  const period = props.period ?? 'month';

  // KPI (totalFlights, avgDurationMin, ratio)
  const { data: kpiData } = useGetKpiQuery(
    { period, region, metric: 'count' },
    { skip: !needFetch, refetchOnMountOrArgChange: true }
  );
  
  const { data: tsData } = useGetTimeseriesQuery(
    { period, metric: 'count', region },
    { skip: !needFetch, refetchOnMountOrArgChange: true }
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

  const dailyAvgAuto = React.useMemo(() => {
    if (!tsData?.length) return 0;
    const sum = tsData.reduce((s, p) => s + Number(p.value ?? 0), 0);
    return Math.round(sum / tsData.length);
  }, [tsData]);

  const dailyAvg = needFetch ? dailyAvgAuto : Number((props as any).dailyAvg ?? 0);

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card className="bg-white border-none w-full h-full">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1 mb-6">
            {totalFlights.toLocaleString('ru-RU')}
          </div>
          <div className="text-slate-500 text-md">Общее число полетов</div>
        </CardContent>
      </Card>

      <Card className="bg-white border-none">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1 mb-6">
            {avgDurationMin} <span className="text-slate-400 text-sm">мин</span>
          </div>
          <div className="text-slate-500 text-md">Среднее время</div>
        </CardContent>
      </Card>

      <Card className="bg-white border-none">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold tabular-nums mt-1 mb-6">
            {growthPct}%
          </div>
          <div className="text-slate-500 text-md">Соотношение роста к падению</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-none">
        <CardContent className="p-4">
          <div className="text-3xl font-semibold text-gray-50 tabular-nums mt-1 mb-6">
            {dailyAvg.toLocaleString('ru-RU')}
          </div>
          <div className="text-gray-50 text-md">Среднесуточная статистика</div>
        </CardContent>
      </Card>
    </div>
  );
}
