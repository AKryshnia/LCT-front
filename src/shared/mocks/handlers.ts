// src/shared/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw'

/** ───────── helpers ───────── **/

// дет-рандом по ключу (FNV-1a → [min,max])
function seeded(min: number, max: number, key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = ((h >>> 0) % 10000) / 10000 // [0,1)
  return Math.round(min + u * (max - min))
}

const pad2 = (n: number | string) => String(n).padStart(2, '0')

// fallback-коды (если не удастся вычитать из GeoJSON)
const fallbackCodes = Array.from({ length: 85 }, (_, i) => pad2(i + 1))

let codesCache: string[] | undefined
async function ensureCodes(): Promise<string[]> {
  if (codesCache?.length) return codesCache
  try {
    const geo = await fetch('/regions-simplified.geojson').then((r) => r.json())
    const codes: string[] = (geo.features ?? [])
      .map((f: any) => String(f.properties?.code ?? '').padStart(2, '0'))
      .filter(Boolean)

    if (codes.length > 0) {
      codesCache = codes
      return codesCache
    }
  } catch {
    /* игнор: упадём на fallback */
  }
  codesCache = fallbackCodes
  return codesCache
}

function regionNameByCode(code: string) {
  // можно сделать маппинг реальных названий; для моков хватит «Регион 77»
  // исключения для известной пары, просто чтобы приятно выглядело в демо:
  if (code === '77') return 'Москва'
  if (code === '78') return 'Санкт-Петербург'
  return `Регион ${code}`
}

type RegionRow = {
  code: string
  name: string
  population: number
  area_km2: number
  flights: number
  duration_h: number
  score: number
  place: number
}

function makeRegionList(codes: string[], period: string): RegionRow[] {
  // генерим одни и те же значения для одинакового периода
  const raw = codes.map((code) => {
    const name = regionNameByCode(code)
    const score = seeded(20, 99, `score:${period}:${code}`)
    const flights = seeded(800, 4200, `flights:${period}:${code}`)
    const duration_h = seeded(120, 1200, `dur:${period}:${code}`)
    const population = seeded(50_000, 12_600_000, `pop:${code}`)
    const area_km2 = seeded(1000, 700_000, `area:${code}`)
    return { code, name, score, flights, duration_h, population, area_km2 }
  })

  // ранжируем по score
  const ranked = [...raw].sort((a, b) => b.score - a.score)
  const placeByCode = new Map(ranked.map((r, i) => [r.code, i + 1]))

  return raw.map((r) => ({ ...r, place: placeByCode.get(r.code)! }))
}

/** ───────── stats endpoints ───────── **/

// Основной дэшборд: список регионов + тоталы
export const statsHandlers = [
  // Совместимый эндпоинт для раскраски карты, который ожидает твой фронт:
  // /api/choropleth → [{ code, value }]
  http.get('/api/choropleth', async ({ request }) => {
    const url = new URL(request.url)
    const metric = url.searchParams.get('metric') || 'count'
    const period = url.searchParams.get('period') || '2025'
    const codes = await ensureCodes()
    const data = codes.map((code) => ({
      code,
      value: seeded(5, 95, `${metric}:${period}:${code}`),
    }))
    // Можно замедлить для имитации загрузки
    await delay(120)
    return HttpResponse.json(data)
  }),

  // На всякий случай оставим альтернативный путь, если где-то ещё использовался
  http.get('/api/stats/choropleth', async ({ request }) => {
    const url = new URL(request.url)
    const metric = url.searchParams.get('metric') || 'count'
    const period = url.searchParams.get('period') || '2025'
    const codes = await ensureCodes()
    const data = codes.map((code) => ({
      code,
      value: seeded(5, 95, `${metric}:${period}:${code}`),
    }))
    await delay(120)
    return HttpResponse.json({ data, metric, period })
  }),

  // KPI-блок
  http.get('/api/stats/kpi', async () => {
    await delay(150)
    return HttpResponse.json({
      data: {
        total_flights: seeded(12_000, 42_000, 'kpi:total'),
        avg_duration_min: seeded(7, 18, 'kpi:avg'),
        growth_ratio_pct: +((seeded(0, 120, 'kpi:growth') / 10).toFixed(1)),
        daily_avg: seeded(400, 1600, 'kpi:daily'),
      },
    })
  }),

  // Таймсерии на график (30 точек)
  http.get('/api/stats/timeseries', async ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || '2025-07'
    const days = 30
    const data = Array.from({ length: days }, (_, i) => ({
      date: `${period}-${String(i + 1).padStart(2, '0')}`,
      value: seeded(500, 2000, `ts:${period}:${i}`),
    }))
    await delay(120)
    return HttpResponse.json({ data })
  }),

  // Позиция в рейтинге (для виджета)
  http.get('/api/stats/rank', async () => {
    await delay(80)
    return HttpResponse.json({ data: { rank: seeded(1, 85, 'rank:curr'), delta: seeded(-5, 5, 'rank:delta') } })
  }),

  // Инсайт
  http.get('/api/insights', async () => {
    await delay(60)
    return HttpResponse.json({
      data: {
        title: 'Регион N вошёл в топ-3 по росту активности',
        subtitle: 'Средняя длительность полётов выросла на 25%',
      },
    })
  }),

  // Рейтинг совместимый с lctApi.getRating (ожидает /api/stats/rating -> { data: [{code,name,value,rank}] })
  http.get('/api/stats/rating', async ({ request }) => {
    const url = new URL(request.url)
    const metric = (url.searchParams.get('metric') || 'count')
    const period = url.searchParams.get('period') || '2025'
    const limit = Number(url.searchParams.get('limit') || 3)

    const metricKey = metric === 'count' ? 'flights' : metric === 'duration' ? 'duration_h' : 'score'

    const codes = await ensureCodes()
    const all = makeRegionList(codes, period)
    const top = [...all]
      .sort((a: any, b: any) => (b[metricKey] as number) - (a[metricKey] as number))
      .slice(0, limit)

    const data = top.map((r, i) => ({ code: r.code, name: r.name, value: (r as any)[metricKey], rank: i + 1 }))
    await delay(100)
    return HttpResponse.json({ data })
  }),
]

