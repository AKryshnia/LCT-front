import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PeriodMode = 'all' | 'year' | 'quarter' | 'month';

interface FiltersState {
  selectedRegion: string | null;
  periodMode: PeriodMode;
}

const initialState: FiltersState = {
  selectedRegion: null,
  periodMode: 'all',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setSelectedRegion: (s, a: PayloadAction<string | null>) => {
      s.selectedRegion = a.payload;
    },
    setPeriodMode: (s, a: PayloadAction<PeriodMode>) => {
      s.periodMode = a.payload;
    },
  },
});

export const { setSelectedRegion, setPeriodMode } = filtersSlice.actions;
export const filtersReducer = filtersSlice.reducer;
export const selectSelectedRegion = (s: any) => s.filters.selectedRegion as string | null;
export const selectPeriodMode = (s: any) => s.filters.periodMode as PeriodMode;
