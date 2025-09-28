import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGetRegionsQuery,
  useGetKpiQuery,
  useGetTimeseriesQuery,
  useGetRankQuery,
} from '@/shared/api/lctApi';
import AreaTrend from '@/widgets/charts/AreaTrend';
import KpiTiles from '@/widgets/kpi/KpiTiles';

export const RegionPage: React.FC = () => {
  const { code = '01' } = useParams();
  const period = '2025-Q3';

  const { data: regions } = useGetRegionsQuery();
  const meta = regions?.find((r) => r.code === code);

  const { data: kpi } = useGetKpiQuery({ region: code, period, metric: 'count' });
  const { data: series } = useGetTimeseriesQuery({ region: code, period, metric: 'count' });
  const { data: rank } = useGetRankQuery({ region: code, period, metric: 'count' });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-brand-700">&larr; На главную</Link>
        <h1 className="text-2xl font-bold">
          {meta?.name ?? 'Регион'} • профиль {meta?.type_short ? `(${meta.type_short})` : ''}
        </h1>
      </header>

      <div className="grid grid-cols-12 gap-4">
        {/* Левый блок: карточка с базовой инфой */}
        <Card className="col-span-12 md:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Базовые показатели</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {meta?.image && (
                <img
                  src={meta.image}
                  alt="Герб"
                  className="w-16 h-16 rounded object-contain bg-white border"
                />
              )}
              <ul className="space-y-1">
                <li>
                  Население:{' '}
                  <span className="tabular-nums">
                    {meta?.population ? Number(meta.population).toLocaleString('ru-RU') : '—'}
                  </span>
                </li>
                <li>
                  Столица: <span>{meta?.capital?.name ?? '—'}</span>
                </li>
                <li>
                  Место в рейтинге:{' '}
                  <span className="tabular-nums">
                    {rank?.rank ?? '—'} {rank?.delta ? (rank.delta > 0 ? '▲' : '▼') : ''}
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Правый блок: KPI плитки */}
        <Card className="col-span-12 md:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">KPI за период {period}</CardTitle>
          </CardHeader>
          <CardContent>
          <KpiTiles
            totalFlights={kpi?.totalFlights ?? 0}
            avgDurationMin={kpi?.avgDurationMin ?? 0}
            growthPct={kpi?.ratio ?? 0}
            dailyAvg={kpi?.peakHour ?? 0}
          />
          </CardContent>
        </Card>

        {/* Тайм-серия */}
        <Card className="col-span-12">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Динамика полетов</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaTrend
              data={(series ?? []).map((p: any) => ({
                t: p.date?.slice(-2) ?? '',
                v: Number(p.value),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
