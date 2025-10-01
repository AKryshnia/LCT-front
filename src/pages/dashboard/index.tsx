// src/pages/dashboard/index.tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import RussiaFlatMap from '@/features/map/ui/RussiaFlatMap';
import RegionCard from '@/features/region/ui/RegionCard';
import AreaTrend, { TrendPoint } from '@/widgets/charts/AreaTrend';
import KpiTiles from '@widgets/kpi/KpiTiles';
import TopRating from '@features/rating/ui/TopRating';
import RegionFocusedMap from '@/features/map/ui/RegionFocusedMap';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, PlaneTakeoff, PlaneLanding } from 'lucide-react';

import {
  useGetChoroplethQuery,
  useGetInsightQuery,
  useGetRankQuery,
  useGetRegionsQuery,
  useGetFlightsRangeQuery,
  type FlightRow,
} from '@/shared/api/lctApi';

import { getRegionName } from '@/shared/constants/regions';
import LastFlightCard from '@/widgets/charts/LastFlightCard';
import ExportDialog from '@/features/export/ui/ExportDialog';

type PeriodMode = 'all' | 'year' | 'quarter' | 'month';


/* ───────────────── helpers: диапазон дат под выбранный период ───────────────── */

const pad = (n: number) => String(n).padStart(2, '0');

function periodToRange(mode: PeriodMode, apiPeriod: string) {
  const pad = (n: number) => String(n).padStart(2, '0');

  // Явный диапазон
  const m = /^range:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(apiPeriod);
  if (m) {
    return { from: m[1], to: m[2], granularity: 'month' as const }; // для 12м берём помесячно
  }

  if (/^\d{4}-\d{2}$/.test(apiPeriod)) {
    const [y, mm] = apiPeriod.split('-').map(Number);
    const last = new Date(y, mm, 0).getDate();
    return { from: `${y}-${pad(mm)}-01`, to: `${y}-${pad(mm)}-${pad(last)}`, granularity: 'day' as const };
  }
  if (/^\d{4}-Q[1-4]$/.test(apiPeriod)) {
    const [yStr, qStr] = apiPeriod.split('-Q');
    const y = Number(yStr), q = Number(qStr);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const last = new Date(y, endMonth, 0).getDate();
    return { from: `${y}-${pad(startMonth)}-01`, to: `${y}-${pad(endMonth)}-${pad(last)}`, granularity: 'week' as const };
  }
  if (/^\d{4}$/.test(apiPeriod)) {
    const y = Number(apiPeriod);
    return { from: `${y}-01-01`, to: `${y}-12-31`, granularity: 'month' as const };
  }
  // fallback: текущий год
  const today = new Date();
  const Y = today.getFullYear();
  return { from: `${Y}-01-01`, to: `${Y}-12-31`, granularity: 'month' as const };
}

