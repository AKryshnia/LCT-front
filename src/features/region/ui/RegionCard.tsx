// src/features/region/ui/RegionCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetRegionsQuery, useGetCitiesQuery } from '@/shared/api/lctApi';

type RegionItem = {
  code: string;
  name: string;
  population: number;
  area_km2: number;
  flights: number;
  duration_h: number;
  score: number;
  place: number;
};

type RegionProfile = {
  code: string;
  responsible: string;
  avatar?: string;
  has_development_program: boolean;
  specialization: string;
  has_test_site: boolean;
  has_epr: boolean;
  has_bek: boolean;
};

type Props = {
  code: string; // "77"
  period: string; // e.g. "2025"
};

export default function RegionCard({ code, period }: Props) {
  const [item, setItem] = React.useState<RegionItem | null>(null);
  const [profile, setProfile] = React.useState<RegionProfile | null>(null);
  const [loading, setLoading] = React.useState(false);

  // External APIs (real backend) via RTK Query
  const { data: regions } = useGetRegionsQuery();
  const { data: citiesPaged } = useGetCitiesQuery({ page: 1, per_page: 100 });
  const regionFromApi = React.useMemo(() => (regions ?? []).find(r => r.code === code), [regions, code]);
  const capitalFromApi = React.useMemo(() => regionFromApi?.capital?.name, [regionFromApi]);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const [statsRes, profileRes] = await Promise.all([
          fetch(`/api/stats?region=${code}&period=${encodeURIComponent(period)}`),
          fetch(`/api/region/profile?code=${code}`),
        ]);
        const statsJson = await statsRes.json();
        const profileJson = await profileRes.json();
        if (!ignore) {
          setItem((statsJson?.items ?? [])[0] ?? null);
          setProfile((profileJson?.data as RegionProfile) ?? null);
        }
      } catch (e) {
        if (!ignore) {
          setItem(null);
          setProfile(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [code, period]);

  const title = regionFromApi?.name ?? item?.name ?? `Регион ${code}`;
  const population = regionFromApi?.population ? Number(regionFromApi.population.replace(/\s/g, '')) : item?.population;
  const area = item?.area_km2; // external API may lack area — keep from stats

  return (
    <Card className="shadow-xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-sky-100 border flex items-center justify-center text-sky-700 font-semibold">
            {code}
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{title}</div>
            <div className="text-xs text-slate-500">{loading ? 'Загрузка…' : `Код региона: ${code}`}</div>
          </div>
        </div>

        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500 text-xs mb-1">Численность населения</div>
            <div className="text-xl font-semibold tabular-nums">{population ? population.toLocaleString('ru-RU') : '—'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500 text-xs mb-1">Площадь региона, км²</div>
            <div className="text-xl font-semibold tabular-nums">{area ? `${area.toLocaleString('ru-RU')}` : '—'}</div>
          </div>
        </div>

        {capitalFromApi && (
          <div className="rounded-xl bg-white border p-3 text-sm">
            <div className="text-slate-500 text-xs">Административный центр</div>
            <div className="mt-1">{capitalFromApi}</div>
          </div>
        )}

        {/* Краткая сводка по БВС */}
        <div className="rounded-xl border p-3">
          <div className="text-slate-500 text-xs">Полёты БВС за период</div>
          <div className="mt-1 text-base">
            <span className="font-semibold tabular-nums">{item ? item.flights.toLocaleString('ru-RU') : '—'}</span> полётов,
            средняя длительность — <span className="tabular-nums font-semibold">{item ? Math.round(item.duration_h/60) : '—'}</span> мин
          </div>
        </div>

        {/* Рейтинг */}
        <div className="rounded-xl bg-white border p-3">
          <div className="text-slate-500 text-xs">Рейтинг региона</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{item ? item.place : '—'}</div>
        </div>

        {/* Доп. сведения из профиля */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-500 text-xs">Программа развития БАС</div>
            <div>{profile ? (profile.has_development_program ? 'Есть' : 'Нет') : '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Наличие ЕПР</div>
            <div>{profile ? (profile.has_epr ? 'Есть' : 'Нет') : '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Специализация региона</div>
            <div>{profile ? profile.specialization : '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Наличие полигона БАС</div>
            <div>{profile ? (profile.has_test_site ? 'Да' : 'Нет') : '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs">Наличие работ по БЭК</div>
            <div>{profile ? (profile.has_bek ? 'Есть' : 'Нет') : '—'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
