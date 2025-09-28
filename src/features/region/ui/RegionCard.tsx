// src/features/region/ui/RegionCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGetKpiQuery,
  useGetRankQuery,
  useGetRegionsQuery,
} from '@/shared/api/lctApi';
import { getRegionName } from '@/shared/constants/regions';

type Props = {
  code: string;   // "77"
  period: string; // "2025" | "2025-Q3"
};

export default function RegionCard({ code, period }: Props) {
  const metric = 'count'; // единственная метрика на MVP
  const fallbackName = getRegionName(code);

  // Справочник регионов
  const { data: regions, isLoading: isLoadingRegions } = useGetRegionsQuery();

  // KPI data for the region
  const { data: kpi, isLoading: isLoadingKpi } = useGetKpiQuery({ 
    period, 
    metric, 
    region: code 
  });

  // Rank data for the region
  const { data: rank, isLoading: isLoadingRank } = useGetRankQuery({ 
    period, 
    metric, 
    region: code 
  });
  const regionFromApi = React.useMemo(
    () => (regions ?? []).find((r) => String(r.code) === String(code)),
    [regions, code]
  );
  const capital = regionFromApi?.capital?.name;

  // Имя региона
  const title = regionFromApi?.name || fallbackName;

  // Население: может быть строкой "1 234 567" или числом
  const populationNum: number | undefined = React.useMemo(() => {
    const raw = regionFromApi?.population;
    if (raw == null) return undefined;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }, [regionFromApi?.population]);

  const loading = isLoadingRegions || isLoadingKpi || isLoadingRank;

  return (
    <Card className="shadow-xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-sky-100 border flex items-center justify-center text-sky-700 font-semibold">
            {code}
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{title}</div>
            <div className="text-xs text-slate-500">
              {loading ? 'Загрузка…' : `Код региона: ${code}`}
            </div>
          </div>
        </div>

        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500 text-xs mb-1">Численность населения</div>
            <div className="text-xl font-semibold tabular-nums">
              {populationNum != null ? populationNum.toLocaleString('ru-RU') : '—'}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500 text-xs mb-1">Площадь региона, км²</div>
            <div className="text-xl font-semibold tabular-nums">—</div>
          </div>
        </div>

        {capital && (
          <div className="rounded-xl bg-white border p-3 text-sm">
            <div className="text-slate-500 text-xs">Административный центр</div>
            <div className="mt-1">{capital}</div>
          </div>
        )}

        {/* Краткая сводка по БВС (из KPI) */}
        <div className="rounded-xl border p-3">
          <div className="text-slate-500 text-xs">Полёты БВС за период</div>
          <div className="mt-1 text-base">
            <span className="font-semibold tabular-nums">
              {kpi?.totalFlights != null ? kpi.totalFlights.toLocaleString('ru-RU') : '—'}
            </span>{' '}
            полётов, средняя длительность —{' '}
            <span className="tabular-nums font-semibold">
              {kpi?.avgDurationMin != null ? Math.round(kpi.avgDurationMin) : '—'}
            </span>{' '}
            мин
          </div>
        </div>

        {/* Рейтинг */}
        <div className="rounded-xl bg-white border p-3">
          <div className="text-slate-500 text-xs">Рейтинг региона</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {rank?.rank ?? '—'}
          </div>
        </div>

        {/* Блок профиля (убран, потому что на бэке нет эндпоинта /profile).
            Если появится — вернём с реальными данными. */}
      </CardContent>
    </Card>
  );
}
