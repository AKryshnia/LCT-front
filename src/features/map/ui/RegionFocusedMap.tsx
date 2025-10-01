import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGeoJson } from '@/shared/lib/geoJsonLoader';
import { getRegionName } from '@/shared/constants/regions';
import { GEO_URL } from '@/shared/constants/geo';

type Props = {
  regionCode: string;       // "46"
  height?: number;
  onSelect?: (code: string) => void;
};

const BLUE = '#0B74E5';
const BLUE_STROKE = '#F2F6FA';
const GREY = '#E6EAEE';

export default function RegionFocusedMap({ regionCode, height = 700, onSelect }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const regionsRef = useRef<L.GeoJSON | null>(null);
  const labelRef = useRef<L.Tooltip | null>(null);
  const overlayRef = useRef<L.Control | null>(null);

  // init map once
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('region-map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
    });
    // однотонный фон как в макете
    (map.getContainer() as HTMLElement).style.background = '#F3F5F8';
    mapRef.current = map;

    // геометрия всей России
    loadGeoJson(GEO_URL).then((geo) => {
      if (!geo || !mapRef.current) return;

      const layer = L.geoJSON(geo as any, {
        style: (feat: any): L.PathOptions => {
          const code = String(feat?.properties?.code ?? '').padStart(2, '0');
          const selected = code === regionCode;
          return {
            fillColor: selected ? BLUE : GREY,
            fillOpacity: selected ? 1 : 1,
            color: selected ? BLUE_STROKE : '#ffffff',
            opacity: selected ? 1 : 1,
            weight: selected ? 3 : 2,
            lineJoin: 'round',
            lineCap: 'round',
            className: 'region-soft',
          };
        },
        onEachFeature: (feat: any, lyr: L.Path) => {
          const code = String(feat?.properties?.code ?? '').padStart(2, '0');

          // ховер — чуть толще
          lyr.on('mouseover', function (this: L.Path) {
            this.setStyle({ weight: code === regionCode ? 3.2 : 2.4, opacity: 1 });
          });
          lyr.on('mouseout', function (this: L.Path) {
            this.setStyle({ weight: code === regionCode ? 3 : 2, opacity: 1 });
          });
          // клик по соседям — смена региона
          lyr.on('click', () => onSelect?.(code));
        },
      }).addTo(map);

      regionsRef.current = layer;

      // fit к выбранному региону
      const target = findLayerByCode(layer, regionCode);
      if (target) {
        const b = (target as any).getBounds?.();
        if (b?.isValid()) map.fitBounds(b.pad(0.35));
        placeLabel(map, target, regionCode, labelRef); // подпись
      }

      // нижний оверлей (метрика + шкала)
      overlayRef.current = makeBottomRightOverlay().addTo(map);
    });

    return () => {
      try { labelRef.current?.remove(); } catch {}
      try { overlayRef.current?.remove(); } catch {}
      try { regionsRef.current?.remove(); } catch {}
      try { map.remove(); } catch {}
      mapRef.current = null;
      regionsRef.current = null;
      labelRef.current = null;
      overlayRef.current = null;
    };
  }, [onSelect]);

  // обновление при смене выбранного региона
  useEffect(() => {
    const map = mapRef.current;
    const group = regionsRef.current;
    if (!map || !group) return;

    group.setStyle((feat: any) => {
      const code = String(feat?.properties?.code ?? '').padStart(2, '0');
      const selected = code === regionCode;
      return {
        fillColor: selected ? BLUE : GREY,
        fillOpacity: 1,
        color: selected ? BLUE_STROKE : '#ffffff',
        opacity: 1,
        weight: selected ? 3 : 2,
        lineJoin: 'round',
        lineCap: 'round',
      } as L.PathOptions;
    });

    const target = findLayerByCode(group, regionCode);
    if (target) {
      const b = (target as any).getBounds?.();
      if (b?.isValid()) map.fitBounds(b.pad(0.35));
      placeLabel(map, target, regionCode, labelRef);
      (target as any).bringToFront?.();
    }
  }, [regionCode]);

  return (
    <div id="region-map" style={{ height }} className="w-full rounded-2xl overflow-hidden border bg-white" />
  );
}

/* ───────── helpers ───────── */

function findLayerByCode(group: L.GeoJSON, code2: string): L.Layer | null {
  let found: L.Layer | null = null;
  (group as any).eachLayer?.((l: any) => {
    const c = String(l?.feature?.properties?.code ?? '').padStart(2, '0');
    if (c === code2) found = l;
  });
  return found;
}

function placeLabel(
  map: L.Map,
  layer: any,
  code: string,
  labelRef: React.MutableRefObject<L.Tooltip | null>
) {
  const code2 = String(code).padStart(2, '0');
  const name = getRegionName(code2) || 'Регион';
  const center = layer.getBounds?.().getCenter?.();
  if (!center) return;

  // убрать предыдущий tooltip (если был)
  if (labelRef.current) {
    try { labelRef.current.remove(); } catch {}
    labelRef.current = null;
  }

  const tt = L.tooltip({
    permanent: true,
    direction: 'center',
    className: 'rfm-pill-tooltip',
    offset: [0, 0],
    opacity: 1,
  })
    .setLatLng(center)
    .setContent(`<div class="rfm-pill"><span class="rfm-code">${code2}</span>&nbsp;${name}</div>`)
    .addTo(map);

  labelRef.current = tt;
}



function makeBottomRightOverlay() {
  const C = L.Control.extend({
    options: { position: 'bottomright' as L.ControlPosition },
    onAdd: function () {
      const div = L.DomUtil.create('div', 'rfm-overlay');
      div.innerHTML = `
        <div class="rfm-card">
          <div class="rfm-card-row">
            <span class="rfm-card-title">Количество полётов</span>
            <span class="rfm-caret">▾</span>
          </div>
          <div class="rfm-scale">
            <span class="rfm-split" style="left:20%"></span>
            <span class="rfm-split" style="left:40%"></span>
            <span class="rfm-split" style="left:60%"></span>
            <span class="rfm-split" style="left:80%"></span>
          </div>
          <div class="rfm-scale-legend">
            <span>70+</span><span>50–70</span><span>30–50</span><span>10–30</span><span>1–10</span>
          </div>
        </div>`;
      return div;
    },
  });
  return new C();
}
