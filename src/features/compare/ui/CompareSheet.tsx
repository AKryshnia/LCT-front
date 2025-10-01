import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

type Region = { code:string; name:string; flights?:number; duration_h?:number; score?:number }

export default function CompareSheet({ all, trigger }:{ all: Region[]; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [picked, setPicked] = React.useState<string[]>([])
  const toggle = (c:string) => setPicked(p => p.includes(c) ? p.filter(x=>x!==c) : (p.length<3 ? [...p, c] : p))
  const selected = all.filter(r => picked.includes(r.code))

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger ?? <Button variant="secondary">Сравнить регионы</Button>}</SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[540px]">
        <SheetHeader><SheetTitle>Сравнение регионов (до 3)</SheetTitle></SheetHeader>
        <div className="mt-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
          {all.map(r=> (
            <label key={r.code} className="flex items-center gap-2">
              <Checkbox checked={picked.includes(r.code)} onCheckedChange={()=>toggle(r.code)} />
              <span className="flex-1">{r.name ?? r.code}</span>
              <span className="text-xs text-slate-500">{(r.flights ?? 0).toLocaleString('ru-RU')} полётов</span>
            </label>
          ))}
        </div>
        {selected.length>0 && (
          <div className="mt-4 rounded-xl border p-3 bg-slate-50">
            <div className="font-medium mb-2">Итоги</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {selected.map(r=> (
                <div key={r.code} className="rounded-lg bg-white border p-2">
                  <div className="font-medium">{r.name ?? r.code}</div>
                  <div className="text-slate-500">Полётов: {r.flights ?? '—'}</div>
                  <div className="text-slate-500">Длит, ч: {r.duration_h ?? '—'}</div>
                  <div className="text-slate-500">Баллы: {r.score ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
