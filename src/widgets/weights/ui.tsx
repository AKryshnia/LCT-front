import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const WeightsPanel: React.FC<{ onApply?: (w:{flights:number;duration_h:number})=>void }> = ({ onApply }) => {
  const [flights,setFlights] = React.useState(.5)
  const [duration,setDuration] = React.useState(.5)
  const sum = flights + duration
  const pct = (x:number)=>Math.round(x/sum*100)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Весовые коэффициенты KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">Полетов
            <input type="range" min={0} max={1} step={0.05} value={flights} onChange={(e)=>setFlights(parseFloat(e.target.value))}/>
            <span className="w-10 text-right">{pct(flights)}%</span>
          </label>
          <label className="flex items-center gap-2">Длительность
            <input type="range" min={0} max={1} step={0.05} value={duration} onChange={(e)=>setDuration(parseFloat(e.target.value))}/>
            <span className="w-10 text-right">{pct(duration)}%</span>
          </label>
          <Button className="ml-auto" onClick={()=>onApply?.({ flights:pct(flights), duration_h:pct(duration) })}>Применить</Button>
        </div>
      </CardContent>
    </Card>
  )
}
