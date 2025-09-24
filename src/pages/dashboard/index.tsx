// src/pages/dashboard/index.tsx
import React from 'react';
import RussiaFlatMap from '@/features/map/ui/RussiaFlatMap';
import RegionCard from '@/features/region/ui/RegionCard';
import AreaTrend, { TrendPoint } from '@/widgets/charts/AreaTrend';
import KpiTiles from '@widgets/kpi/KpiTiles';
import TopRating from '@features/rating/ui/TopRating';
import RegionFocusedMap from '@/features/map/ui/RegionFocusedMap';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, PlaneTakeoff, PlaneLanding } from 'lucide-react';

import {
  useGetChoroplethQuery,
  useGetInsightQuery,
  useGetTimeseriesQuery,
  useGetRankQuery,
} from '@/shared/api/lctApi';

import { getRegionName } from '@/shared/constants/regions';

type PeriodMode = 'all' | 'year' | 'quarter' | 'month';

export default function DashboardPage() {
  const [selectedRegion, setSelectedRegion] = React.useState<string | null>(null);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>('all');

  // Map UI period to API period strings
  const apiPeriod = React.useMemo(() => {
    switch (periodMode) {
      case 'year':
        return '2025';
      case 'quarter':
        return '2025-Q3';
      case 'month':
        return '2025-07';
      default:
        return '2025';
    }
  }, [periodMode]);

  // Data for map coloring
  const { data: choropleth } = useGetChoroplethQuery({ metric: 'count', period: apiPeriod });

  // Insight copy under filters
  const { data: insight } = useGetInsightQuery({ region: 'RU', period: apiPeriod });

  // Current rank widget (overlay on the map)
  const { data: rank } = useGetRankQuery({ region: selectedRegion ?? 'RU', period: apiPeriod });

  // Timeseries for trend chart
  const tsPeriod = periodMode === 'month' ? apiPeriod : '2025-07';
  const { data: series } = useGetTimeseriesQuery({ region: selectedRegion ?? 'RU', period: tsPeriod });

  const trendData: TrendPoint[] = React.useMemo(() => {
    const monthLabel = 'Июля'; // демо: для 2025-07
    return (series ?? []).map((p) => {
      const v = Number(p.value);
      const day = p.date?.slice(-2) ?? '';
      // Синтетические мин/макс вокруг среднего, чтобы отрисовать «ленты», как в макете
      return { t: `${Number(day)} ${monthLabel}`, avg: v, min: Math.round(v * 0.85), max: Math.round(v * 1.15) } as TrendPoint;
    });
  }, [series]);

  const mapOverlay = (
    <div className="rounded-2xl bg-white/90 backdrop-blur border shadow p-3 w-[360px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">Место в рейтинге</div>
        <div className="text-xl font-semibold tabular-nums">{rank?.rank ?? '—'}</div>
      </div>
      <div>
        <div
          className="h-2 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, #BFE8F4 0%, #66C4E1 25%, #23A4CF 50%, #1379A6 75%, #0B4A6F 100%)',
          }}
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>1–10</span><span>10–30</span><span>30–50</span><span>50–70</span><span>70+</span>
        </div>
      </div>
    </div>
  );

  // Простая выгрузка мока экспорта
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/export?scope=${selectedRegion ? 'region' : 'all'}`);
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export-bvs.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-12 gap-4">
        {/* Правая колонка (всегда видна): общая статистика */}
        <aside className="col-span-12 xl:col-span-4 space-y-4">
          {/* Region + Period (как в макете, в правой панели) */}
          <div className="grid grid-cols-2 gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between">
                  {selectedRegion ? getRegionName(selectedRegion) : 'Россия'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSelectedRegion(null)}>Россия</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="За всё время" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">За всё время</SelectItem>
                <SelectItem value="year">За год</SelectItem>
                <SelectItem value="quarter">За квартал</SelectItem>
                <SelectItem value="month">За месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Инсайт: топ-3 регионов / активность БВС */}
          <Card>
            <CardContent className="p-4">
              <div className="text-xl font-semibold leading-snug">
                {insight?.title ?? 'Регион N вошёл в топ-3 по росту активности'}
              </div>
              <div className="text-slate-600 mt-1">
                {insight?.subtitle ?? 'Средняя длительность полётов БВС выросла на 25%'}
              </div>
            </CardContent>
          </Card>

          {/* Рейтинг регионов */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Рейтинг регионов</CardTitle>
            </CardHeader>
            <CardContent>
              <TopRating limit={3} metric="count" period={apiPeriod} />
            </CardContent>
          </Card>

          {/* Динамика полётов: тайлы KPI */}
          <div>
            <div className="text-base font-medium mb-2">Динамика полётов</div>
            <KpiTiles region={selectedRegion ?? 'RU'} period={apiPeriod} />
          </div>

          {/* График за период */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">График</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AreaTrend data={trendData} />
            </CardContent>
          </Card>

          {/* Последний полёт (демо) */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                <span>{new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                <span>{selectedRegion ? `Регион ${selectedRegion}` : 'Россия'}</span>
              </div>
              <div className="grid grid-cols-3 items-center">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 text-slate-700">
                    <PlaneTakeoff className="w-4 h-4" /> Вылет
                  </div>
                  <div className="text-slate-500 text-xs">12:00</div>
                </div>
                <div className="text-center text-slate-600 text-xs">12 минут в полёте</div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 text-slate-700">
                    Прилет <PlaneLanding className="w-4 h-4" />
                  </div>
                  <div className="text-slate-500 text-xs">12:12</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Кнопки */}
          <div className="space-y-2">
            <Button variant="ghost" className="w-full">Больше</Button>
            <Button onClick={handleExport} className="w-full bg-black hover:bg-black/90">Экспортировать данные</Button>
          </div>
        </aside>
                {/* Левая зона: общая карта или детальный вид региона */}
                <div className={`col-span-12 ${selectedRegion ? 'xl:col-span-5' : 'xl:col-span-8'} space-y-3`}>
          {selectedRegion ? (
            <>
              <RegionFocusedMap regionCode={selectedRegion} />
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Выбран регион {selectedRegion}</div>
                <Button variant="outline" size="sm" onClick={() => setSelectedRegion(null)}>Вернуться к карте</Button>
              </div>
            </>
          ) : (
            <>
              <RussiaFlatMap
                data={(choropleth ?? []).map((d) => ({ code: d.code, value: d.value }))}
                selectedRegion={selectedRegion ?? undefined}
                onSelect={(code) => setSelectedRegion(code)}
                overlay={mapOverlay}
              />
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">
                  Место в рейтинге – {rank?.rank ?? '—'}
                </div>
                <div className="flex-1" />
              </div>
            </>
          )}
        </div>

        {/* Центральная колонка: карточка региона (показывается только когда регион выбран) */}
        {selectedRegion && (
          <div className="col-span-12 xl:col-span-3">
            <RegionCard code={selectedRegion} period={apiPeriod} />
          </div>
        )}
      </div>
    </div>
  );
}
