import { useEffect, useState } from 'react';

export type Region = {
  code: string; name: string;
  population: number; area_km2: number;
  flights: number; duration_h: number;
  score: number; place: number;
};

export type Stats = {
  period: string;
  items: Region[];
  totals: { flights: number; duration_h: number };
};

const EMPTY_TOTALS = { flights: 0, duration_h: 0 };

export function useStats({ period }: { period: string }) {
  const [data, setData] = useState<Stats>({
    period,
    items: [],
    totals: EMPTY_TOTALS,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/stats?period=${encodeURIComponent(period)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Partial<Stats>;
        setData({
          period,
          items: json.items ?? [],
          totals: json.totals ?? EMPTY_TOTALS,
        });
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setError(e);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [period]);

  return { data, isLoading, error };
}
