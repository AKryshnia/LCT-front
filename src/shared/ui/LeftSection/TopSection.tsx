import React from 'react';
import TopRating from '@features/rating/ui/TopRating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { getRegionName } from '@/shared/constants/regions';

export type PeriodMode = 'all' | 'year' | 'quarter' | 'month';

type TopSectionProps = {
  className?: string;
  selectedRegion: string | null;
  setSelectedRegion: (code: string | null) => void;
  periodMode: PeriodMode;
  setPeriodMode: (p: PeriodMode) => void;
  regions: Array<{ code: string; name: string }>;
  insight?: { title?: string; subtitle?: string } | null;
  apiPeriod: string;
};

const TopSection: React.FC<TopSectionProps> = ({
  className = '',
  selectedRegion,
  setSelectedRegion,
  periodMode,
  setPeriodMode,
  regions,
  insight,
  apiPeriod,
}) => {
  return (
    <section className={['relative isolate z-0 sticky top-4 self-start max-h-[calc(100dvh-4rem)] overflow-y-auto', className].join(' ').trim()}>
      {/* Region + Period */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen bg-white -z-10"
      />
      <div className="grid grid-cols-2 gap-3">
        {/* Регион */}
        <div className="flex flex-col gap-1">
          <div className="text-base font-medium">Регион</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="justify-between border border-slate-100 border-[1px] rounded-[16px] p-6 bg-slate-100"
              >
                {selectedRegion ? getRegionName(selectedRegion) : 'Россия'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedRegion(null)}>Россия</DropdownMenuItem>
              {regions.slice(0, 10).map((r) => (
                <DropdownMenuItem key={r.code} onClick={() => setSelectedRegion(r.code)}>
                  {r.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Период */}
        <div className="flex flex-col gap-1">
          <div className="text-base font-medium">Период</div>
          <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
            <SelectTrigger className="h-9 border border-slate-100 border-[1px] rounded-[16px] p-6 bg-slate-100">
              <SelectValue placeholder="За квартал" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter">За квартал</SelectItem>
              <SelectItem value="year">За год</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Инсайт */}
      <Card className="border border-transparent shadow-none">
        <CardContent className="p-4">
          <div className="border-b border-slate-200 mb-4 -mr-10 -ml-10" />
          <div className="text-xl font-semibold leading-snug">
            {insight?.title ?? 'Регион N вошёл в топ-3 по росту активности'}
          </div>
          <div className="text-slate-600 mt-1">
            {insight?.subtitle ?? 'Средняя длительность полётов БВС выросла на 25%'}
          </div>
        </CardContent>
      </Card>

      {/* Рейтинг */}
      <Card className="border border-slate-50 border-[1px] rounded-[16px] px-2 py-0 bg-slate-50 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-[20px]">Рейтинг регионов</CardTitle>
        </CardHeader>
        <CardContent>
          <TopRating limit={3} metric="count" period={apiPeriod} />
        </CardContent>
      </Card>
    </section>
  );
};

export default TopSection;