/** ───────── admin / uploads / export ───────── **/

let uploads: any[] = [
  { id: 'u-1', filename: 'batch-1.zip', status: 'done', rows: 4200, createdAt: new Date().toISOString() },
]

export const auxHandlers = [
  http.get('/api/admin/users', async () =>
    HttpResponse.json([{ id: 1, name: 'Demo SuperAdmin', roles: ['superadmin', 'admin', 'analyst', 'operator'] }]),
  ),

  http.get('/api/uploads', async () => {
    await delay(80)
    return HttpResponse.json(uploads)
  }),

  http.post('/api/uploads', async ({ request }) => {
    const form = await request.formData()
    const f = form.get('file') as any // File в браузере; для TS-хелза ставим any
    const rec = {
      id: `u-${Date.now()}`,
      filename: f?.name ?? 'batch.zip',
      status: 'processing',
      rows: 0,
      createdAt: new Date().toISOString(),
    }
    uploads = [rec, ...uploads]
    await delay(200)
    return HttpResponse.json(rec, { status: 201 })
  }),

  http.get('/api/export', async ({ request }) => {
    const url = new URL(request.url)
    const scope = url.searchParams.get('scope') || 'all'
    const period = '2025'
    const codes = await ensureCodes()
    const items = makeRegionList(codes, period).slice(0, 10)
    await delay(100)
    return HttpResponse.json({ ok: true, scope, generatedAt: new Date().toISOString(), items })
  }),

  // Профиль региона для карточки (убираем хардкод из компонентов)
  http.get('/api/region/profile', async ({ request }) => {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '77').padStart(2, '0')
    const s = (k: string, min: number, max: number) => seeded(min, max, `${k}:${code}`)
    const spec = ['Сельское хозяйство', 'Логистика', 'Инспекции объектов', 'Геомониторинг'][s('spec', 0, 3)]
    const resp = ['Иван Иванов', 'Олег Иванов', 'Мария Петрова', 'Сергей Кузнецов'][s('resp', 0, 3)]
    const profile = {
      code,
      responsible: resp,
      avatar: '/avatar.png',
      has_development_program: !!s('prog', 0, 1),
      specialization: spec,
      has_test_site: !!s('test', 0, 1),
      has_epr: !!s('epr', 0, 1),
      has_bek: !!s('bek', 0, 1),
    }
    await delay(60)
    return HttpResponse.json({ data: profile })
  }),
]

/** ───────── core endpoints ───────── **/

// Универсальный список/профиль региона + тоталы — под твой `useStats`
export const coreHandlers = [
  http.get('/api/stats', async ({ request }) => {
    const url = new URL(request.url)
    const region = url.searchParams.get('region') // ?region=77
    const period = url.searchParams.get('period') || '2025'
    const codes = await ensureCodes()
    const all = makeRegionList(codes, period)
    const items = region ? all.filter((d) => d.code === region) : all
    const totals = {
      flights: items.reduce((s, x) => s + x.flights, 0),
      duration_h: items.reduce((s, x) => s + x.duration_h, 0),
    }
    await delay(140)
    return HttpResponse.json({ period, items, totals })
  }),

  // Топ по метрике
  http.get('/api/rating', async ({ request }) => {
    const url = new URL(request.url)
    const metric = (url.searchParams.get('metric') || 'score') as 'score' | 'flights' | 'duration_h'
    const period = url.searchParams.get('period') || '2025'
    const limit = Number(url.searchParams.get('limit') || 10)

    const codes = await ensureCodes()
    const all = makeRegionList(codes, period)
    const top = [...all].sort((a, b) => (b[metric] as number) - (a[metric] as number)).slice(0, limit)

    await delay(120)
    return HttpResponse.json({ period, metric, top })
  }),
]

/** ───────── bundle ───────── **/
export const handlers = [
  ...statsHandlers,
  ...coreHandlers,
  ...auxHandlers,
]
