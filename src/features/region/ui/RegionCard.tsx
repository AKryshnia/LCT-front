// src/features/region/ui/RegionCard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  useGetRankQuery,
  useGetRegionsQuery,
  useGetRegionStatisticsQuery,
} from '@/shared/api/lctApi';
import { getRegionName } from '@/shared/constants/regions';

type Props = {
  code: string;   // "77"
  period: string; // "2025" | "2025-Q3"
};

const fmt = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('ru-RU').format(n);

export default function RegionCard({ code, period }: Props) {
  const fallbackName = getRegionName(code);

  // справочник регионов
  const { data: regions } = useGetRegionsQuery();
  const region = React.useMemo(
    () => (regions ?? []).find((r) => String(r.code) === String(code)),
    [regions, code]
  );

  const title = region?.name || fallbackName || `Регион ${code}`;
  const populationNum = React.useMemo(() => {
    const raw = region?.population;
    if (raw == null) return undefined;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }, [region?.population]);

  // серверная статистика (если появятся поля — подставятся)
  const { data: stats } = useGetRegionStatisticsQuery({ regionCode: code });

  // рейтинг
  const { data: rank } = useGetRankQuery({
    period,
    metric: 'count',
    region: code,
  });

  // ⚙️ возможные источники для «Площадь региона» (пока плейсхолдер)
  const areaKm2 =
    (stats as any)?.meta?.area_km2 ??
    (region as any)?.area_km2 ??
    (region as any)?.area ??
    null;

  return (
    <Card className="bg-[#F3F5F8] border-0 shadow-none">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* герб / эмблема — плейсхолдер */}
            <div className="w-10 h-10 rounded-md bg-sky-100 border border-sky-200 flex items-center justify-center">
              <span className="text-sky-700 text-sm font-semibold">{code}</span>
            </div>
            <div>
              <div className="text-xl font-semibold leading-tight">{title}</div>
              <div className="text-slate-500 text-xs mt-0.5">{code} регион</div>
            </div>
          </div>
          {/* ← стрелку «назад» держим выше по иерархии страницы; здесь только статус */}
        </div>

        {/* Статус «Небо — Открыто» */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[13px] font-medium text-slate-700">Небо</div>
          <div className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            Открыто
          </div>
        </div>

        {/* Две большие плитки */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <BigTile
            label="Численность населения"
            value={fmt(populationNum)}
          />
          <BigTile
            label="Площадь региона"
            value={areaKm2 ? `${fmt(areaKm2)} км²` : '—'}
          />
        </div>

        {/* Ответственный */}
        <div className="mt-4">
          <div className="text-[13px] font-medium text-slate-700 mb-2">
            Ответственный за БАС
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white border p-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
              {/* если будет аватар — поставьте <img className="w-full h-full object-cover" src={...} /> */}
              <span className="text-slate-600 text-xs font-semibold">ОВ</span>
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-slate-800">
                Олег Иванов
              </div>
              <div className="text-[12px] text-slate-500">@Oleg_Z_Ivanov</div>
            </div>
          </div>
        </div>

        {/* Двухколоночный список пунктов */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
          <Field
            title="Программа развития БАС"
            value="Принята 20.12.2024"
          />
          <Field title="Наличие ЭПР" value="Есть" />
          <Field
            title="Специализация региона"
            value="Система передачи данных с БВС"
            hint="(пример)"
          />
          <Field title="Наличие работ по БЭК" value="Есть" />
          <Field title="Наличие полигона БАС" value="Есть" />
          <Field title="Наличие НПЦ" value="Крупный" />
          <Field
            title="Процент оснащённости школ БАС"
            value={`${(stats as any)?.education?.uav_schools_share ?? 12}%`}
          />
          <Field title="Рейтинг региона" value={fmt(rank?.rank as any)} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────── small building blocks ───────── */

function BigTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border p-3 shadow-[0_1px_2px_rgba(0,0,0,.04)] break-words">
      <div className="text-[28px] sm:text-[30px] leading-none font-semibold tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[13px] text-slate-500">{label}</div>
    </div>
  );
}

function Field({
  title,
  value,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[13px] font-medium text-slate-700">{title}</div>
      <div className="mt-1 text-[13px] text-slate-500 leading-snug">
        {value}
        {hint ? <span className="text-slate-400"> {hint}</span> : null}
      </div>
    </div>
  );
}
