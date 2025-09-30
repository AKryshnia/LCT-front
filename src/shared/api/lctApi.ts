// src/shared/api/lctApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { baseQuery } from './base';
import { idbCache } from '@/shared/lib/idbCache';

/* ===================== Типы ===================== */

export type RegionRow = {
  id: number;
  code: string;          // "01".."99"
  name: string;
  type?: string;
  type_short?: string;
  image?: string;
  population?: number | string;
  capital?: { name?: string } | null;
  [k: string]: any;
};

export type CityRow = {
  id: number;
  name: string;
  region_id?: number;
  [k: string]: any;
};

export type FlightRow = {
  id: number;
  dof: string;           // 'YYYY-MM-DD'
  region_id?: number;
  reg?: string | number;
  eet?: string | number; // минуты
  dep_time?: string;
  arr_time?: string;
  [k: string]: any;
};

export type ChoroplethPoint = { code: string; name: string; value: number };
export type RatingItem = ChoroplethPoint & { rank: number };
export type TimeseriesPoint = { date: string; value: number };
export type Kpi = { totalFlights: number; avgDurationMin: number; ratio?: number; peakHour?: number };
export type MetaResponse = { periods: string[]; metrics: { id: string; name: string }[] };

export type RegionStatistics = {
  region: { id: number; name: string; name_alt?: string };
  summary: { total_flights: number; years_covered: number; weeks_covered: number };
  statistics: {
    by_year: Array<{ year: number; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }>;
    by_year_and_month: Array<{ year: number; months: Array<{ month: number; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }> }>;
    by_year_and_week: Array<{ year: number; weeks: Array<{ week_number: number; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }> }>;
    by_quarter: Array<{ quarter: number; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }>;
    by_year_and_quarter: Array<{ year: number; quarters: Array<{ quarter: number; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }> }>;
    by_year_and_season: Array<{ year: number; seasons: Array<{ season: string; flight_count: number; avg_flight_time: number; min_flight_time: number; max_flight_time: number }> }>;
  };
};

/* ===================== Утилиты ===================== */

const z2 = (v: any) => String(v ?? '').padStart(2, '0');

const parseTimeToMin = (s?: string | null) => {
  if (!s) return null;
  const [hh, mm = '0', ss = '0'] = String(s).split(':');
  const h = Number(hh), m = Number(mm), sec = Number(ss);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m + (Number.isFinite(sec) ? sec / 60 : 0);
};

const durationMin = (f: FlightRow) => {
  const eet = Number(f.eet);
  if (Number.isFinite(eet) && eet > 0) return eet;
  const d = parseTimeToMin(f.dep_time);
  const a = parseTimeToMin(f.arr_time);
  if (d != null && a != null) {
    let diff = a - d;
    if (diff < 0) diff += 24 * 60;
    return diff;
  }
  return 0;
};

const periodToRange = (p: string): [string, string] => {
  const q = /^(\d{4})-Q([1-4])$/.exec(p);
  if (q) {
    const y = +q[1], n = +q[2];
    const sm = [1,4,7,10][n-1];
    const s = new Date(Date.UTC(y, sm-1, 1));
    const e = new Date(Date.UTC(y, sm+2, 0));
    const iso = (d: Date) => d.toISOString().slice(0,10);
    return [iso(s), iso(e)];
  }
  const m = /^(\d{4})-(\d{2})$/.exec(p);               // <-- новое
  if (m) {
    const y = +m[1], mo = +m[2];
    const s = new Date(Date.UTC(y, mo-1, 1));
    const e = new Date(Date.UTC(y, mo, 0));
    const iso = (d: Date) => d.toISOString().slice(0,10);
    return [iso(s), iso(e)];
  }
  const y = /^(\d{4})$/.exec(p);
  if (y) return [`${y[1]}-01-01`, `${y[1]}-12-31`];
  return ['2025-01-01', '2025-12-31'];
};

/* ===================== Пэйджинг/кэш — ТОЛЬКО в getFlights ===================== */

type BoundBQ = (args: string | FetchArgs) => Promise<{ data?: any; error?: FetchBaseQueryError }>;

const PAGE_SIZE = 2000;
const PAGE_KEYS = ['per_page', 'perPage', 'pageSize', 'limit'] as const;
const CONCURRENCY = 6;
const FLIGHTS_TTL_MS = 24 * 60 * 60 * 1000;

