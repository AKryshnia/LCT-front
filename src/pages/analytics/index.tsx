import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetRegionsQuery, useGetRegionStatisticsQuery, useGetFlightsQuery } from '@/shared/api/lctApi';
import AreaTrend from '@/widgets/charts/AreaTrend';

const AnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const region = searchParams.get('region') || '77'; // Москва по умолчанию
  const period = searchParams.get('period') || '2025-Q3';

  const { data: regions } = useGetRegionsQuery();
  const { data: stats } = useGetRegionStatisticsQuery({ regionCode: region });

  // Подготовка данных для Overview
  const totalFlights = stats?.summary?.total_flights ?? 0;
  const weeksCovered = stats?.summary?.weeks_covered ?? 0;
  const byYear = stats?.statistics?.by_year ?? [];
  const avgDurationMin = (() => {
    if (!byYear.length) return 0;
    const totalFlightsAll = byYear.reduce((s, y) => s + (y.flight_count ?? 0), 0);
    const totalDurationAll = byYear.reduce(
      (s, y) => s + (y.avg_flight_time ?? 0) * (y.flight_count ?? 0),
      0
    );
    return totalFlightsAll ? Math.round((totalDurationAll / totalFlightsAll) * 60) : 0;
  })();

  // Подготовка данных для Trends
  const byYm = stats?.statistics?.by_year_and_month ?? [];
  const trendSeries = (() => {
    if (!byYm.length) return [];
    const sorted = [...byYm].sort((a, b) => a.year - b.year);
    const latest = sorted[sorted.length - 1];
    return latest.months.map((m) => ({
      t: String(m.month).padStart(2, '0'),
      v: Number(m.flight_count ?? 0),
    }));
  })();

  const regionName = regions?.find((r) => r.code === region)?.name ?? 'Регион';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Аналитика полётов БАС</h1>
        <p className="text-slate-600 mt-1">
          Регион: {regionName} • Период: {period}
        </p>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="trends">Тренды</TabsTrigger>
          <TabsTrigger value="types">Типы</TabsTrigger>
          <TabsTrigger value="zones">Зоны</TabsTrigger>
          <TabsTrigger value="duration">Длительность</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Всего полётов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalFlights.toLocaleString('ru-RU')}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Средняя длительность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(avgDurationMin / 60)} ч {avgDurationMin % 60} мин
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Недель с данными
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{weeksCovered}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Динамика по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaTrend data={trendSeries} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Временные ряды полётов</CardTitle>
            </CardHeader>
            <CardContent>
              <AreaTrend data={trendSeries} />
              <p className="text-sm text-slate-500 mt-4">
                Детальная таблица полётов с пагинацией будет добавлена при интеграции с /api/flight
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Анализ по типам полётов</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">
                Раздел в разработке. Данные будут загружаться из MSW или API при наличии endpoint.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Анализ по зонам</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">
                Раздел в разработке. Данные будут загружаться из MSW или API при наличии endpoint.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Распределение длительности полётов (EET)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">
                Раздел в разработке. Гистограмма EET будет построена на основе данных из /api/flight.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
