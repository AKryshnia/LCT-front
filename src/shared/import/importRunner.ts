// src/shared/import/importRunner.ts
import { lctApi, CreateFlightDto } from '@/shared/api/lctApi';
import type { AppDispatch } from '@/app/store'; // поправь импорт под свой стор

export type ImportProgress = {
  total: number;
  done: number;
  failed: number;
  batchDone: number;
};

export type RunImportOptions = {
  batchSize?: number;      // по умолчанию 50
  concurrency?: number;    // по умолчанию 3
  onProgress?: (p: ImportProgress) => void;
  signal?: AbortSignal;    // для отмены
  // простейший бэкофф: 500, 1000, 2000 ...
  retryDelaysMs?: number[];
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function postOne(dispatch: AppDispatch, dto: CreateFlightDto, retryDelays: number[], signal?: AbortSignal) {
  let lastErr: any;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const thunk = lctApi.endpoints.addFlight.initiate(dto);
      const res = await dispatch(thunk).unwrap();
      return res;
    } catch (e: any) {
      lastErr = e;
      const code = e?.status ?? e?.originalStatus;
      // ретраим только 429/5xx
      if (code !== 429 && !(code >= 500)) break;
      const delay = retryDelays[attempt] ?? 0;
      if (delay > 0) await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Импортирует массив рейсов, отправляя одиночные POST /api/flight.
 * Бьёт на чанки и ограничивает параллельность.
 */
export async function runFlightImport(
  dispatch: AppDispatch,
  items: CreateFlightDto[],
  opts: RunImportOptions = {}
) {
  const batchSize = opts.batchSize ?? 50;
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const retryDelays = opts.retryDelaysMs ?? [500, 1000, 2000];
  const total = items.length;

  let done = 0;
  let failed = 0;
  const onProgress = opts.onProgress ?? (() => {});

  // чанки
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    let batchDone = 0;

    // пул из concurrency "воркеров"
    let cursor = 0;
    const worker = async () => {
      while (cursor < chunk.length) {
        const idx = cursor++;
        const dto = chunk[idx];
        try {
          await postOne(dispatch, dto, retryDelays, opts.signal);
          done += 1;
          batchDone += 1;
        } catch {
          failed += 1;
        } finally {
          onProgress({ total, done, failed, batchDone });
          if (opts.signal?.aborted) return;
        }
      }
    };

    const pool = Array.from({ length: concurrency }, () => worker());
    await Promise.all(pool);

    if (opts.signal?.aborted) break;
  }

  return { total, done, failed };
}