function prevUiPeriod(apiPeriod: string) {
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(apiPeriod)) {
    const [y, m] = apiPeriod.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}-${mm}`;
  }
  // YYYY-Qn
  if (/^\d{4}-Q[1-4]$/.test(apiPeriod)) {
    const [yStr, qStr] = apiPeriod.split('-Q');
    let y = Number(yStr), q = Number(qStr) - 1;
    if (q === 0) { q = 4; y -= 1; }
    return `${y}-Q${q}`;
  }
  // range:YYYY-MM-DD..YYYY-MM-DD  → сдвигаем назад на ту же длину
  const m = /^range:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(apiPeriod);
  if (m) {
    const from = new Date(m[1]), to = new Date(m[2]);
    const span = (to.getTime() - from.getTime()) / 86400000 + 1; // дней
    const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevTo.getDate() - (span - 1));
    const iso = (d: Date) => d.toISOString().slice(0,10);
    return `range:${iso(prevFrom)}..${iso(prevTo)}`;
  }
  return apiPeriod; // fallback
}


function ruMonthLong(d: Date) {
  return d.toLocaleString('ru-RU', { month: 'long' });
}
function ruMonthShort(d: Date) {
  return d.toLocaleString('ru-RU', { month: 'short' });
}

/* ────────────────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRegion = searchParams.get('region');
  const urlPeriod = searchParams.get('period') as PeriodMode | null;

  const [selectedRegion, setSelectedRegion] = React.useState<string | null>(urlRegion);
  const [periodMode, setPeriodMode] = React.useState<PeriodMode>(urlPeriod || 'quarter');

  // sync state → URL
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRegion) params.set('region', selectedRegion);
    if (periodMode && periodMode !== 'quarter') params.set('period', periodMode);
    setSearchParams(params, { replace: true });
  }, [selectedRegion, periodMode, setSearchParams]);

  // UI period → apiPeriod
  const apiPeriod = React.useMemo(() => {
    const now = new Date();
    const Y = now.getFullYear();
    const M = now.getMonth() + 1; // 1..12
    const q = Math.floor((M - 1) / 3) + 1;
  
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  
    if (periodMode === 'month') {
      // текущий месяц
      return `${Y}-${pad(M)}`;                     // "YYYY-MM"
    }
    if (periodMode === 'quarter') {
      // текущий квартал
      return `${Y}-Q${q}`;                         // "YYYY-Qn"
    }
    if (periodMode === 'year') {
      // последние 12 месяцев: с 1-го числа месяца 11 месяцев назад по последний день текущего месяца
      const start = new Date(Y, (M - 1) - 11, 1);
      const end = new Date(Y, M, 0);               // последний день текущего месяца
      return `range:${iso(start)}..${iso(end)}`;    // "range:YYYY-MM-DD..YYYY-MM-DD"
    }
    // fallback: тоже последние 12 месяцев
    const start = new Date(Y, (M - 1) - 11, 1);
    const end = new Date(Y, M, 0);
    return `range:${iso(start)}..${iso(end)}`;
  }, [periodMode]);

  const { data: regions } = useGetRegionsQuery();

  // Map coloring
  const { data: choropleth } = useGetChoroplethQuery({ metric: 'count', period: apiPeriod });
  const mapData = React.useMemo(
    () => (choropleth ?? []).map(d => ({ code: d.code, value: d.value })),
    [choropleth]
  );

  // Insight under filters
  const { data: insight } = useGetInsightQuery({ metric: 'count', period: apiPeriod });

  // Rank widget (overlay on the map)
  const { data: rank } = useGetRankQuery({
    metric: 'count',
    period: apiPeriod,
    region: selectedRegion ?? 'RU',
  });

  const prevPeriod = React.useMemo(() => prevUiPeriod(apiPeriod), [apiPeriod]);

  const { data: prevRank } = useGetRankQuery({
    metric: 'count',
    period: prevPeriod,
    region: selectedRegion ?? 'RU',
  }, { skip: !selectedRegion }); // запрашиваем только когда выбран регион

  const trend = React.useMemo(() => {
    const cur = rank?.rank, prev = prevRank?.rank;
    if (typeof cur !== 'number' || typeof prev !== 'number') return null;
    // Меньшее число = лучше позиция
    return prev - cur; // >0 улучшение, <0 ухудшение
  }, [rank?.rank, prevRank?.rank]);

  /* ───── Timeseries via flights: период → диапазон дат, агрегация на фронте ───── */

  const { from, to, granularity } = React.useMemo(
    () => periodToRange(periodMode, apiPeriod),
    [periodMode, apiPeriod]
  );

  const regionId = React.useMemo(() => {
    if (!selectedRegion || !regions?.length) return undefined;
    const code2 = String(selectedRegion).padStart(2, '0');
    const row = (regions as any[]).find((r) => String(r.code).padStart(2, '0') === code2);
    return row ? Number(row.id) : undefined;
  }, [selectedRegion, regions]);

  const { data: flightsRes, isFetching: isFlightsLoading } = useGetFlightsRangeQuery({
    ...(regionId ? { region_id: regionId } : {}),
    date_from: from,
    date_to: to,
  });

  // ⬇️ ВАЖНО: flightsRes — это МАССИВ, не объект с .data
  const flights: FlightRow[] = flightsRes ?? [];

  const trendData: TrendPoint[] = React.useMemo(() => {
    const weekLabels = new Map<string, string>();
    const bucket = new Map<string, number>();
    const inc = (k: string) => bucket.set(k, (bucket.get(k) ?? 0) + 1);
  
    const toRuMonthShort = (y: number, m0: number) =>
      new Date(y, m0, 1).toLocaleString('ru-RU', { month: 'short' });
  
    for (const f of flights) {
      const iso = String(f.dof ?? '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
      const d = new Date(iso);
    
      if (granularity === 'day') {
        const key = d.toLocaleString('ru-RU', { day: 'numeric', month: 'long' });
        inc(key);
      } else if (granularity === 'week') {
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        const isoMon = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).toISOString().slice(0, 10);
        const label = `нед ${String(monday.getDate()).padStart(2,'0')}.${String(monday.getMonth()+1).padStart(2,'0')}`;
        weekLabels.set(isoMon, label);
        bucket.set(isoMon, (bucket.get(isoMon) ?? 0) + 1);
      } else {
        // ← МЕСЯЦ: ключ = короткое имя месяца
        const key = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleString('ru-RU', { month: 'short' });
        inc(key);
      }
    }
    
  
    const out: { t: string; v: number }[] = [];
    const today = new Date();
    if (granularity === 'day') {
      // режим «месяц»: строим от from до to, но если это текущий месяц — обрезаем по сегодня
      const s = new Date(from);
      const eIsCurrentMonth = s.getFullYear() === today.getFullYear() && s.getMonth() === today.getMonth();
      const e = eIsCurrentMonth ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
                                : new Date(to);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const t = d.toLocaleString('ru-RU', { day: 'numeric', month: 'long' });
        out.push({ t, v: bucket.get(t) ?? 0 });
      }
    } else if (granularity === 'month') {
      const s = new Date(from.slice(0, 10));
      s.setDate(1);
      const e = new Date(to.slice(0, 10));
      e.setDate(1);
    
      for (let d = new Date(s); d <= e; d.setMonth(d.getMonth() + 1)) {
        const t = d.toLocaleString('ru-RU', { month: 'short' });
        out.push({ t, v: bucket.get(t) ?? 0 });
      }
    } else {
      // режим «квартал/недели»: не заполняем пропуски — только имеющиеся недели
      out.push(
        ...[...bucket.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([iso, v]) => ({ t: weekLabels.get(iso) ?? iso, v }))
      );
    }
  
    // мягкие «ленты» (как в макете). Если не нужны — верни out.
    return out.map(p => ({
      t: p.t,
      avg: p.v,
      min: Math.round(p.v * 0.85),
      max: Math.round(p.v * 1.15),
    }));
  }, [flights, granularity, from, to]);

  /* ────────────────────────────────────────────────────────────────────────────── */

  const mapOverlay = (
    <div className="rounded-2xl bg-white/90 backdrop-blur border shadow p-3 w-[360px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">Место в рейтинге</div>
        <div className="text-xl font-semibold tabular-nums">{rank?.rank ?? '—'}</div>
      </div>
      <div>
        <div
          className="h-2 rounded-full"
          style={{ background: 'linear-gradient(90deg, #BFE8F4 0%, #66C4E1 25%, #23A4CF 50%, #1379A6 75%, #0B4A6F 100%)' }}
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>1–10</span><span>10–30</span><span>30–50</span><span>50–70</span><span>70+</span>
        </div>
      </div>
    </div>
  );

  // экспорт (demo)
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

  /* ───── разрез фона: верх белый, низ (с KPI) серый ───── */

  const splitRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const cardColRef = React.useRef<HTMLDivElement | null>(null);
  const padRef = React.useRef<HTMLDivElement | null>(null);
  const [cardLeft, setCardLeft] = React.useState<number | null>(null);
  const [whiteHeight, setWhiteHeight] = React.useState(0);

  const measure = React.useCallback(() => {
    if (!rootRef.current || !splitRef.current) return;
    const rootTop   = rootRef.current.getBoundingClientRect().top;
    const anchorTop = splitRef.current.getBoundingClientRect().top;
    setWhiteHeight(Math.max(0, anchorTop - rootTop));
  }, []);

  const measureCardLeft = React.useCallback(() => {
    if (!rootRef.current || !cardColRef.current) return;
    const rootBox = rootRef.current.getBoundingClientRect();
    const cardBox = cardColRef.current.getBoundingClientRect();
    // левый край колонки карточки относительно root
    const leftInsideRoot = cardBox.left - rootBox.left;
    setCardLeft(leftInsideRoot);
  }, []);

  React.useLayoutEffect(() => {
    measureCardLeft();
    const onResize = () => measureCardLeft();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measureCardLeft]);
  
  React.useEffect(() => {
    measureCardLeft();
  }, [selectedRegion, measureCardLeft]);

  React.useEffect(() => { measure(); }, [insight, regions, periodMode, selectedRegion]);

  //
  React.useEffect(() => {
    const id = requestAnimationFrame(measureCardLeft);
    return () => cancelAnimationFrame(id);
  }, [selectedRegion, measureCardLeft]);

  const [isXL, setIsXL] = React.useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1280px)').matches : false
  );
  
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = (e: MediaQueryListEvent) => setIsXL(e.matches);
    setIsXL(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  function RankOverlay({ rank }: { rank: number | null }) {
    return (
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border shadow-md p-3 w-[380px]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Место в рейтинге</div>
          <div className="text-xl font-semibold tabular-nums">{rank ?? '—'}</div>
        </div>
  
        <div className="mt-3">
          {/* полоса-градиент (широкая, с разделителями) */}
          <div className="h-2 rounded-full overflow-hidden relative"
               style={{ background: 'linear-gradient(90deg,#BFE8F4 0%,#66C4E1 25%,#23A4CF 50%,#1379A6 75%,#0B4A6F 100%)' }}>
            {/* тонкие разделители как на макете */}
            <span className="absolute left-[20%] top-0 h-full w-[1px] bg-white/60" />
            <span className="absolute left-[40%] top-0 h-full w-[1px] bg-white/60" />
            <span className="absolute left-[60%] top-0 h-full w-[1px] bg-white/60" />
            <span className="absolute left-[80%] top-0 h-full w-[1px] bg-white/60" />
          </div>
  
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>70+</span><span>50–70</span><span>30–50</span><span>10–30</span><span>1–10</span>
          </div>
        </div>
      </div>
    );
  }
  
  function RegionRankBadge({
    rank,
    trend,
  }: { rank?: number | null; trend: number | null }) {
    const color =
      trend == null ? 'text-slate-700'
      : trend > 0   ? 'text-emerald-600'
      : trend < 0   ? 'text-rose-600'
      : 'text-slate-700';
  
    const chipBg =
      trend == null ? 'bg-slate-100 text-slate-700'
      : trend > 0   ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
      : trend < 0   ? 'bg-rose-50 text-rose-700 border border-rose-100'
      : 'bg-slate-100 text-slate-700';
  
    const arrow = trend == null ? '' : trend > 0 ? '▲' : trend < 0 ? '▼' : '•';
  
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-semibold tabular-nums ${color}`}>
            {typeof rank === 'number' ? rank : '—'}
          </div>
          {trend != null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${chipBg}`}>
              {arrow} {trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '0'}
            </span>
          )}
        </div>
        {/*<div className="text-xs text-slate-500">
          {trend == null ? 'Нет данных для сравнения'
           : trend > 0 ? 'Позиция улучшилась'
           : trend < 0 ? 'Позиция ухудшилась'
           : 'Без изменений'}
        </div>*/}
      </div>
    );
  }
  
  /* ────────────────────────────────────────────────────────────────────────────── */

  return (
    <div ref={rootRef} className="relative isolate min-h-screen bg-slate-50 overflow-x-hidden">
      {/* фон карточки, тянется вверх/вниз/вправо до краёв экрана */}
      {selectedRegion && cardLeft != null && (
        <div
          aria-hidden
          className="absolute top-0 bottom-0 right-0 z-0 pointer-events-none bg-slate-50"
          style={{ left: `${cardLeft - 1}px` }}
        />
      )}
      {/* full-bleed белый фон до «Динамика полётов» */}
      <div
        aria-hidden
        className="absolute top-0 left-0 z-0 bg-white"
        style={{ height: whiteHeight, width: Math.max(0, (cardLeft ?? 0) - 1) }}
      />
      <div ref={padRef} className="relative z-10 px-6 py-5">

        <div className="relative z-10 grid grid-cols-12 gap-4">
          {/* Левая колонка */}
          <aside className="col-span-12 xl:col-span-4 space-y-4 xl:order-1">
            {/* Region + Period */}
            <div className="grid grid-cols-2 gap-3">
              {/* Регион */}
              <div className="flex flex-col gap-1">
                <div className="text-base font-medium">Регион</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between border border-slate-100 border-[1px] rounded-[16px] p-6 bg-slate-100">
                      {selectedRegion ? getRegionName(selectedRegion) : 'Россия'}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setSelectedRegion(null)}>Россия</DropdownMenuItem>
                    {(regions ?? []).slice(0, 10).map((r: any) => (
                      <DropdownMenuItem key={r.code} onClick={() => setSelectedRegion(r.code)}>
                        {r.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Период */}
              <div className="flex flex-col gap-1">
                <div className="text-base font-medium">Период</div>
                <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
                  <SelectTrigger className="h-9 border border-slate-100 border-[1px] rounded-[16px] p-6 bg-slate-100">
                    <SelectValue placeholder="За квартал" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarter">За квартал</SelectItem>
                    <SelectItem value="year">За год</SelectItem>
                    <SelectItem value="month">За месяц</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Инсайт */}
            <Card className="border border-transparent shadow-none">
              <CardContent className="p-4">
                <div className="border-b border-slate-200 mb-4 -mr-10 -ml-10" />
                <div className="text-xl font-semibold leading-snug">
                  {insight?.title ?? 'Регион N вошёл в топ-3 по росту активности'}
                </div>
                <div className="text-slate-600 mt-1">
                  {insight?.subtitle ?? 'Средняя длительность полётов БВС выросла на 25%'}
                </div>
              </CardContent>
            </Card>

            {/* Рейтинг */}
            <Card className="border border-slate-50 border-[1px] rounded-[16px] px-2 py-0 bg-slate-50 shadow-none">
              <CardHeader className="pb-2">
                {selectedRegion
                  ? <CardTitle className="text-[20px]">Рейтинг региона</CardTitle>
                  : <CardTitle className="text-[20px]">Рейтинг регионов</CardTitle>
                }
              </CardHeader>
              <CardContent>
                {selectedRegion
                  ? <RegionRankBadge rank={rank?.rank ?? null} trend={trend} />
                  : <TopRating limit={3} metric="count" period={apiPeriod} />
                }
              </CardContent>
            </Card>

            {/* Якорь разреза фона — ниже серый фон */}
            <div ref={splitRef} />

            {/* KPI */}
            <div className="space-y-2">
              <div className="border-b border-slate-200 mb-4 -mr-10 -ml-6" />
              <div className="text-base font-medium mb-2">Динамика полётов</div>
              <KpiTiles region={selectedRegion ?? 'RU'} period={apiPeriod} />
            </div>

            {/* График */}
            <Card className="bg-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">График</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 min-w-0">
                <AreaTrend data={trendData} height={180} />
                {/* {isFlightsLoading && <div className="h-[180px] animate-pulse bg-slate-100 rounded-xl" />} */}
              </CardContent>
            </Card>

            {/* Последний полёт (демо) */}
            <LastFlightCard period={apiPeriod} regionCode={selectedRegion ?? null} />

            {/* Кнопки */}
            <div className="grid grid-rows-2 justify-center">
              <Button variant="ghost" className="w-full">Больше</Button>
              <ExportDialog targetRef={rootRef} />
            </div>
          </aside>

          {/* Правая зона: карта или регион */}
          <div className={`col-span-12 ${selectedRegion ? 'xl:col-span-5' : 'xl:col-span-8'} space-y-3 xl:order-3`}>
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
                  data={mapData}
                  selectedRegion={selectedRegion ?? undefined}
                  onSelect={(code) => setSelectedRegion(code)}
                  overlay={<RankOverlay rank={rank?.rank ?? null} />}
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

          {/* Карточка региона (когда выбран) */}
          {selectedRegion && (
            <div ref={cardColRef} className="col-span-12 xl:col-span-3 xl:order-2 z-20">
              <RegionCard code={selectedRegion} period={apiPeriod} className="flex-1 min-h-[700px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
