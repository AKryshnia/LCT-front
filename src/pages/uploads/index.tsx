// src/pages/uploads/index.tsx
import * as React from 'react'
import { useDispatch } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RoleGuard } from '@features/auth/ui'
import { runFlightImport } from '@/shared/import/importRunner'
import type { CreateFlightDto } from '@/shared/api/lctApi'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

type UploadRow = { id: number|string; filename: string; status: string; rows: number; createdAt: string }

// ===== helpers =====
const LS_KEY = 'lct_uploads_history'
const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

const saveLocal = (rows: UploadRow[]) => localStorage.setItem(LS_KEY, JSON.stringify(rows))
const loadLocal = (): UploadRow[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

const toHHMM = (v: any): string => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const h = Math.floor(v/60), m = Math.round(v%60)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }
  const s = String(v ?? '').trim()
  if (/^\d+$/.test(s)) {
    const n = parseInt(s,10); const h = Math.floor(n/60), m = n%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0,5)
  return '00:00'
}
const toHHMMSS = (v: any): string => {
  const s = String(v ?? '').trim()
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s
  if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`
  if (/^\d+$/.test(s)) {
    const n = parseInt(s,10); const h = Math.floor(n/60), m = n%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
  }
  return '00:00:00'
}
const normDate = (v: any): string => {
  const s = String(v ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [dd,mm,yy] = s.split('.'); return `${yy}-${mm}-${dd}`
  }
  const d = new Date(s); if (!isNaN(+d)) return d.toISOString().slice(0,10)
  return ''
}
const mapToDto = (x: any): CreateFlightDto => ({
  sid: String(x.sid ?? x.SID ?? x.flight_id ?? ''),
  reg: String(x.reg ?? x.REG ?? x.board ?? ''),
  dep: String(x.dep ?? x.DEP ?? x.departure ?? ''),
  dest: String(x.dest ?? x.DEST ?? x.destination ?? ''),
  eet: toHHMM(x.eet ?? x.EET ?? x.duration),
  dof: normDate(x.dof ?? x.date ?? x.DOF),
  dep_time: toHHMMSS(x.dep_time ?? x.depTime ?? x.departure_time),
  arr_time: toHHMMSS(x.arr_time ?? x.arrTime ?? x.arrival_time),
  region_id: Number(x.region_id ?? x.regionId ?? x.region ?? 0),
  zona: x.zona ?? x.zone,
  typ: x.typ ?? x.type,
})

// ---- XLSX helpers ----
async function parseXlsxFile(file: File): Promise<any[]> {
  const XLSX = await import('xlsx')
  const ab = await file.arrayBuffer()
  const wb = XLSX.read(ab, { type: 'array' })
  // Берём первый лист
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  // defval, чтобы пустые ячейки не терялись
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return rows
}

// ---- CSV helper ----
async function parseCsvText(text: string): Promise<any[]> {
  const Papa = await import('papaparse')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  return (parsed.data as any[]) || []
}

// ---- XML helpers ----
function flattenObject(obj: any, prefix = '', out: any = {}): any {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}_${k}` : k
      flattenObject(v as any, key, out)
    }
  } else {
    out[prefix] = obj
  }
  return out
}
function findArrayOfObjectsDeep(obj: any): any[] | null {
  // ищем «самый длинный» массив объектов в структуре
  let best: any[] | null = null
  const visit = (node: any) => {
    if (!node) return
    if (Array.isArray(node) && node.length && typeof node[0] === 'object') {
      if (!best || node.length > best.length) best = node
    } else if (typeof node === 'object') {
      for (const v of Object.values(node)) visit(v)
    }
  }
  visit(obj)
  return best
}
async function parseXmlFile(file: File): Promise<any[]> {
  const { XMLParser } = await import('fast-xml-parser')
  const text = await file.text()
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    parseTagValue: true
  })
  const data = parser.parse(text)
  const rows = findArrayOfObjectsDeep(data) || []
  // выравниваем вложенность: a.b.c -> a_b_c
  return rows.map(r => flattenObject(r))
}

