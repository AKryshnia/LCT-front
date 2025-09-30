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

export type CreateFlightDto = {
  sid: string;
  reg: string;
  dep: string;
  dest: string;
  /** Laravel ждёт "HH:MM" или "HH:MM:SS" */
  eet: string;
  dof: string;       // 'YYYY-MM-DD'
  dep_time: string;  // 'HH:MM:SS'
  arr_time: string;  // 'HH:MM:SS'
  region_id: number;
  zona?: string;
  typ?: string;
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

// запись подходит для серверной статистики?
const validForStats = (f: FlightRow) => {
  const has = (v: any) => v != null && String(v).trim() !== '';
  return has(f.dep) && has(f.dest) && has(f.dof) && has(f.dep_time) && has(f.arr_time);
};

// построение двух вариантов параметров под разные бэки
function buildFlightParamVariants(
  from: string,
  to: string,
  regionIds?: number[]
): Array<Record<string, any>> {
  const v: Array<Record<string, any>> = [];
  // A) «наши» ключи
  const va: Record<string, any> = { date_from: from, date_to: to };
  if (regionIds?.length === 1) va.region_id = regionIds[0];
  v.push(va);
  // B) как на сервере
  const vb: Record<string, any> = { datefrom: from, dateto: to };
  if (regionIds?.length) vb['regions[]'] = regionIds;
  v.push(vb);
  return v;
}

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
    if (diff < 0) diff += 24 * 60; // через полночь
    return diff;
  }
  return 0;
};

const isoWeek = (d: Date): number => {
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dd.getUTCDay() || 7;
  dd.setUTCDate(dd.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
  return Math.ceil(((+dd - +yearStart) / 86400000 + 1) / 7);
};
const quarterOf = (month1to12: number): number => Math.floor((month1to12 - 1) / 3) + 1;
const seasonOf = (month1to12: number): "Winter" | "Spring" | "Summer" | "Autumn" => {
  if (month1to12 === 12 || month1to12 <= 2) return "Winter";
  if (month1to12 <= 5) return "Spring";
  if (month1to12 <= 8) return "Summer";
  return "Autumn";
};
const toHours = (min: number): number => +(min / 60).toFixed(2);

const periodToRange = (p: string): [string, string] => {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();
  const Y = today.getUTCFullYear();
  const M = today.getUTCMonth();

  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})$/.exec(p))) return [`${m[1]}-01-01`, `${m[1]}-12-31`];
  if ((m = /^(\d{4})-Q([1-4])$/.exec(p))) {
    const y = +m[1], q = +m[2], sm = [0, 3, 6, 9][q - 1];
    return [fmt(new Date(Date.UTC(y, sm, 1))), fmt(new Date(Date.UTC(y, sm + 3, 0)))];
  }
  if ((m = /^(\d{4})-(\d{2})$/.exec(p))) {
    const y = +m[1], mo = +m[2] - 1;
    return [fmt(new Date(Date.UTC(y, mo, 1))), fmt(new Date(Date.UTC(y, mo + 1, 0)))];
  }
  if ((m = /^range:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(p))) {
    return [m[1], m[2]];
  }

  if (p === 'year') return [`${Y}-01-01`, `${Y}-12-31`];
  if (p === 'quarter') {
    const q = Math.floor(M / 3), sm = q * 3;
    return [fmt(new Date(Date.UTC(Y, sm, 1))), fmt(new Date(Date.UTC(Y, sm + 3, 0)))];
  }
  if (p === 'month') return [fmt(new Date(Date.UTC(Y, M, 1))), fmt(new Date(Date.UTC(Y, M + 1, 0)))];
  if (p === 'week') {
    const d = new Date(Date.UTC(Y, M, today.getUTCDate()));
    const wd = d.getUTCDay() || 7;
    const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - (wd - 1));
    const sunday = new Date(d); sunday.setUTCDate(d.getUTCDate() + (7 - wd));
    return [fmt(monday), fmt(sunday)];
  }

  // дефолт — последние 365 дней
  const yearAgo = new Date(Date.UTC(Y - 1, M, today.getUTCDate()));
  return [fmt(yearAgo), fmt(today)];
};

