import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useGetRatingQuery } from '@/shared/api/lctApi';

type Region = { code: string; name: string; flights?: number; score?: number };
type Props = {
  /** fallback-данные, если API недоступно */
  data?: Region[];
  metric?: string;
  period?: string;
  limit?: number;
};

export default function TopRating({ data, metric = 'count', period = '2025-Q3', limit = 3 }: Props) {
  const { data: api } = useGetRatingQuery({ metric, period, limit });
  // Нормализуем: value -> flights
  const incoming: Region[] =
    (api?.map((i: any) => ({ code: i.code, name: i.name ?? `Регион ${i.code}`, flights: i.value, score: i.value })) ??
      data ??
      []);

  const top = [...incoming].sort((a, b) => (b.score ?? b.flights ?? 0) - (a.score ?? a.flights ?? 0));
  const first3 = top.slice(0, 3);
  const rest = top.slice(3, 10);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {first3.map((r, i) => (
          <Card key={r.code} className="text-center bg-slate-50 border-none rounded-2xl">
            <CardContent className="p-4 bg-slate-200 rounded-2xl h-full">
              <div className="text-slate-500 text-sm">{r.name}</div>
              <div className="text-3xl font-semibold mt-1">{i + 1}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(r.flights ?? 0).toLocaleString('ru-RU')} полетов
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {rest.length > 0 && (
        <details className="rounded-2xl bg-white border p-3">
          <summary className="cursor-pointer text-sm">Больше</summary>
          <ul className="mt-2 space-y-1">
            {rest.map((r, i) => (
              <li key={r.code} className="flex items-center justify-between text-sm">
                <span>
                  {i + 4}. {r.name}
                </span>
                <span className="tabular-nums">{r.flights?.toLocaleString('ru-RU') ?? '—'}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
