import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { RoleGuard } from '@features/auth/ui'

export default function RatingBuilder(){
  const [w, setW] = React.useState({ flights: 50, duration: 50, growth: 0 })
  const total = Math.max(1, w.flights + w.duration + w.growth)
  const norm = { flights: Math.round(w.flights/total*100), duration: Math.round(w.duration/total*100), growth: Math.round(w.growth/total*100) }
  const save = () => { localStorage.setItem('rating_preset_default', JSON.stringify(norm)); alert('Сохранено: '+JSON.stringify(norm)) }
  return (
    <RoleGuard allow={['admin']}>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Конструктор рейтингов (MVP)</h1>
        <Card><CardContent className="p-4 space-y-4">
          {(['flights','duration','growth'] as const).map(k=> (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1"><span>{k==='flights'?'Полётов':k==='duration'?'Длительность':'Рост'}</span><span className="tabular-nums">{w[k]}%</span></div>
              <Slider value={[w[k]]} onValueChange={(v)=>setW(prev=>({ ...prev, [k]: v[0] }))} max={100} step={1} />
            </div>
          ))}
          <div className="text-sm text-slate-500">Нормированные веса: полётов {norm.flights}%, длительность {norm.duration}%, рост {norm.growth}%</div>
          <Button onClick={save}>Сохранить пресет</Button>
        </CardContent></Card>
      </div>
    </RoleGuard>
  )
}