async function tryMany(
  bq: (a: string | FetchArgs) => Promise<{ data?: any; error?: any }>,
  urls: (string | FetchArgs)[]
) {
  for (const u of urls) {
    const r = await bq(u);
    const status = (r as any)?.error?.status;
    if (!('error' in r) || !r.error || status !== 404) return r;
  }
  return await bq(urls[urls.length - 1]);
}

async function detectPageKey(
  bq: BoundBQ, url: string, base: Record<string, any>
): Promise<{ key?: string; firstData: any[]; meta: any }> {
  for (const k of PAGE_KEYS) {
    const res = await bq({ url, params: { ...base, page: 1, [k]: PAGE_SIZE } });
    if ('error' in res && res.error) continue;
    const body: any = res.data ?? {};
    const data: any[] = Array.isArray(body) ? body : (body.data ?? []);
    const meta = body?.meta;
    if ((meta?.per_page ?? meta?.perPage ?? meta?.pageSize ?? meta?.limit) >= PAGE_SIZE || meta?.last_page) {
      return { key: k, firstData: data, meta };
    }
    if (meta?.last_page) return { key: k, firstData: data, meta };
  }
  const res = await bq({ url, params: { ...base, page: 1 } });
  const body: any = res.data ?? {};
  const data: any[] = Array.isArray(body) ? body : (body.data ?? []);
  return { key: undefined, firstData: data, meta: body?.meta };
}

async function fetchAllPagesSmart(
  bq: BoundBQ,
  url: string,
  params: Record<string, any>,
  cacheKey: string
): Promise<any[]> {
  const cached = await idbCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < FLIGHTS_TTL_MS) {
    return cached.items;
  }

  const { key, firstData, meta } = await detectPageKey(bq, url, params);
  const last = Number(meta?.last_page ?? 1);
  if (!last || last === 1) {
    await idbCache.set(cacheKey, { savedAt: Date.now(), items: firstData });
    return firstData;
  }

  const pages = Array.from({ length: last - 1 }, (_, i) => i + 2);
  const results: any[][] = [];
  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const batch = pages.slice(i, i + CONCURRENCY);
    const reqs = batch.map((page) =>
      bq({ url, params: { ...params, page, ...(key ? { [key]: PAGE_SIZE } : {}) } })
        .then((r) => {
          const body: any = (r as any).data ?? {};
          return Array.isArray(body) ? body : (body.data ?? []);
        })
    );
    const chunk = await Promise.all(reqs);
    results.push(...chunk);
  }

  const all = firstData.concat(...results);
  await idbCache.set(cacheKey, { savedAt: Date.now(), items: all });
  return all;
}

/* ===================== Базовая мета ===================== */

const FALLBACK_META: MetaResponse = {
  periods: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'],
  metrics: [
    { id: 'count',        name: 'Количество полётов' },
    { id: 'avg_duration', name: 'Средняя длительность (мин)' },
  ],
};

/* ===================== Слои API ===================== */

const rawApi = createApi({
  reducerPath: 'lctApi',
  baseQuery,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  keepUnusedDataFor: 600,
  endpoints: () => ({}),
});

