import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

// settings
const API = args.api || process.env.VITE_API_URL || 'http://ltc.kagafonov.beget.tech:8100';
const SRC = args.src || '';
const OUT = args.out || path.resolve(__dirname, '../public/regions-simplified.geojson');
const SIMPLIFY = args.simplify || '15%';
const PRECISION = Number(args.precision || 5);

// utils
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ensureDir = async (p) => fs.mkdir(path.dirname(p), { recursive: true });

const normalizeRu = (s = '') =>
  String(s)
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+обл(?:асть)?\b/g, ' ')
    .replace(/\bобласть\b/g, ' ')
    .replace(/\bкрай\b/g, ' ')
    .replace(/\bресп(?:ублика)?\b/g, ' ')
    .replace(/\bавтономн\w*\b/g, ' ')
    .replace(/\bокруг\b/g, ' ')
    .replace(/\b-?\s*кузбасс\b/g, ' ')
    .replace(/\b(?:город|г\.)\s+/g, ' ')
    .replace(/[^a-zа-я0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// --- backend regions
async function loadRegions() {
  const url = `${API.replace(/\/$/, '')}/api/region`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch regions: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.data || [];

  const byCode = new Map();         // '22' -> { code:'22', name:'Алтайский край', iso:'RU-ALT' }
  const byIso = new Map();          // 'RU-ALT' -> { ... }
  const byName = new Map();         // normalized RU -> { ... }

  for (const r of list) {
    const code = String(r.code || '').padStart(2, '0');
    const name = String(r.name || r.fullname || '').trim();
    const iso  = String(r['iso_3166-2'] || '').toUpperCase();

    if (code) byCode.set(code, { code, name, iso });
    if (iso)  byIso.set(iso,   { code, name, iso });

    const norm = normalizeRu(name);
    if (norm) byName.set(norm, { code, name, iso });
  }
  return { byCode, byIso, byName };
}

// --- load source geojson
async function loadSourceGeoJSON(src) {
  if (!src) throw new Error('Provide --src=/path/to/ADM1.geojson or URL');
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to download ${src}: ${res.status} ${res.statusText}`);
    return await res.json();
  } else {
    const txt = await fs.readFile(path.resolve(src), 'utf8');
    return JSON.parse(txt);
  }
}

// --- try to guess a name-like key for tooltips (fallback only)
function guessNameKey(props) {
  const keys = Object.keys(props || {});
  const candidates = [
    'NAME_RU','NAME','name','NAME_1','NAME_0','NL_NAME_1','NAME_RU_1','NAME_RU_CYR',
    'shapeName','region','NAME_LAT','NAME_RUS'
  ];
  for (const k of candidates) if (keys.includes(k)) return k;
  return keys.find(k => /name/i.test(k)) || keys[0];
}

// --- attach codes with multiple matching strategies
function attachCodes(geojson, maps) {
  if (geojson.type !== 'FeatureCollection') {
    throw new Error('Source must be a FeatureCollection');
  }
  let hit = 0, miss = 0;

  const features = (geojson.features || []).map((f) => {
    const p = f.properties || {};

    // 1) direct code (two digits)
    const srcCode = p.code != null ? String(p.code).padStart(2, '0') : '';
    let match = srcCode && maps.byCode.get(srcCode);

    // 2) ISO from source
    if (!match) {
      const iso = String(p.shapeISO || p.ISO || p.ISO_3166_2 || '').toUpperCase();
      if (iso) match = maps.byIso.get(iso);
    }

    // 3) name (ru)
    if (!match) {
      const nameKey = guessNameKey(p);
      const norm = normalizeRu(String(p[nameKey] ?? ''));
      if (norm) match = maps.byName.get(norm);
    }

    if (match) {
      hit++;
      return {
        type: 'Feature',
        id: match.code,
        properties: { code: match.code, name: match.name },
        geometry: f.geometry
      };
    } else {
      miss++;
      const nameKey = guessNameKey(p);
      const fallbackName = String(p[nameKey] ?? 'Регион').trim();
      return {
        type: 'Feature',
        id: fallbackName,
        properties: { name: fallbackName },
        geometry: f.geometry
      };
    }
  });

  return { out: { type: 'FeatureCollection', features }, stats: { hit, miss } };
}

// --- optional simplify
async function simplifyIfPossible(geojsonString, simplify, precision) {
  try {
    const ms = await import('mapshaper');
    const input = { 'src.json': geojsonString };
    const cmd = `-i src.json -simplify ${simplify} keep-shapes -clean -o format=geojson precision=${precision} out.json`;

    if (ms.applyCommands) {
      const out = await ms.applyCommands(cmd, input);
      const buf = out['out.json'] || Object.values(out)[0];
      return Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
    }
    if (ms.runCommands) {
      const out = await new Promise((resolve, reject) =>
        ms.runCommands(cmd, input, (err, res) => (err ? reject(err) : resolve(res)))
      );
      const buf = out['out.json'] || Object.values(out)[0];
      return Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
    }
    console.warn('mapshaper API not available, writing unsimplified GeoJSON');
    return geojsonString;
  } catch {
    console.warn('mapshaper not found, writing unsimplified GeoJSON');
    return geojsonString;
  }
}

async function main() {
  console.log('→ API:', API);
  console.log('→ SRC:', SRC);
  console.log('→ OUT:', OUT);

  const [maps, srcGeo] = await Promise.all([loadRegions(), loadSourceGeoJSON(SRC)]);
  const { out, stats } = attachCodes(srcGeo, maps);

  console.log(`→ Join results: matched=${stats.hit}, missing=${stats.miss}`);
  if (stats.miss > 0) {
    console.warn('! Some features were not matched. They will keep only "name" without "code".');
  }

  const raw = JSON.stringify(out);
  const simplified = await simplifyIfPossible(raw, SIMPLIFY, PRECISION);

  await ensureDir(OUT);
  await fs.writeFile(OUT, simplified, 'utf8');
  console.log(`✔ Saved ${OUT}`);
}

main().catch(async (e) => {
  console.error('✖', e?.message || e);
  await sleep(10);
  process.exit(1);
});
