// RussiaChoropleth.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import CompareSheet from '@/features/compare/ui/CompareSheet';
import { useGetChoroplethQuery } from '@/shared/api/lctApi';
import { loadGeoJson } from '@/shared/lib/geoJsonLoader';

type RegionStat = { code: string; value: number; name?: string };

type Props = {
  data?: RegionStat[];
  metric?: string;
  period?: string;
  onSelect?: (code: string) => void;
};

const GEO_URL = '/regions-simplified.patched.geojson';
const scale = (v: number) =>
  v > 80 ? '#0B4A6F' : v > 60 ? '#1379A6' : v > 40 ? '#23A4CF' : v > 20 ? '#66C4E1' : '#BFE8F4';

export default function RussiaChoropleth({
  data,
  metric = 'count',
  period = '2025-Q3',
  onSelect,
}: Props) {
  // API
  const { data: apiChoropleth } = useGetChoroplethQuery({ metric, period });

  // итоговый источник данных
  const source: RegionStat[] = (apiChoropleth as any as RegionStat[]) ?? data ?? [];
  const byCode = useMemo(
    () => new Map(source.map((d) => [String(d.code).padStart(2, '0'), Number(d.value) || 0])),
    [apiChoropleth, data]
  );

  // refs
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON<any> | null>(null);
  const initDone = useRef(false); // защита от повторной инициализации в StrictMode

  // init map and layer — once
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const map = L.map('map-root', { zoomControl: false }).setView([61, 100], 3);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const tooltipText = (feat: any) => {
      const code = String(feat?.properties?.code ?? '').padStart(2, '0');
      const v = byCode.get(code) ?? 0;
      const n = feat?.properties?.name ?? code;
      return `${n}: ${v}`;
    };

    // ⬇️ общий лоадер (дедуплицирует параллельные запросы)
    loadGeoJson(GEO_URL)
      .then((geo) => {
        if (!geo || !mapRef.current) return;

        const gjson = L.geoJSON(geo as any, {
          style: (feat: any) => {
            const code = String(feat?.properties?.code ?? '').padStart(2, '0');
            const v = byCode.get(code) ?? 0;
            return { color: '#fff', weight: 2, fillColor: scale(v), fillOpacity: 1 };
          },
          onEachFeature: (feat: any, layer: any) => {
            layer.bindTooltip(tooltipText(feat), { sticky: true });

            layer.on('mouseover', () => layer.setStyle({ weight: 3, color: '#334155' }));
            layer.on('mouseout', () => layer.setStyle({ weight: 2, color: '#fff' }));
            layer.on('click', () => onSelect?.(String(feat?.properties?.code).padStart(2, '0')));

            layer.on('add', () => {
              const el = layer.getElement?.();
              if (el) L.DomUtil.addClass(el, 'cursor-pointer');
            });
          },
        }).addTo(map);

        layerRef.current = gjson;
        try {
          map.fitBounds(gjson.getBounds(), { padding: [40, 40] });
        } catch {}
      })
      .catch(console.error);

    // legend
    const legend = new L.Control({ position: 'bottomleft' } as L.ControlOptions);
    (legend as any).onAdd = () => {
      const div = L.DomUtil.create('div', 'legend bg-white rounded-xl shadow px-3 py-2 text-xs');
      div.innerHTML = `
        <div class="mb-1 font-medium">0% — 80%+</div>
        <div class="flex items-center gap-2">
          ${[0, 20, 40, 60, 80]
            .map(
              (v) =>
                `<span style="display:inline-block;width:40px;height:10px;background:${scale(
                  v + 0.1
                )}"></span>`
            )
            .join('')}
        </div>`;
      return div;
    };
    legend.addTo(map);

    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect]); // инициализация 1 раз

  // update style and tooltips on data change
  useEffect(() => {
    if (!layerRef.current) return;

    const tooltipText = (feat: any) => {
      const code = String(feat?.properties?.code ?? '').padStart(2, '0');
      const v = byCode.get(code) ?? 0;
      const n = feat?.properties?.name ?? code;
      return `${n}: ${v}`;
    };

    layerRef.current.setStyle((feat: any) => {
      const code = String(feat?.properties?.code ?? '').padStart(2, '0');
      const v = byCode.get(code) ?? 0;
      return { color: '#fff', weight: 2, fillColor: scale(v), fillOpacity: 1 };
    });

    (layerRef.current as any).eachLayer?.((l: any) => {
      const f = l.feature;
      const t = l.getTooltip?.();
      if (t) t.setContent(tooltipText(f));
    });
  }, [byCode]);

  return (
    <div className="relative">
      <div className="absolute right-4 top-4 flex gap-2 z-[1000]">
        <CompareSheet all={(data ?? source) as any} />
        <Button size="icon" className="rounded-full">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div id="map-root" className="h-[520px] w-full rounded-2xl overflow-hidden border" />
    </div>
  );
}
