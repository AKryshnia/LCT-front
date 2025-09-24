
import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type Region = { code:string, name:string, place?:number, score?:number }
export const RussiaMap: React.FC<{ data: Region[] }> = ({ data }) => {
  const center: [number, number] = [61.5240, 105.3188]
  const coords: Record<string,[number,number]> = { '77':[55.751244,37.618423], '78':[59.9375,30.3086], '50':[55.5,37.5], '66':[56.8389,60.6057] }
  return (
    <MapContainer center={center} zoom={3} style={{ height: 480, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {data.map((r)=>{
        const c = coords[r.code]; if(!c) return null
        const intensity = (r.score ?? 0) / 100
        const color = intensity > .66 ? '#16a34a' : intensity > .33 ? '#f59e0b' : '#6b7280'
        return (
          <CircleMarker key={r.code} center={c} radius={12 + (r.place ? (14 - r.place) : 0)} pathOptions={{ color, fillColor: color, fillOpacity: .6 }}>
            <Tooltip><div className="text-sm"><div className="font-semibold">{r.name}</div><div>Место: {r.place ?? '—'}</div><div>Баллы: {r.score ?? '—'}</div></div></Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
