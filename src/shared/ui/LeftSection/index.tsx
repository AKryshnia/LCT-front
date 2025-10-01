import React from 'react';
import { TrendPoint } from '@/widgets/charts/AreaTrend';
import TopSection from './TopSection';
import BottomSection from './BottomSection';

type PeriodMode = 'all' | 'year' | 'quarter' | 'month';

type LeftSectionProps = {
  className?: string;
  selectedRegion: string | null;
  setSelectedRegion: (code: string | null) => void;
  periodMode: PeriodMode;
  setPeriodMode: (p: PeriodMode) => void;
  regions: Array<{ code: string; name: string }>;
  insight?: { title?: string; subtitle?: string } | null;
  apiPeriod: string;
  trendData: TrendPoint[];
  onExport: () => void;
};

const LeftSection: React.FC<LeftSectionProps> = ({
  className = '',
  selectedRegion,
  setSelectedRegion,
  periodMode,
  setPeriodMode,
  regions,
  insight,
  apiPeriod,
  trendData,
  onExport,
}) => (
  <aside className={['space-y-4', className].join(' ').trim()}>
    <TopSection
    className="bg-white"
    selectedRegion={selectedRegion}
    setSelectedRegion={setSelectedRegion}
    periodMode={periodMode}
    setPeriodMode={setPeriodMode}
    regions={(regions ?? []).map(r => ({ code: r.code, name: r.name }))}
    insight={insight}
    apiPeriod={apiPeriod}
  />
  <BottomSection
    className="bg-white"
    selectedRegion={selectedRegion}
    apiPeriod={apiPeriod}
    trendData={trendData}
    onExport={onExport}
  />
  </aside>
);

export default LeftSection;
