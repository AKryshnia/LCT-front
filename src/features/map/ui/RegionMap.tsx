import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
//import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RussiaFlatMap from './RussiaFlatMap';

type RegionData = {
  code: string;
  name: string;
  population: number;
  area: number;
  flights: number;
  avgDuration: number;
  growth: number;
  place: number;
  responsible: string;
  avatar: string;
  hasDevelopmentProgram: boolean;
  specialization: string;
  hasTestSite: boolean;
};

type RegionMapProps = {
  selectedRegion?: string;
  onRegionSelect?: (code: string) => void;
  className?: string;
  regionsData?: RegionData[];
};

// Mock data - replace with real API calls
const getRegionData = (code: string): RegionData => {
  // This is mock data - replace with actual API call
  const mockData: Record<string, RegionData> = {
    '46': {
      code: '46',
      name: 'Курск',
      population: 434696,
      area: 29800,
      flights: 1500,
      avgDuration: 12,
      growth: 25,
      place: 3,
      responsible: 'Олег Иванов',
      avatar: '/avatar-placeholder.png',
      hasDevelopmentProgram: true,
      specialization: 'Сельское хозяйство',
      hasTestSite: true,
    },
    // Add more regions as needed
  };
  
  return mockData[code] || {
    code,
    name: `Регион ${code}`,
    population: 0,
    area: 0,
    flights: 0,
    avgDuration: 0,
    growth: 0,
    place: 0,
    responsible: 'Не назначен',
    avatar: '',
    hasDevelopmentProgram: false,
    specialization: 'Не указана',
    hasTestSite: false,
  };
};

export const RegionMap: React.FC<RegionMapProps> = ({
  selectedRegion: initialRegion = '46',
  onRegionSelect,
  className = '',
  regionsData = [],
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [regionData, setRegionData] = useState<RegionData | null>(null);

  // Load region data when selected region changes
  useEffect(() => {
    if (selectedRegion) {
      // In a real app, you would fetch this data from an API
      const data = getRegionData(selectedRegion);
      setRegionData(data);
    }
  }, [selectedRegion]);

  const handleRegionSelect = useCallback((code: string) => {
    setSelectedRegion(code);
    onRegionSelect?.(code);
  }, [onRegionSelect]);

  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  }, []);

  // Prepare data for the map
  const mapData = useMemo(() => {
    return regionsData.map(region => ({
      code: region.code,
      value: region.flights ?? 0,
      name: region.name ?? `Регион ${region.code}`,
      selected: region.code === selectedRegion,
    }));
  }, [regionsData, selectedRegion]);

  if (!regionData) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className={`relative h-full ${className}`}>
      <div className="absolute inset-0 z-0">
        <RussiaFlatMap
          data={mapData}
          onSelect={handleRegionSelect}
          selectedRegion={selectedRegion}
        />
      </div>
      
      <div className="absolute right-4 top-4 bottom-4 w-80 z-10 flex flex-col">
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl font-bold">
                {regionData.code}
              </div>
              <div>
                <CardTitle className="text-xl">{regionData.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {formatNumber(regionData.population)} жителей · {formatNumber(regionData.area)} км²
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                {/*<Avatar>
                  <AvatarImage src={regionData.avatar} />
                  <AvatarFallback>
                    {regionData.responsible
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>*/}
              </div>
              <div>
                <div className="text-sm font-medium">{regionData.responsible}</div>
                <div className="text-xs text-muted-foreground">Ответственный</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Статистика полётов</h3>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Вылетов" value={formatNumber(regionData.flights)} />
                <StatCard label="Среднее время" value={`${regionData.avgDuration} мин`} />
                <StatCard 
                  label="Рост/падение" 
                  value={`${regionData.growth >= 0 ? '+' : ''}${regionData.growth}%`} 
                  className={regionData.growth >= 0 ? 'text-green-600' : 'text-red-600'} 
                />
                <StatCard label="Место в рейтинге" value={`#${regionData.place}`} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Дополнительно</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Программа развития БАС</span>
                  <span>{regionData.hasDevelopmentProgram ? 'Есть' : 'Нет'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Специализация региона</span>
                  <span>{regionData.specialization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Наличие полигона БАС</span>
                  <span>{regionData.hasTestSite ? 'Да' : 'Нет'}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <div className="p-4 border-t">
            <Button className="w-full" variant="outline">
              Подробная статистика
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => (
  <div className="p-3 border rounded-lg">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className={`font-medium ${className}`}>{value}</div>
  </div>
);

export default RegionMap;
