import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { exportPDF, exportPNG } from '@shared/lib/exporters'

export default function ExportDialog({ targetRef, scope='all' }:{ targetRef: React.RefObject<HTMLElement>, scope?: string }){
  const onJson = async () => {
    const r = await fetch(`/api/export?format=json&scope=${scope}` )
    const j = await r.json()
    const blob = new Blob([JSON.stringify(j,null,2)], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'report.json'; a.click()
  }
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Экспорт</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Выгрузка отчёта</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Button onClick={()=>targetRef.current && exportPNG(targetRef.current as any)}>PNG</Button>
          <Button onClick={()=>targetRef.current && exportPDF(targetRef.current as any)}>PDF</Button>
          <Button variant="secondary" onClick={onJson}>JSON</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
