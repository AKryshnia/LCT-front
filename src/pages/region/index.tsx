import React from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useGetRegionsQuery,
  useGetRegionStatisticsQuery,
  useGetRankQuery,
} from '@/shared/api/lctApi';
import AreaTrend from '@/widgets/charts/AreaTrend';
import KpiTiles from '@/widgets/kpi/KpiTiles';

export const RegionPage: React.FC = () => {
  const { code = '01' } = useParams();
  const [searchParams] = useSearchParams();
  const period = searchParams.get('period') || '2025-Q3';

  const { data: regions } = useGetRegionsQuery();
  const meta = regions?.find((r) => r.code === code);

  const { data: stats } = useGetRegionStatisticsQuery({ regionCode: code });
  // KPI из summary и by_year (взвешенная средняя длительность по годам)
  const totalFlights = stats?.summary?.total_flights ?? 0;
  const weeksCovered = stats?.summary?.weeks_covered ?? 0;
  const byYear = stats?.statistics?.by_year ?? [];
  const { avgDurationMin, growthPct, dailyAvg } = (() => {
    if (!byYear.length) return { avgDurationMin: 0, growthPct: 0, dailyAvg: 0 };
    const totalFlightsAll = byYear.reduce((s, y) => s + (y.flight_count ?? 0), 0);
    const totalDurationAll = byYear.reduce((s, y) => s + (y.avg_flight_time ?? 0) * (y.flight_count ?? 0), 0);
    const avg = totalFlightsAll ? Math.round((totalDurationAll / totalFlightsAll) * 60) : 0;
    const sorted = [...byYear].sort((a, b) => a.year - b.year);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const yoy = prev?.flight_count ? Math.round(((last.flight_count - prev.flight_count) / prev.flight_count) * 100) : 0;
    const dAvg = weeksCovered ? Math.round((totalFlights ?? 0) / (weeksCovered * 7)) : 0;
    return { avgDurationMin: avg, growthPct: yoy, dailyAvg: dAvg };
  })();
  // Ряд для графика из by_year_and_month (берем последний доступный год)
  const byYm = stats?.statistics?.by_year_and_month ?? [];
  const sortedByYm = [...byYm].sort((a, b) => a.year - b.year);
  let series: { date: string; value: number }[] = [];
  if (sortedByYm.length) {
    const latest = sortedByYm[sortedByYm.length - 1];
    series = latest.months.map((m) => ({
      date: `${latest.year}-${String(m.month).padStart(2, '0')}-01`,
      value: Number(m.flight_count ?? 0),
    }));
  }
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
                  {meta?.population
                    ? (typeof meta.population === 'number'
                        ? meta.population
                        : Number(String(meta.population).replace(/\s/g, '').replace(',', '.'))
                      ).toLocaleString('ru-RU')
                    : '—'}
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
            totalFlights={totalFlights}
            avgDurationMin={avgDurationMin}
            growthPct={growthPct}
            dailyAvg={dailyAvg}
            region={code}
            period={period}
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
                t: String(p.date ?? '').slice(-2), // "01".."12"
                v: Number(p.value),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
