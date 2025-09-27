// src/features/map/ui/RegionFocusedMap.tsx
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  regionCode: string; // "77"
  height?: number;
  onSelect?: (code: string) => void;
};

export default function RegionFocusedMap({ regionCode, height = 700 }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const regionLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map('region-map', {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      regionLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear previous
    if (regionLayerRef.current) {
      regionLayerRef.current.removeFrom(map);
      regionLayerRef.current = null;
    }

    fetch('/regions-simplified.patched.geojson')
      .then(r => r.ok ? r.json() : null)
      .then((geo) => {
        if (!geo) return;
        const only = {
          type: 'FeatureCollection',
          features: (geo.features || []).filter((f: any) => String(f.properties?.code).padStart(2, '0') === regionCode),
        } as any;
        const layer = L.geoJSON(only, {
          style: { color: '#0B4A6F', weight: 2, fillColor: '#1379A6', fillOpacity: 0.9 },
        }).addTo(map);
        regionLayerRef.current = layer;
        const b = layer.getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.2));

        const center = b.getCenter();
        const marker = L.circleMarker(center, { radius: 5, color: '#1f2937', fillColor: '#22c55e', fillOpacity: 0.9 }).addTo(map);
        marker.bindTooltip(`Регион ${regionCode}`, { permanent: false, direction: 'top' });
      });
  }, [regionCode]);

  return (
    <div id="region-map" style={{ height }} className="w-full rounded-2xl overflow-hidden border bg-white" />
  );
}