/** Шаг 2: Сырые полёты — единственное место, где ходим в бек и пагинируем */
const apiWithFlights = rawApi.injectEndpoints({
  endpoints: (build) => ({
    getFlights: build.query<FlightRow[], { period: string; regionCodes?: string[] }>({
      serializeQueryArgs: ({ queryArgs }) => 
        JSON.stringify([queryArgs.period, (queryArgs.regionCodes ?? []).join(',')]),
      keepUnusedDataFor: 600,
      async queryFn({ period, regionCodes }, _api, _extra, bq) {
        const bound = bq as BoundBQ;
        const [from, to] = periodToRange(period);
        const params: Record<string, any> = { date_from: from, date_to: to };
        if (regionCodes?.length === 1) {
          const regions = await getRegionsCached(_api);
          const byCode = new Map(regions.map(r => [r.code, Number(r.id)]));
          const rid = byCode.get(z2(regionCodes[0]));
          if (rid) params.region_id = rid;
        }
        const cacheKey = `flights:${from}:${to}:${(regionCodes ?? []).join(',')}`;

        const fetchPages = async (url: string) =>
          fetchAllPagesSmart(bound, url, params, cacheKey);

        try {
          try {
            const all = await fetchPages('/flight');
            return { data: all as FlightRow[] };
          } catch (e: any) {
            if (e?.status === 404) {
              const all = await fetchPages('/flights');
              return { data: all as FlightRow[] };
            }
            throw e;
          }
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
    }),
  }),
});

/** Шаг 3: Справочники */
const apiWithRefs = apiWithFlights.injectEndpoints({
  endpoints: (build) => ({

    getRegionStatistics: build.query<RegionStatistics, { regionCode: string }>({
      async queryFn({ regionCode }, _api, _extra, bq) {
        const regions = await getRegionsCached(_api);
        const byCode = new Map(regions.map(r => [z2(r.code ?? r.id), Number(r.id)]));
        const rid = byCode.get(z2(regionCode));
        if (!rid) {
          return { error: { status: 400, data: 'Unknown region code' } as any };
        }
    
        const r = await (bq as BoundBQ)(`/statistics/region/${rid}`);
        if ('error' in r && r.error) return { error: r.error as FetchBaseQueryError };
    
        const body: any = (r as any).data ?? r;
        return { data: body as RegionStatistics };
      },
      keepUnusedDataFor: 3600,
    }),
    
    getRegions: build.query<RegionRow[], void>({
      async queryFn(_arg, _api, _extra, bq) {
        const r = await tryMany(bq as BoundBQ, ['/region', '/regions']);
        if ('error' in r && r.error) return { error: r.error as FetchBaseQueryError };

        const body: any = (r as any).data ?? {};
        const rows: any[] = Array.isArray(body) ? body : (body.data ?? []);
        const data = rows.map((x: any) => ({
          ...x,
          id: Number(x.id),
          code: String(x.code ?? x.id).padStart(2, '0'),
          name: String(x.name ?? ''),
        }));
        return { data };
      },
      keepUnusedDataFor: 3600,
    }),

    getCities: build.query<{ data: CityRow[]; meta?: any }, { page?: number } | void>({
      query: (arg) => ({ url: '/city', params: { page: arg?.page ?? 1 } }),
      keepUnusedDataFor: 3600,
      transformResponse: (r: any) => {
        if (Array.isArray(r)) return { data: r };
        return { data: r?.data ?? [], meta: r?.meta };
      },
    }),

    getMeta: build.query<MetaResponse, void>({
      async queryFn() {
        return { data: FALLBACK_META };
      },
    }),

  }),
});

/* ===== Хелперы для доступа к кешу RTK Query ===== */

const getRegionsCached = async (api: any): Promise<RegionRow[]> => {
  const select = apiWithRefs.endpoints.getRegions.select();
  const slice = select(api.getState() as any);
  const cached: RegionRow[] | undefined = slice?.data;
  if (cached && cached.length) return cached;
  return await api.dispatch(apiWithRefs.endpoints.getRegions.initiate()).unwrap();
};

const getFlightsOnce = async (api: any, period: string): Promise<FlightRow[]> => {
  const thunk = api.dispatch(
    apiWithFlights.endpoints.getFlights.initiate({ period }, { subscribe: false })
  );
  try {
    return await thunk.unwrap();
  } finally {
    thunk.unsubscribe();
  }
};

/** Шаг 4a: Ядро аналитики (без самоссылок) */
const apiWithAnalyticsCore = apiWithRefs.injectEndpoints({
  endpoints: (build) => ({

    getChoropleth: build.query<ChoroplethPoint[], { period: string; metric: string }>({
      async queryFn({ period, metric }, api) {
        const regions = await getRegionsCached(api);
        const byId = new Map<number, { code: string; name: string }>();
        regions.forEach((r: any) =>
          byId.set(Number(r.id), { code: z2(r.code ?? r.id), name: String(r.name ?? '') })
        );

        const flights = await getFlightsOnce(api, period);

        const acc = new Map<string, { sum: number; cnt: number }>();
        for (const f of flights) {
          const code = byId.get(Number(f.region_id ?? -1))?.code ?? (f.reg != null ? z2(f.reg) : undefined);
          if (!code) continue;
          const rec = acc.get(code) ?? { sum: 0, cnt: 0 };
          if (metric === 'avg_duration') { rec.sum += durationMin(f); rec.cnt += 1; }
          else { rec.sum += 1; }
          acc.set(code, rec);
        }

        const out: ChoroplethPoint[] = Array.from(acc.entries()).map(([code, v]) => {
          const rr = regions.find((r: any) => z2(r.code ?? r.id) === code);
          const value = metric === 'avg_duration' ? Math.round(v.sum / Math.max(v.cnt, 1)) : v.sum;
          return { code, name: rr?.name ?? code, value };
        });

        return { data: out };
      },
    }),

    getKpi: build.query<Kpi, { period: string; metric: string; region?: string }>({
      async queryFn({ period, region }, api) {
        const regions = await getRegionsCached(api);
        const byId = new Map<number, string>();
        regions.forEach((r: any) => byId.set(Number(r.id), z2(r.code ?? r.id)));

        const flights = await getFlightsOnce(api, period);

        let total = 0, dSum = 0, dCnt = 0;
        for (const f of flights) {
          const code = byId.get(Number(f.region_id ?? -1)) ?? (f.reg != null ? z2(f.reg) : undefined);
          if (region && region !== 'RU' && code !== z2(region)) continue;
          total += 1;
          const d = durationMin(f);
          if (d > 0) { dSum += d; dCnt += 1; }
        }

        return {
          data: {
            totalFlights: total,
            avgDurationMin: Math.round(dSum / Math.max(dCnt, 1)),
            ratio: 0,
            peakHour: undefined,
          },
        };
      },
    }),

    getTimeseries: build.query<TimeseriesPoint[], { period: string; metric: string; region?: string }>({
      async queryFn({ period, region }, api) {
        const regions = await getRegionsCached(api);
        const byId = new Map<number, string>();
        regions.forEach((r: any) => byId.set(Number(r.id), z2(r.code ?? r.id)));

        const flights = await getFlightsOnce(api, period);

        const m = new Map<string, number>();
        const add = (k: string, v: number = 1) => m.set(k, (m.get(k) ?? 0) + v);

        for (const f of flights) {
          const code = byId.get(Number(f.region_id ?? -1)) ?? (f.reg != null ? z2(f.reg) : undefined);
          if (region && region !== 'RU' && code !== z2(region)) continue;
          const date = String(f.dof ?? '').slice(0, 10);
          if (date) add(date, 1);
        }

        const data = Array.from(m.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, value]) => ({ date, value }));

        return { data };
      },
    }),

  }),
});

