import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RoleGuard } from '@features/auth/ui'

export default function UploadsPage(){
  const [list, setList] = React.useState<any[]>([])
  const [busy, setBusy] = React.useState(false)
  const reload = ()=> fetch('/api/uploads').then(r=>r.json()).then(setList)
  React.useEffect(()=>{ reload() }, [])
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    const fd = new FormData(); fd.append('file', file)
    setBusy(true); await fetch('/api/uploads', { method:'POST', body: fd }); setBusy(false); reload()
  }
  return (
    <RoleGuard allow={['operator','admin']}>
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Журнал загрузок</h1>
          <Button asChild variant="outline"><label className="cursor-pointer">Загрузить<input type="file" className="hidden" onChange={onUpload} disabled={busy} /></label></Button>
        </div>
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="p-2 text-left">Файл</th><th className="text-left">Статус</th><th className="text-left">Строк</th><th className="text-left">Время</th></tr></thead>
            <tbody>
              {list.map(r=> (
                <tr key={r.id} className="border-t"><td className="p-2">{r.filename}</td><td>{r.status}</td><td className="tabular-nums">{r.rows}</td><td>{new Date(r.createdAt).toLocaleString('ru-RU')}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      </div>
    </RoleGuard>
  )
}
