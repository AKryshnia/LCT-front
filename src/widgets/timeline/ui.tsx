import React from 'react'
import { Button } from '@/components/ui/button'

export const YearTimeline: React.FC<{ year: number; onChange: (y:number)=>void; from?:number; to?:number }> = ({ year, onChange, from=2025, to=2030 }) => {
  const years = Array.from({length: to-from+1}, (_,i)=>from+i)
  return <div className="flex items-center gap-2">{years.map(y=>(
    <Button
      key={y}
      variant={y===year ? 'default' : 'outline'}
      size="sm"
      className={y===year ? 'rounded-full bg-brand-500 hover:bg-brand-700 border-brand-500' : 'rounded-full'}
      onClick={()=>onChange(y)}
    >
      {y}
    </Button>
  ))}</div>
}