/** Шаг 4b: Производные (ссылаются на choropleth предыдущего шага) */
const apiFinal = apiWithAnalyticsCore.injectEndpoints({
  endpoints: (build) => ({

    getRating: build.query<RatingItem[], { period: string; metric: string; limit?: number }>({
      async queryFn({ period, metric, limit = 100 }, api) {
        const thunk = api.dispatch(
          apiWithAnalyticsCore.endpoints.getChoropleth.initiate({ period, metric }, { subscribe: false })
        );
        try {
          const list = await thunk.unwrap();
          const ranked = list
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((r, i) => ({ ...r, rank: i + 1 }))
            .slice(0, limit);
          return { data: ranked };
        } finally {
          thunk.unsubscribe();
        }
      },
    }),

    getRank: build.query<{ rank: number | null; delta: null }, { period: string; metric: string; region: string }>({
      async queryFn({ period, metric, region }, api) {
        const thunk = api.dispatch(
          apiWithAnalyticsCore.endpoints.getChoropleth.initiate({ period, metric }, { subscribe: false })
        );
        try {
          const list = await thunk.unwrap();
          const pos = list
            .slice()
            .sort((a, b) => b.value - a.value)
            .findIndex((x) => z2(x.code) === z2(region));
          return { data: { rank: pos >= 0 ? pos + 1 : null, delta: null } };
        } finally {
          thunk.unsubscribe();
        }
      },
    }),

    getInsight: build.query<{ title: string; subtitle: string }, { period: string; metric: string }>({
      query: ({ period, metric }) => ({
        url: 'insights',
        params: { period, metric },
      }),
      transformResponse: (response: any) =>
        response?.data ?? { title: 'Регион вошёл в топ-3 по росту', subtitle: 'Средняя длительность полётов выросла' },
    }),

  }),
});

/** Итоговый API (без круговых ссылок) */
export const lctApi: typeof apiFinal = apiFinal;

/* ===================== Экспорт хуков ===================== */
export const {
  useGetRegionsQuery,
  useGetCitiesQuery,
  useGetMetaQuery,
  useGetFlightsQuery,      // для отладки
  useGetChoroplethQuery,
  useGetKpiQuery,
  useGetTimeseriesQuery,
  useGetRatingQuery,
  useGetRankQuery,
  useGetInsightQuery,
  useGetRegionStatisticsQuery,
} = lctApi;