import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetKpiQuery } from '@/shared/api/lctApi';

type Props =
  | {
      /** если передать числа — хук не дергаем */
      totalFlights: number;
      avgDurationMin: number;
      growthPct: number;
      dailyAvg: number;
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
  const needFetch =
    props.totalFlights === undefined ||
    props.avgDurationMin === undefined ||
    props.growthPct === undefined ||
    props.dailyAvg === undefined;

  const region = ('region' in props && props.region) || 'RU';
  const period = ('period' in props && props.period) || '2025-Q3';

  const { data } = useGetKpiQuery({ region, period }, { skip: !needFetch });

  const totalFlights = needFetch ? data?.total_flights ?? 0 : (props as any).totalFlights;
  const avgDurationMin = needFetch ? data?.avg_duration_min ?? 0 : (props as any).avgDurationMin;
  const growthPct = needFetch ? data?.growth_ratio_pct ?? 0 : (props as any).growthPct;
  const dailyAvg = needFetch ? data?.daily_avg ?? 0 : (props as any).dailyAvg;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-muted">
        <CardContent className="p-4">
          <div className="text-slate-500 text-sm">Общее число полетов</div>
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {Number(totalFlights).toLocaleString('ru-RU')}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-slate-500 text-sm">Среднее время</div>
          <div className="text-3xl font-semibold tabular-nums mt-1">{avgDurationMin}</div>
          <div className="text-slate-500 text-xs mt-1">мин</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-slate-500 text-sm">Соотношение роста к падению</div>
          <div className="text-3xl font-semibold tabular-nums mt-1">{growthPct}%</div>
        </CardContent>
      </Card>
      <Card className="bg-foreground text-background">
        <CardContent className="p-4">
          <div className="text-sm opacity-80">Среднесуточная статистика</div>
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {Number(dailyAvg).toLocaleString('ru-RU')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
