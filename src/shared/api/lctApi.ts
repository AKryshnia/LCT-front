import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './base';
import type {
  RegionRow, CityRow, Paged,
  ChoroplethPoint, RatingItem, Kpi, TimeseriesPoint, Rank, Insight
} from './types';

const zpad = (code: string | number) => String(code).padStart(2, '0');

export const lctApi = createApi({
  reducerPath: 'lctApi',
  baseQuery,
  tagTypes: ['Region', 'City', 'Stats'],
  endpoints: (build) => ({

    // ===== справочники (на бэке) =====
    getRegions: build.query<RegionRow[], void>({
      query: () => '/region',
      transformResponse: (res: Paged<RegionRow> | RegionRow[] ) => {
        const data = Array.isArray(res) ? res : res.data;
        return (data ?? []).map(r => ({ ...r, code: zpad(r.code) }));
      },
      providesTags: ['Region'],
    }),

    getCities: build.query<Paged<CityRow>, { page?: number; per_page?: number }>({
      query: ({ page = 1, per_page = 100 } = {}) => `/city?page=${page}&per_page=${per_page}`,
      transformResponse: (res: Paged<CityRow>) => res,
      providesTags: ['City'],
    }),

    // ===== статистика (попросим у бэка, но есть MSW-заглушки) =====
    getChoropleth: build.query<ChoroplethPoint[], { metric: string; period: string }>({
      query: ({ metric, period }) => `/stats/choropleth?metric=${metric}&period=${encodeURIComponent(period)}`,
      transformResponse: (res: { data: ChoroplethPoint[] } | ChoroplethPoint[]) =>
        Array.isArray(res) ? res : res.data,
      providesTags: ['Stats'],
    }),

    getRating: build.query<RatingItem[], { metric: string; period: string; limit?: number }>({
      query: ({ metric, period, limit = 3 }) =>
        `/stats/rating?metric=${metric}&period=${encodeURIComponent(period)}&limit=${limit}`,
      transformResponse: (res: { data: RatingItem[] } | RatingItem[]) =>
        Array.isArray(res) ? res : res.data,
      providesTags: ['Stats'],
    }),

    getKpi: build.query<Kpi, { region: string; period: string }>({
      query: ({ region, period }) => `/stats/kpi?region=${region}&period=${encodeURIComponent(period)}`,
      transformResponse: (res: Kpi | { data: Kpi }) => (('data' in (res as any)) ? (res as any).data : res) as Kpi,
      providesTags: ['Stats'],
    }),

    getTimeseries: build.query<TimeseriesPoint[], { region: string; period: string }>({
      query: ({ region, period }) => `/stats/timeseries?region=${region}&period=${encodeURIComponent(period)}`,
      transformResponse: (res: { data: TimeseriesPoint[] } | TimeseriesPoint[]) =>
        Array.isArray(res) ? res : res.data,
      providesTags: ['Stats'],
    }),

    getRank: build.query<Rank, { region: string; period: string }>({
      query: ({ region, period }) => `/stats/rank?region=${region}&period=${encodeURIComponent(period)}`,
      transformResponse: (res: Rank | { data: Rank }) => (('data' in (res as any)) ? (res as any).data : res) as Rank,
      providesTags: ['Stats'],
    }),

    getInsight: build.query<Insight, { region: string; period: string }>({
      query: ({ region, period }) => `/insights?region=${region}&period=${encodeURIComponent(period)}`,
      transformResponse: (res: Insight | { data: Insight }) =>
        (('data' in (res as any)) ? (res as any).data : res) as Insight,
    }),
  }),
});

export const {
  useGetRegionsQuery,
  useGetCitiesQuery,
  useGetChoroplethQuery,
  useGetRatingQuery,
  useGetKpiQuery,
  useGetTimeseriesQuery,
  useGetRankQuery,
  useGetInsightQuery,
} = lctApi;
