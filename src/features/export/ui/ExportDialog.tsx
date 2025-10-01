// src/features/export/ui/ExportDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { exportPDF, exportPNG } from '@shared/lib/exporters'
import { Download } from 'lucide-react'
import * as React from 'react'

type Busy = null | 'png' | 'pdf' | 'json'

export default function ExportDialog({
  targetRef,
  scope='all',
  fileBase='report',
}:{
  targetRef: React.RefObject<HTMLElement>,
  scope?: string,
  fileBase?: string,
}) {
  const [busy, setBusy] = React.useState<Busy>(null)

  const onPNG = async () => {
    if (!targetRef.current) return
    try {
      setBusy('png')
      await exportPNG(targetRef.current, { fileName: `${fileBase}.png` })
    } catch (e) {
      console.error(e)
      alert('Не удалось экспортировать PNG')
    } finally { setBusy(null) }
  }

  const onPDF = async () => {
    if (!targetRef.current) return
    try {
      setBusy('pdf')
      await exportPDF(targetRef.current, { fileName: `${fileBase}.pdf` })
    } catch (e) {
      console.error(e)
      alert('Не удалось экспортировать PDF')
    } finally { setBusy(null) }
  }

  const onJSON = async () => {
    try {
      setBusy('json')
      const r = await fetch(`/api/export?format=json&scope=${scope}`)
      const j = await r.json()
      const blob = new Blob([JSON.stringify(j, null, 2)], { type:'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Не удалось выгрузить JSON')
    } finally { setBusy(null) }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="pill" size="xl">
          Экспортировать данные
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Выгрузка отчёта</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={onPNG} loading={busy==='png'} disabled={!targetRef.current}>PNG</Button>
          <Button onClick={onPDF} loading={busy==='pdf'} disabled={!targetRef.current}>PDF</Button>
          <Button variant="secondary" onClick={onJSON} loading={busy==='json'}>JSON</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