// ===== component =====
export default function UploadsPage(){
  const dispatch = useDispatch()
  const [list, setList] = React.useState<UploadRow[]>([])
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState({ total: 0, done: 0, failed: 0, batchDone: 0 })
  const abortRef = React.useRef<AbortController|null>(null)
  const [serverMode, setServerMode] = React.useState<boolean|null>(null) // null=unknown, true=server uploads, false=local import

  // Try to use server /api/uploads (MSW or real). On 404 → local mode
  const reload = async ()=>{
    if (isDemo || serverMode === true) {
      try {
        const r = await fetch('/api/uploads', { credentials:'include', headers:{ Accept:'application/json' } })
        if (!r.ok) throw new Error(String(r.status))
        const b = await r.json()
        const arr = Array.isArray(b) ? b : (b?.data ?? [])
        const rows: UploadRow[] = arr.map((it:any)=>({
          id: it.id ?? crypto.randomUUID(),
          filename: it.filename ?? it.name ?? 'file',
          status: it.status ?? 'processing',
          rows: Number(it.rows ?? it.row_count ?? 0),
          createdAt: String(it.createdAt ?? it.created_at ?? new Date().toISOString()),
        }))
        setList(rows); setServerMode(true); return
      } catch {
        if (serverMode === null && !isDemo) {
          setServerMode(false)
        }
      }
    }
    // local mode
    const local = loadLocal()
    setList(local)
    setServerMode(false)
  }

  React.useEffect(()=>{ reload() }, []) // initial

  const runImport = async (file: File, items: CreateFlightDto[]) => {
    setBusy(true)
    setProgress({ total: items.length, done: 0, failed: 0, batchDone: 0 })
    abortRef.current = new AbortController()
    try {
      const res = await runFlightImport(dispatch as any, items, {
        batchSize: Number(import.meta.env.VITE_IMPORT_BATCH_SIZE ?? 50),
        concurrency: Number(import.meta.env.VITE_IMPORT_CONCURRENCY ?? 3),
        onProgress: setProgress,
        signal: abortRef.current.signal,
        retryDelaysMs: [500, 1000, 2000],
      })
      const row: UploadRow = {
        id: Date.now(),
        filename: file.name,
        status: res.failed > 0 ? 'partial' : 'done',
        rows: res.done,
        createdAt: new Date().toISOString(),
      }
      const next = [row, ...loadLocal()].slice(0, 100)
      saveLocal(next); setList(next)
    } catch (err:any) {
      console.error(err)
      const row: UploadRow = {
        id: Date.now(),
        filename: file.name,
        status: 'failed',
        rows: progress.done,
        createdAt: new Date().toISOString(),
      }
      const next = [row, ...loadLocal()].slice(0, 100)
      saveLocal(next); setList(next)
    } finally {
      setBusy(false)
    }
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    // ---- Server mode (MSW or real uploads endpoint) ----
    if (isDemo || serverMode === true) {
      const fd = new FormData(); fd.append('file', file)
      setBusy(true)
      try {
        await fetch('/api/uploads', { method:'POST', body: fd, credentials:'include', headers:{ Accept:'application/json' } })
      } finally {
        setBusy(false); reload()
      }
      return
    }

    // ---- Local import → POST /api/flight per row ----
    const name = file.name.toLowerCase()
    let rawRows: any[] = []
    try {
      if (name.endsWith('.json')) {
        const txt = await file.text()
        const raw = JSON.parse(txt)
        rawRows = Array.isArray(raw) ? raw : [raw]
      } else if (name.endsWith('.csv')) {
        rawRows = await parseCsvText(await file.text())
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        rawRows = await parseXlsxFile(file)
      } else if (name.endsWith('.xml')) {
        rawRows = await parseXmlFile(file)
      } else {
        alert('В Live-режиме поддержаны JSON, CSV, XLSX/XLS и XML. Выберите файл подходящего формата.')
        return
      }
    } catch (err) {
      console.error(err)
      alert('Не удалось разобрать файл. Проверь формат и заголовки столбцов.')
      return
    }

    // Маппинг в CreateFlightDto + базовая валидация
    const items: CreateFlightDto[] = rawRows
      .map(mapToDto)
      .filter(d => d.sid && d.dep && d.dest && d.dof && d.region_id)

    if (!items.length) {
      alert('Файл разобран, но валидных строк не найдено. Проверь обязательные поля: sid, dep, dest, dof, region_id.')
      return
    }

    await runImport(file, items)
  }

  return (
    <RoleGuard allow={['operator','admin']}>
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Журнал загрузок</h1>
          <Button asChild variant="outline" title={serverMode === false
            ? 'Live-импорт: JSON, CSV, XLSX/XLS, XML'
            : 'Загрузка в журнал /api/uploads'}>
            <label className="cursor-pointer">Загрузить
              <input
                type="file"
                className="hidden"
                accept={serverMode === false ? '.json,.csv,.xlsx,.xls,.xml' : undefined}
                onChange={onUpload}
                disabled={busy}
              />
            </label>
          </Button>
          {serverMode === false && (
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Справка о режиме загрузок">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-[360px]">
                {serverMode === false ? (
                  <div className="space-y-1">
                    <div className="font-medium">Live-импорт</div>
                    <div className="text-xs text-muted-foreground">
                      Файл парсится в браузере, строки отправляются на <code>POST /api/flight</code>.
                      Поддержаны: JSON, CSV, XLSX/XLS, XML.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="font-medium">Серверный режим</div>
                    <div className="text-xs text-muted-foreground">
                      Используются эндпоинты <code>/api/uploads</code> (обычно моки MSW в дев-режиме).
                    </div>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          )}
        </div>

        {busy && serverMode === false && (
          <div className="text-sm text-muted-foreground">
            Импорт: {progress.done}/{progress.total} • Ошибок: {progress.failed}
            <div className="h-2 bg-gray-200 rounded mt-1">
              <div
                className="h-2 rounded bg-blue-500"
                style={{ width: progress.total ? `${(progress.done/progress.total)*100}%` : 0 }}
              />
            </div>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => abortRef.current?.abort()}
            >
              Отменить импорт
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">Файл</th>
                  <th className="text-left">Статус</th>
                  <th className="text-left">Строк</th>
                  <th className="text-left">Время</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r=> (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.filename}</td>
                    <td>{r.status}</td>
                    <td className="tabular-nums">{r.rows}</td>
                    <td>{new Date(r.createdAt).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
                {!list.length && (
                  <tr className="border-t">
                    <td className="p-2" colSpan={4}>
                      {serverMode === false
                        ? 'Нет локальных импортов. Загрузите JSON, CSV, XLSX/XLS или XML.'
                        : 'Журнал пуст.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
