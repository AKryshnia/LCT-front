import React from 'react';
import AreaTrend, { TrendPoint } from '@/widgets/charts/AreaTrend';
import KpiTiles from '@widgets/kpi/KpiTiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaneTakeoff, PlaneLanding } from 'lucide-react';

type BottomSectionProps = {
  className?: string;
  selectedRegion: string | null;
  apiPeriod: string;
  trendData: TrendPoint[];
  onExport: () => void;
};

const BottomSection: React.FC<BottomSectionProps> = ({
  className = '',
  selectedRegion,
  apiPeriod,
  trendData,
  onExport,
}) => {
  return (
    <section className={['relative isolate z-0 space-y-4', className].join(' ').trim()}>
      {/* KPI */}
      <div className="space-y-2">
        <div className="border-b border-slate-200 mb-4 -mr-10 -ml-6" />
        <div className="text-base font-medium mb-2">Динамика полётов</div>
        <KpiTiles region={selectedRegion ?? 'RU'} period={apiPeriod} />
      </div>

      {/* График */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">График</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AreaTrend data={trendData} />
        </CardContent>
      </Card>

      {/* Последний полёт (демо) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
            <span>
              {new Date().toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span>{selectedRegion ? `Регион ${selectedRegion}` : 'Россия'}</span>
          </div>
          <div className="grid grid-cols-3 items-center">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 text-slate-700">
                <PlaneTakeoff className="w-4 h-4" /> Вылет
              </div>
              <div className="text-slate-500 text-xs">12:00</div>
            </div>
            <div className="text-center text-slate-600 text-xs">12 минут в полёте</div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-slate-700">
                Прилет <PlaneLanding className="w-4 h-4" />
              </div>
              <div className="text-slate-500 text-xs">12:12</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Кнопки */}
      <div className="space-y-2">
        <Button variant="ghost" className="w-full">
          Больше
        </Button>
        <Button onClick={onExport} className="w-full bg-black hover:bg-black/90">
          Экспортировать данные
        </Button>
      </div>
    </section>
  );
};

export default BottomSection;
