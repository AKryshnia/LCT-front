import React, { useEffect, useMemo, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRegionName } from '@/shared/constants/regions';
import { loadGeoJson } from '@/shared/lib/geoJsonLoader';
import { GEO_URL } from '@/shared/constants/geo';

type RegionStat = { code: string; value: number; name?: string };
type Props = {
  data?: RegionStat[];
  onSelect?: (code: string) => void;
  selectedRegion?: string;
  overlay?: React.ReactNode;
  sideOverlay?: React.ReactNode;
};

const RU_BOUNDS: L.LatLngBounds = L.latLngBounds([ [41, 19], [81, 180] ]);

// базовая палитра (по значению метрики)
const baseFill = (v: number) =>
  v > 80 ? '#BFE8F4' : v > 60 ? '#66C4E1' : v > 40 ? '#23A4CF' : v > 20 ? '#1379A6' : '#0B4A6F';

/* ───── helpers: цвет и градиент ───── */
function hexToHsl(hex: string) {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToHex(h: number, s: number, l: number) {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x: number) => {
    const n = Math.round(x * 255).toString(16).padStart(2, '0');
    return n;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function lighten(hex: string, by = 0.12) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(1, l + by));
}
function darken(hex: string, by = 0.10) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - by));
}

/* ───── компонент ───── */
export default function RussiaFlatMap({ data = [], onSelect, selectedRegion, overlay, sideOverlay }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const regionsLayerRef = useRef<L.GeoJSON | null>(null);
  const outlineRef = useRef<L.GeoJSON | null>(null);
  const byCode = useMemo(() => new Map(data.map(d => [d.code, d.value ?? 0])), [data]);

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('ru-map', {
      zoomControl: false,
      minZoom: 3,
      maxZoom: 10,
      maxBounds: RU_BOUNDS.pad(0.1),
      maxBoundsViscosity: 1,
      attributionControl: false,
      preferCanvas: false, // SVG нужен для градиентов
    });
    map.fitBounds(RU_BOUNDS);
    mapRef.current = map;

    // слои/очерёдность
    map.createPane('mask');    map.getPane('mask')!.style.zIndex = '200';
    map.createPane('regions'); map.getPane('regions')!.style.zIndex = '400';
    map.createPane('outline'); map.getPane('outline')!.style.zIndex = '500';

    // REGIONS
    loadGeoJson(GEO_URL)
      .then((geo) => {
        if (!geo) return;
        const regions = L.geoJSON(geo, {
          //pane: 'regions',
          // МЯГКИЕ ГРАНИЦЫ + базовый fill (будет заменён градиентом ниже)
          style: (feat: any): L.PathOptions => {
            const v = byCode.get(feat.properties?.code) ?? 0;
            return {
              fillColor: baseFill(v),
              fillOpacity: 1,
              color: '#ffffff',
              opacity: 0.85,
              weight: 1.4,
              lineJoin: 'round',
              lineCap: 'round',
              className: 'region-soft',
            };
          },
          onEachFeature: (feat: any, layer: L.Path) => {
            const code = String(feat.properties?.code ?? '');
            // Use centralized region name lookup instead of GeoJSON name
            const name = getRegionName(code) || 'Регион';
            const v = byCode.get(code) ?? 0;
            layer.bindTooltip(`${name}: ${v}`, { sticky: true, direction: 'top' });

            // назначаем градиент
            //applyRegionGradient(map, layer, code, baseFill(v));

            layer.on('mouseover', function (this: L.Path) {
              this.setStyle({ weight: 2.2, opacity: 1 });
              (this as any).bringToFront?.();
            });
            layer.on('mouseout', function (this: L.Path) {
              this.setStyle({ weight: 1.4, opacity: 0.85 });
            });
            layer.on('click', () => code && onSelect?.(code));
          },
        }).addTo(map);
        regionsLayerRef.current = regions;
      });

    return () => {
      map.remove();
      mapRef.current = null;
      regionsLayerRef.current = null;
      outlineRef.current = null;
    };
  }, [onSelect]);

  // Перекраска при приходе новых значений: обновляем градиенты и stroke (без пересоздания слоя)
  useEffect(() => {
    const map = mapRef.current;
    const group = regionsLayerRef.current;
    if (!map || !group) return;

    group.eachLayer((layer: any) => {
      const code: string | undefined = layer?.feature?.properties?.code;
      const v = code ? (byCode.get(code) ?? 0) : 0;
      const base = baseFill(v);
      (layer as L.Path).setStyle({
        fillColor: base,
        // stroke остаётся прежним
      } as L.PathOptions);
      //applyRegionGradient(map, layer as L.Path, code ?? 'x', base);
    });
  }, [byCode]);

  // Подсветка выбранного региона
  useEffect(() => {
    const map = mapRef.current;
    const group = regionsLayerRef.current;
    if (!map || !group) return;

    group.eachLayer((layer: any) => {
      const code: string | undefined = layer?.feature?.properties?.code;
      const el = (layer as any).getElement?.() as SVGPathElement | null
             || (layer as any)._path as SVGPathElement | undefined;
      if (!el) return;

      if (code && selectedRegion && code === selectedRegion) {
        el.classList.add('region-selected');
        (layer as L.Path).setStyle({ weight: 2.2, opacity: 1 });
        (layer as any).bringToFront?.();
      } else {
        el.classList.remove('region-selected');
        (layer as L.Path).setStyle({ weight: 1.4, opacity: 0.85 });
      }
    });
  }, [selectedRegion]);

  return (
    <div className="relative">
      <div id="ru-map" className="h-[700px] w-full rounded-2xl overflow-hidden border bg-white" />
      <div className="absolute right-4 bottom-4 z-[1000] pointer-events-none">
        {overlay ?? (
          <div className="bg-white backdrop-blur border shadow p-3 w-[360px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-600">Количество полётов</div>
              <div className="text-xl font-semibold tabular-nums"></div>
            </div>
            <div>
              <div className="h-2 rounded-full"
                   style={{background: 'linear-gradient(90deg, #BFE8F4 0%, #66C4E1 25%, #23A4CF 50%, #1379A6 75%, #0B4A6F 100%)'}} />
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>1–10</span><span>10–30</span><span>30–50</span><span>50–70</span><span>70+</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
