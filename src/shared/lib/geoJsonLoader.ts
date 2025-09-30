export type FeatureCollection = {
    type: 'FeatureCollection';
    features: any[];
  };
  
  // Готовые данные
  const dataCache = new Map<string, FeatureCollection>();
  // Промисы «в полёте» — дедуплицируем параллельные запросы
  const inflight = new Map<string, Promise<FeatureCollection>>();
  
  export async function loadGeoJson(url: string): Promise<FeatureCollection> {
    // Уже загружено
    const cached = dataCache.get(url);
    if (cached) return cached;
  
    // Уже грузится — вернём тот же промис
    const running = inflight.get(url);
    if (running) return running;
  
    // Стартуем один общий промис и кладём его в inflight ДО await
    const job = (async () => {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error(`Unexpected content-type for ${url}: ${ct}`);
      }
      const json = await res.json() as FeatureCollection;
      dataCache.set(url, json);
      inflight.delete(url);
      return json;
    })().catch((err) => {
      inflight.delete(url);
      throw err;
    });
  
    inflight.set(url, job);
    return job;
  }
  
  export function clearGeoJsonCache(url?: string) {
    if (url) { dataCache.delete(url); inflight.delete(url); }
    else { dataCache.clear(); inflight.clear(); }
  }
  
  // Опционально — предзагрузка в начале приложения
  export const preloadGeoJson = (url: string) => loadGeoJson(url);
  