/* ===================== Пэйджинг/кэш — ТОЛЬКО в getFlights ===================== */

type BoundBQ = (args: string | FetchArgs) => Promise<{ data?: any; error?: FetchBaseQueryError }>;

const PAGE_SIZE = 2000;
// для Laravel достаточно per_page
const PAGE_KEYS = ['per_page'] as const;
const CONCURRENCY = 6;
const FLIGHTS_TTL_MS = 24 * 60 * 60 * 1000;

// дедупликация «в полёте» по одинаковым url+params
const inflightPages = new Map<string, Promise<any[]>>();
const qs = (obj: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else if (v != null) p.append(k, String(v));
  });
  return p.toString();
};

const parseLastFromLinks = (links: any): number | undefined => {
  const u = (links && (links.last || links?.Last || links?.LAST)) as string | undefined;
  if (!u || typeof u !== 'string') return;
  const m = /[?&]page=(\d+)/.exec(u);
  return m ? +m[1] : undefined;
};

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
): Promise<{ key?: string; firstData: any[]; lastPage: number }> {
  // пробуем с per_page
  for (const k of PAGE_KEYS) {
    const res = await bq({ url, params: { ...base, page: 1, [k]: PAGE_SIZE } });
    if ('error' in res && res.error) continue;
    const body: any = res.data ?? {};
    const data: any[] = Array.isArray(body) ? body : (body.data ?? []);
    const lastViaMeta = body?.meta?.last_page as number | undefined;
    const lastViaLinks = parseLastFromLinks(body?.links);
    const last = lastViaMeta ?? lastViaLinks ?? 1;
    if (data.length === 0) {
      return { key: k, firstData: [], lastPage: 1 };
    }
    return { key: k, firstData: data, lastPage: last };
  }
  // без per_page — всё равно сможем листать page=2..N
  const res = await bq({ url, params: { ...base, page: 1 } });
  const body: any = res.data ?? {};
  const data: any[] = Array.isArray(body) ? body : (body.data ?? []);
  const lastViaMeta = body?.meta?.last_page as number | undefined;
  const lastViaLinks = parseLastFromLinks(body?.links);
  const last = lastViaMeta ?? lastViaLinks ?? 1;
  if (data.length === 0) {
    return { key: undefined, firstData: [], lastPage: 1 };
  }
  return { key: undefined, firstData: data, lastPage: last };
}

