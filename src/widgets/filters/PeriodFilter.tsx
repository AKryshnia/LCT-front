import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

type Mode = 'day'|'month'|'quarter'|'year'
export type Period = { mode: Mode; value: string }

const quarters = ['2025-Q1','2025-Q2','2025-Q3','2025-Q4']
const months = ['2025-06','2025-07','2025-08','2025-09']
const years = ['2024','2025','2026']

export default function PeriodFilter({ period, onChange }:{ period: Period; onChange: (p: Period)=>void }) {
  const options = period.mode==='quarter' ? quarters : period.mode==='month' ? months : period.mode==='year' ? years : []
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={period.mode} onValueChange={(v)=>onChange({ ...period, mode: v as Mode, value: v==='year'?'2025': v==='quarter'?'2025-Q3': v==='month'?'2025-07':'2025-09-23' })}>
        <TabsList>
          <TabsTrigger value="day">День</TabsTrigger>
          <TabsTrigger value="month">Месяц</TabsTrigger>
          <TabsTrigger value="quarter">Квартал</TabsTrigger>
          <TabsTrigger value="year">Год</TabsTrigger>
        </TabsList>
      </Tabs>
      {period.mode!=='day' && (
        <Select value={period.value} onValueChange={(v)=>onChange({ ...period, value: v })}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
