import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card'; // остаётся только для ЛЕВОЙ панели
import { useGetRegionsQuery, useGetRegionStatisticsQuery } from '@/shared/api/lctApi';
import AreaTrend from '@/widgets/charts/AreaTrend';
import { BarChart3, Plane, GitCompare, Table, Share2, Search, ChevronDown} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getRegionName } from '@/shared/constants/regions';

type TabKey = 'overview' | 'trends' | 'compare' | 'table' | 'links';

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener?.('change', onChange) ?? mq.addListener?.(onChange);
    return () => mq.removeEventListener?.('change', onChange) ?? mq.removeListener?.(onChange);
  }, [query]);
  return matches;
}

const AnalyticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const region = searchParams.get('region') || '77';
  const period = searchParams.get('period') || '2025-Q3';
  const tabFromUrl = (searchParams.get('tab') as TabKey) || 'overview';

  const [tab, setTab] = React.useState<TabKey>(tabFromUrl);
  React.useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (tab && tab !== 'overview') p.set('tab', tab); else p.delete('tab');
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const { data: regions } = useGetRegionsQuery();
  const { data: stats } = useGetRegionStatisticsQuery({ regionCode: region });

  const totalFlights = stats?.summary?.total_flights ?? 0;
  const weeksCovered = stats?.summary?.weeks_covered ?? 0;
  const byYear = stats?.statistics?.by_year ?? [];
  const byYm = stats?.statistics?.by_year_and_month ?? [];

  const avgDurationMin = React.useMemo(() => {
    if (!byYear.length) return 0;
    const totalFlightsAll = byYear.reduce((s: number, y: any) => s + (y.flight_count ?? 0), 0);
    const totalDurationAll = byYear.reduce(
      (s: number, y: any) => s + (y.avg_flight_time ?? 0) * (y.flight_count ?? 0),
      0
    );
    return totalFlightsAll ? Math.round((totalDurationAll / totalFlightsAll) * 60) : 0;
  }, [byYear]);

  const trendSeries = React.useMemo(() => {
    if (!byYm.length) return [];
    const sorted = [...byYm].sort((a: any, b: any) => a.year - b.year);
    const latest = sorted[sorted.length - 1];
    return latest.months.map((m: any) => ({
      t: String(m.month).padStart(2, '0'),
      v: Number(m.flight_count ?? 0),
    }));
  }, [byYm]);

  const regionName = regions?.find((r: any) => r.code === region)?.name ?? 'Регион';

  // ===== full-bleed серый фон справа (как на главной) =====
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const asideRef = React.useRef<HTMLDivElement | null>(null);
  const [rightBgLeft, setRightBgLeft] = React.useState<number | null>(null);

  const measureRightBg = React.useCallback(() => {
    const root = rootRef.current;
    const aside = asideRef.current;
    if (!root || !aside) return;
    const rootBox = root.getBoundingClientRect();
    const asideBox = aside.getBoundingClientRect();
    const GAP_PX = 24; // gap-6
    const left = Math.round(asideBox.right - rootBox.left + GAP_PX);
    setRightBgLeft(left);
  }, []);

  React.useLayoutEffect(() => {
    measureRightBg();
    const onResize = () => measureRightBg();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureRightBg]);


  const isXL = useMediaQuery('(min-width: 1280px)');

  // читаем из URL (как на главной)
  const urlRegion = searchParams.get('region');
  const urlPeriod = (searchParams.get('period') as 'month'|'quarter'|'year'|null);

  // локальный стейт
  const [selectedRegion, setSelectedRegion] = React.useState<string | null>(urlRegion ?? '77'); // Москва по умолчанию
  const [periodMode, setPeriodMode] = React.useState<'month'|'quarter'|'year'>(urlPeriod ?? 'year');

  // запись обратно в URL
  React.useEffect(() => {
    const p = new URLSearchParams(searchParams);
    if (selectedRegion) p.set('region', selectedRegion); else p.delete('region');
    if (periodMode && periodMode !== 'year') p.set('period', periodMode); else p.delete('period');
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, periodMode]);

  // ========================================================

  return (
    <div ref={rootRef} className="relative isolate min-h-screen bg-slate-50 xl:bg-white">
      {/* full-bleed серый фон правой части до краёв экрана */}
      {rightBgLeft != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 bg-slate-50"
          style={{ left: `${rightBgLeft}px` }}
        />
      )}

      <div className="max-w-8xl mx-auto px-6 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Аналитика</h1>
          {/*<p className="text-slate-600 mt-1">Регион: {regionName} • Период: {period}</p>*/}
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* ЛЕВАЯ ПАНЕЛЬ (остаётся в виде Card) */}
          <aside ref={asideRef} className="col-span-12 xl:col-span-3 order-1 xl:w-max-[380px]">
            <div className="sticky top-20">
              <Card className="rounded-2xl border border-slate-100 shadow-none bg-white">
                <CardContent className="py-28">
                  <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} orientation="vertical">
                    <TabsList className="flex w-full flex-col gap-2 bg-transparent p-0">
                      <TabsTrigger
                        value="overview"
                        className="w-full justify-start rounded-xl px-3 py-2
                                   data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900
                                   hover:bg-slate-50 shadow-none"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Вся аналитика
                      </TabsTrigger>
                      <TabsTrigger value="trends"  className="w-full justify-start rounded-xl px-3 py-2 hover:bg-slate-50 data-[state=active]:bg-slate-100 shadow-none">
                        <Plane className="w-4 h-4 mr-2" /> Динамика полётов
                      </TabsTrigger>
                      <TabsTrigger value="compare" className="w-full justify-start rounded-xl px-3 py-2 hover:bg-slate-50 data-[state=active]:bg-slate-100 shadow-none">
                        <GitCompare className="w-4 h-4 mr-2" /> Сравнение регионов
                      </TabsTrigger>
                      <TabsTrigger value="table"   className="w-full justify-start rounded-xl px-3 py-2 hover:bg-slate-50 data-[state=active]:bg-slate-100 shadow-none">
                        <Table className="w-4 h-4 mr-2" /> Таблица регионов
                      </TabsTrigger>
                      <TabsTrigger value="links"   className="w-full justify-start rounded-xl px-3 py-2 hover:bg-slate-50 data-[state=active]:bg-slate-100 shadow-none">
                        <Share2 className="w-4 h-4 mr-2" /> Связи между городами
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* ПРАВАЯ ОБЛАСТЬ — без Card, на сером фоне до краёв экрана */}
          <section className="col-span-12 xl:col-span-9 order-2 space-y-4 relative z-10 xl:pl-6">
          
          {/* ───────── ФИЛЬТРЫ (Регион + Период + Поиск + Выгрузка) ───────── */}
          <div className="sticky top-20 z-20">
            <div>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-3">

                {/* Левая группа: Регион + Период (одинаковые по размеру) */}
                <div className="flex gap-2">
                  {/* Регион */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 w-[180px] justify-between rounded-[16px] border-none text-slate-500"
                        aria-label="Выбор региона"
                      >
                        {selectedRegion ? getRegionName(selectedRegion) : 'Россия'}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[60vh] overflow-auto z-50">
                      <DropdownMenuItem onClick={() => setSelectedRegion(null)}>Россия</DropdownMenuItem>
                      {(regions ?? []).map((r: any) => (
                        <DropdownMenuItem key={r.code} onClick={() => setSelectedRegion(String(r.code))}>
                          {r.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Период */}
                  <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as any)}>
                    <SelectTrigger
                      className="h-10 w-[180px] rounded-[16px] border-none text-slate-500 bg-white"
                      aria-label="Выбор периода"
                    >
                      <SelectValue placeholder="За квартал" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="quarter">За квартал</SelectItem>
                      <SelectItem value="year">За год</SelectItem>
                      <SelectItem value="month">За месяц</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Правая группа: Поиск (шире) + Выгрузка (компактнее) */}
                <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto">
                  {/* Поле поиска шире кнопки */}
                  <div className="relative flex-1 md:w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Поиск…"
                      className="h-10 pl-9 rounded-[16px] border-none text-slate-500"
                    />
                  </div>

                  {/* Кнопка выгрузки */}
                  <Button
                    variant="outline"
                    className="h-10 rounded-[16px] px-4 whitespace-nowrap border-none rounded-[12px] bg-sky-200 text-blue-600 hover:bg-sky-300 hover:text-blue-800"
                  >
                    Выгрузить данные
                  </Button>
                </div>
              </div>
            </div>
          </div>


            {tab === 'overview' && (
              <>
                {/* KPI — простые «тайлы» вместо Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-600">Всего полётов</div>
                    <div className="mt-2 text-3xl font-bold">{totalFlights.toLocaleString('ru-RU')}</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-600">Средняя длительность</div>
                    <div className="mt-2 text-3xl font-bold">
                      {Math.floor(avgDurationMin / 60)} ч {avgDurationMin % 60} мин
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-600">Недель с данными</div>
                    <div className="mt-2 text-3xl font-bold">{weeksCovered}</div>
                  </div>
                </div>

                {/* График — тоже без Card */}
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="text-base font-medium mb-3">Динамика по месяцам</div>
                  <AreaTrend data={trendSeries} />
                </div>
              </>
            )}

            {tab === 'trends' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-base font-medium mb-3">Временные ряды полётов</div>
                <AreaTrend data={trendSeries} />
                <p className="text-sm text-slate-500 mt-4">
                  Детальная таблица появится при интеграции с /api/flight.
                </p>
              </div>
            )}

            {tab === 'compare' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-base font-medium mb-1">Сравнение регионов</div>
                <p className="text-slate-500">Раздел в разработке…</p>
              </div>
            )}

            {tab === 'table' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-base font-medium mb-1">Таблица регионов</div>
                <p className="text-slate-500">Раздел в разработке…</p>
              </div>
            )}

            {tab === 'links' && (
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-base font-medium mb-1">Связи между городами</div>
                <p className="text-slate-500">Раздел в разработке…</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