async function fetchAllPagesSmart(
  bq: BoundBQ,
  url: string,
  params: Record<string, any>,
  cacheKey: string
): Promise<any[]> {
  const cached = await idbCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < FLIGHTS_TTL_MS) return cached.items;

  const inflightKey = cacheKey;
  if (inflightPages.has(inflightKey)) return inflightPages.get(inflightKey)!;

  const run = (async () => {
    const { key, firstData, lastPage } = await detectPageKey(bq, url, params);
    if (!lastPage || lastPage === 1) {
      await idbCache.set(cacheKey, { savedAt: Date.now(), items: firstData });
      return firstData;
    }

    const pages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
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
  })();

  inflightPages.set(inflightKey, run);
  try {
    return await run;
  } finally {
    inflightPages.delete(inflightKey);
  }
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
      // ключ кэша теперь по нормализованному диапазону, а не по строке period
      serializeQueryArgs: ({ queryArgs }) => {
        const [from, to] = periodToRange(queryArgs.period);
        const rc = (queryArgs.regionCodes ?? []).slice().sort().join(',');
        return JSON.stringify([from, to, rc]);
      },
      keepUnusedDataFor: 600,
      async queryFn({ period, regionCodes }, _api, _extra, bq) {
        const bound = bq as BoundBQ;
        const [from, to] = periodToRange(period);

        // сопоставляем код → ID (если один регион)
        let regionIds: number[] | undefined;
        if (regionCodes?.length) {
          const regions = await getRegionsCached(_api);
          const byCode = new Map(regions.map(r => [z2(r.code ?? r.id), Number(r.id)]));
          regionIds = regionCodes
            .map(c => byCode.get(z2(c)))
            .filter((x): x is number => Number.isFinite(x));
        }

        const variants = buildFlightParamVariants(from, to, regionIds);
        // ключи кэша и дедупа — по диапазону
        const cacheKeyBase = `flights:${from}:${to}:${(regionIds ?? []).join(',')}`;

        const fetchWith = async (params: Record<string, any>) =>
          fetchAllPagesSmart(bound, '/flight', params, `${cacheKeyBase}:${Object.keys(params).sort().join('|')}`);

        const inDate = (f: any) => {
          const d = String(f?.dof ?? '').slice(0, 10);
          return /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= from && d <= to;
        };
        const inRegion = (f: any) =>
          !regionIds?.length || regionIds.includes(Number(f?.region_id));

        try {
          // вариант A
          try {
            const all = await fetchWith(variants[0]);
            const filtered = (all as any[]).filter(inRegion).filter(inDate);
            return { data: filtered as FlightRow[] };
          } catch {
            // вариант B
            const all = await fetchWith(variants[1]);
            const filtered = (all as any[]).filter(inRegion).filter(inDate);
            return { data: filtered as FlightRow[] };
          }
        } catch (e) {
          return { error: e as FetchBaseQueryError };
        }
      },
    }),

    addFlight: build.mutation<Partial<FlightRow> & { id: number }, CreateFlightDto>({
      query: (body) => ({ url: '/flight', method: 'POST', body }),
      transformResponse: (r: any) => {
        if (!r) return { id: NaN } as any;
        if (Array.isArray(r)) return (r[0] ?? r) as any;
        if (r?.data) return r.data;
        return r;
      },
    }),
  }),
});

