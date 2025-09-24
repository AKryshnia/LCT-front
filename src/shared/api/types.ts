export type RegionRow = {
    id: number;
    code: string;          // "01".."99"
    name: string;
    type: string;
    type_short: string;
    population?: string;
    image?: string;
    capital?: {
      name: string;
      population?: string;
      lat?: string;
      lon?: string;
    };
  };
  
  export type CityRow = {
    id: number;
    name: string;
    population?: string;
    lat?: string;
    lon?: string;
    is_capital?: boolean;
  };
  
  export type Paged<T> = {
    data: T[];
    meta?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    links?: { next?: string | null };
  };
  
  export type ChoroplethPoint = { code: string; value: number };
  export type RatingItem = { code: string; name: string; value: number; rank: number };
  export type Kpi = {
    total_flights: number;
    avg_duration_min: number;
    growth_ratio_pct: number;
    daily_avg: number;
  };
  export type TimeseriesPoint = { date: string; value: number };
  export type Rank = { rank: number; delta?: number };
  export type Insight = { title: string; subtitle?: string };
  