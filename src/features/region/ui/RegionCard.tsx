// src/features/region/ui/RegionCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGetRankQuery,
  useGetRegionsQuery,
  useGetRegionStatisticsQuery,
} from '@/shared/api/lctApi';
import { getRegionName } from '@/shared/constants/regions';
import KpiTiles from '@/widgets/kpi/KpiTiles';

type Props = {
  code: string;   // "77"
  period: string; // "2025" | "2025-Q3"
};

export default function RegionCard({ code, period }: Props) {
  const fallbackName = getRegionName(code);

  // Справочник регионов
  const { data: regions, isLoading: isLoadingRegions } = useGetRegionsQuery();

  // Серверная статистика региона (заменяет клиентский KPI)
  const { data: stats, isLoading: isLoadingStats } = useGetRegionStatisticsQuery({
    regionCode: code,
  });

  // Rank data for the region
  const { data: rank, isLoading: isLoadingRank } = useGetRankQuery({
    period,
    metric: 'count',
    region: code,
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

  const loading = isLoadingRegions || isLoadingStats || isLoadingRank;

  // KPI из серверной статистики:
  // totalFlights — прямо из summary
  // avgDurationMin — взвешенная средняя по годам, где avg_flight_time приходит в часах → переводим в минуты
  const totalFlights = stats?.summary?.total_flights ?? 0;
  const avgDurationMin = React.useMemo(() => {
    const byYear = stats?.statistics?.by_year ?? [];
    if (!byYear.length) return 0;
    const flightsSum = byYear.reduce((s, y) => s + (y.flight_count ?? 0), 0);
    if (!flightsSum) return 0;
    const durationHoursWeighted = byYear.reduce(
      (s, y) => s + (y.avg_flight_time ?? 0) * (y.flight_count ?? 0),
      0
    );
    return Math.round((durationHoursWeighted / flightsSum) * 60); // в минуты
  }, [stats?.statistics?.by_year]);

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

        {/* Краткая сводка по БВС (из server-side statistics) */}
        <div className="rounded-xl border p-3">
          <div className="text-slate-500 text-xs">Полёты БВС за период</div>
          <div className="mt-1 text-base">
            <span className="font-semibold tabular-nums">
              {totalFlights ? totalFlights.toLocaleString('ru-RU') : '—'}
            </span>{' '}
            полётов, средняя длительность —{' '}
            <span className="tabular-nums font-semibold">
              {avgDurationMin || '—'}
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