/** Шаг 3: Справочники и статистика */
const apiWithRefs = apiWithFlights.injectEndpoints({
  endpoints: (build) => ({

    getRegionStatistics: build.query<RegionStatistics, { regionCode: string }>({
      async queryFn({ regionCode }, api, _extra, bq) {
        const regions = await getRegionsCached(api);
        const byCode = new Map(regions.map(r => [z2(r.code ?? r.id), Number(r.id)]));
        const rid = byCode.get(z2(regionCode));
        if (!rid) return { error: { status: 400, data: 'Unknown region code' } as any };

        const isErr = (v: any): v is { error: FetchBaseQueryError } =>
          v && typeof v === 'object' && 'error' in v && !!(v as any).error;

        const res = await (bq as BoundBQ)(`/statistics/region/${rid}`);
        if (isErr(res)) {
          const status = (res.error as any)?.status ?? (res.error as any)?.originalStatus;

          if (status === 500) {
            // fallback — считаем сами «за всё время» по /flight?regions[]=rid
            try {
              const flights: FlightRow[] = await fetchAllPagesSmart(
                bq as BoundBQ, '/flight', { ['regions[]']: [rid] }, `statsFallback:${rid}`
              );

              type Agg = { count: number; sumMin: number; minMin: number; maxMin: number };
              const aggInit = (): Agg => ({ count: 0, sumMin: 0, minMin: Infinity, maxMin: 0 });

              const byYear = new Map<number, Agg>();
              const byYearMonth = new Map<number, Map<number, Agg>>();
              const byYearWeek = new Map<number, Map<number, Agg>>();
              const byYearQuarter = new Map<number, Map<number, Agg>>();
              const byQuarter = new Map<number, Agg>();
              const byYearSeason = new Map<number, Map<"Winter"|"Spring"|"Summer"|"Autumn", Agg>>();
              const weeksSeen = new Set<string>();

              let total = 0;
              for (const f of flights) {
                if (!validForStats(f)) continue;
                const dateStr = String(f.dof).slice(0, 10);
                const y = +dateStr.slice(0, 4);
                const m = +dateStr.slice(5, 7);
                if (!y || !m) continue;

                const d = new Date(dateStr + 'T00:00:00Z');
                const w = isoWeek(d);
                const q = quarterOf(m);
                const s = seasonOf(m);
                const durMin = Math.max(0, durationMin(f));

                const touch = (a: Agg, x: number) => {
                  a.count++; a.sumMin += x; a.minMin = Math.min(a.minMin, x); a.maxMin = Math.max(a.maxMin, x);
                };

                touch(byYear.get(y) ?? byYear.set(y, aggInit()).get(y)!, durMin);

                const ym = byYearMonth.get(y) ?? new Map<number, Agg>(); byYearMonth.set(y, ym);
                touch(ym.get(m) ?? ym.set(m, aggInit()).get(m)!, durMin);

                const yw = byYearWeek.get(y) ?? new Map<number, Agg>(); byYearWeek.set(y, yw);
                touch(yw.get(w) ?? yw.set(w, aggInit()).get(w)!, durMin);

                const yq = byYearQuarter.get(y) ?? new Map<number, Agg>(); byYearQuarter.set(y, yq);
                touch(yq.get(q) ?? yq.set(q, aggInit()).get(q)!, durMin);

                touch(byQuarter.get(q) ?? byQuarter.set(q, aggInit()).get(q)!, durMin);

                const ys = byYearSeason.get(y) ?? new Map<"Winter"|"Spring"|"Summer"|"Autumn", Agg>(); byYearSeason.set(y, ys);
                touch(ys.get(s) ?? ys.set(s, aggInit()).get(s)!, durMin);

                weeksSeen.add(`${y}-${w}`);
                total++;
              }

              const toYearArr = (m: Map<number, Agg>) =>
                Array.from(m.entries())
                  .sort(([a],[b]) => a - b)
                  .map(([year, a]) => ({
                    year,
                    flight_count: a.count,
                    avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                    min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                    max_flight_time: a.count ? toHours(a.maxMin) : 0,
                  }));

              const by_year = toYearArr(byYear);

              const by_year_and_month = Array.from(byYearMonth.entries())
                .sort(([a],[b]) => a - b)
                .map(([year, mm]) => ({
                  year,
                  months: Array.from(mm.entries())
                    .sort(([a],[b]) => a - b)
                    .map(([month, a]) => ({
                      month,
                      flight_count: a.count,
                      avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                      min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                      max_flight_time: a.count ? toHours(a.maxMin) : 0,
                    })),
                }));

              const by_year_and_week = Array.from(byYearWeek.entries())
                .sort(([a],[b]) => a - b)
                .map(([year, ww]) => ({
                  year,
                  weeks: Array.from(ww.entries())
                    .sort(([a],[b]) => a - b)
                    .map(([week_number, a]) => ({
                      week_number,
                      flight_count: a.count,
                      avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                      min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                      max_flight_time: a.count ? toHours(a.maxMin) : 0,
                    })),
                }));

              const by_quarter = Array.from(byQuarter.entries())
                .sort(([a],[b]) => a - b)
                .map(([quarter, a]) => ({
                  quarter,
                  flight_count: a.count,
                  avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                  min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                  max_flight_time: a.count ? toHours(a.maxMin) : 0,
                }));

              const by_year_and_quarter = Array.from(byYearQuarter.entries())
                .sort(([a],[b]) => a - b)
                .map(([year, qq]) => ({
                  year,
                  quarters: Array.from(qq.entries())
                    .sort(([a],[b]) => a - b)
                    .map(([quarter, a]) => ({
                      quarter,
                      flight_count: a.count,
                      avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                      min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                      max_flight_time: a.count ? toHours(a.maxMin) : 0,
                    })),
                }));

              const by_year_and_season = Array.from(byYearSeason.entries())
                .sort(([a],[b]) => a - b)
                .map(([year, ss]) => ({
                  year,
                  seasons: (["Winter","Spring","Summer","Autumn"] as const)
                    .filter(s => ss.has(s))
                    .map((season) => {
                      const a = ss.get(season)!;
                      return {
                        season,
                        flight_count: a.count,
                        avg_flight_time: a.count ? toHours(a.sumMin / a.count) : 0,
                        min_flight_time: a.count ? toHours(a.minMin === Infinity ? 0 : a.minMin) : 0,
                        max_flight_time: a.count ? toHours(a.maxMin) : 0,
                      };
                    }),
                }));

              const years_covered = byYear.size;
              const weeks_covered = weeksSeen.size;

              return {
                data: {
                  region: { id: rid, name: regions.find(r => +r.id === rid)?.name ?? String(rid) },
                  summary: { total_flights: total, years_covered, weeks_covered },
                  statistics: {
                    by_year,
                    by_year_and_month,
                    by_year_and_week,
                    by_quarter,
                    by_year_and_quarter,
                    by_year_and_season,
                  },
                } as RegionStatistics,
              };
            } catch (err) {
              console.warn('Fallback statistics failed:', err);
              return {
                data: {
                  region: { id: rid, name: regions.find(r => +r.id === rid)?.name ?? String(rid) },
                  summary: { total_flights: 0, years_covered: 0, weeks_covered: 0 },
                  statistics: {
                    by_year: [], by_year_and_month: [], by_year_and_week: [],
                    by_quarter: [], by_year_and_quarter: [], by_year_and_season: [],
                  },
                } as any,
              };
            }
          }

          return { error: res.error as FetchBaseQueryError };
        }

        const body: any = (res as any).data ?? res;
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
      async queryFn() { return { data: FALLBACK_META }; },
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

// дедуп верхнего «агрегирующего» запроса getFlights — уже по [from,to,regions]
const inflight = new Map<string, Promise<FlightRow[]>>();
const getFlightsOnce = async (
  api: any,
  period: string,
  regionCodes?: string[]
): Promise<FlightRow[]> => {
  const [from, to] = periodToRange(period);
  const key = JSON.stringify([from, to, (regionCodes ?? []).slice().sort().join(',')]);
  const select = apiWithFlights.endpoints.getFlights.select({ period, regionCodes });
  const cached = select(api.getState() as any);
  if (cached?.data) return cached.data;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    const thunk = api.dispatch(
      apiWithFlights.endpoints.getFlights.initiate({ period, regionCodes }, { subscribe: false })
    );
    try {
      const result = await thunk.unwrap();
      return result;
    } catch (error) {
      inflight.delete(key); // Удаляем только при ошибке
      throw error;
    } finally {
      thunk.unsubscribe();
    }
  })();

  inflight.set(key, p);
  return p;
};

/** Шаг 4a: Ядро аналитики */
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
        const flights = await getFlightsOnce(
          api,
          period,
          region && region !== 'RU' ? [region] : undefined
        );

        let total = 0, dSum = 0, dCnt = 0;
        for (const f of flights) {
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
        const flights = await getFlightsOnce(
          api,
          period,
          region && region !== 'RU' ? [region] : undefined
        );

        const m = new Map<string, number>();
        for (const f of flights) {
          const date = String(f.dof ?? '').slice(0, 10);
          if (date) m.set(date, (m.get(date) ?? 0) + 1);
        }

        const data = Array.from(m.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, value]) => ({ date, value }));

        return { data };
      },
    }),

  }),
});

/** Шаг 4b: Производные */
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
      query: ({ period, metric }) => ({ url: 'insights', params: { period, metric } }),
      transformResponse: (r: any) =>
        r?.data ?? { title: 'Регион вошёл в топ-3 по росту', subtitle: 'Средняя длительность полётов выросла' },
    }),

  }),
});

/** Итоговый API */
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
  useAddFlightMutation,
} = lctApi;
