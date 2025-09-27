import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEO_IN  = path.resolve(__dirname, "../public/regions-simplified.geojson");
const GEO_OUT = path.resolve(__dirname, "../public/regions-simplified.patched.geojson");
const API_URL = process.env.API_URL || "http://ltc.kagafonov.beget.tech:8100";

const MANUAL = {
  // добавляй сюда соответствия, если увидишь "missing" в логе:
  // "RU-MOW": "77",
  // "RU-SPE": "78",
  // "RU-CRI": "82",
  // "RU-SEV": "92",
};

function pad2(x) { return String(x).padStart(2, "0"); }

function pickIso(props) {
  return (
    props?.["iso_3166-2"] ||
    props?.["ISO3166-2"] ||
    props?.["ISO3166_2"] ||
    props?.iso ||
    props?.ISO ||
    null
  );
}

function pickName(props) {
  return props?.name || props?.NAME_1 || props?.NAME || props?.NAME_RU || null;
}

async function main() {
  const geo = JSON.parse(await fs.readFile(GEO_IN, "utf8"));

  const r = await fetch(`${API_URL}/api/region`);
  if (!r.ok) throw new Error(`Region API ${r.status}`);
  const j = await r.json();
  const rows = Array.isArray(j) ? j : (j.data ?? []);
  if (!Array.isArray(rows)) throw new Error("Bad /api/region response");

  const isoToCode = new Map();
  const nameToCode = new Map();

  for (const r of rows) {
    const iso = r["iso_3166-2"];
    const code = r.code != null ? pad2(r.code) : null;
    if (iso && code) isoToCode.set(iso, code);

    // возможные ключи имени с API:
    if (r.name && code) nameToCode.set(String(r.name).trim(), code);
    if (r.fullname && code) nameToCode.set(String(r.fullname).trim(), code);
    if (r.name_en && code) nameToCode.set(String(r.name_en).trim(), code);
  }

  let missing = 0;
  for (const f of geo.features) {
    const p = f.properties ?? {};
    let code = p.code ? pad2(p.code) : null;

    // 1) по ISO
    const iso = pickIso(p);
    if (!code && iso) code = isoToCode.get(iso) || MANUAL[iso] || null;

    // 2) по имени (жёсткое совпадение нескольких вариантов)
    if (!code) {
      const name = pickName(p);
      if (name) {
        const n = String(name).trim();
        code =
          nameToCode.get(n) ||
          // иногда в GeoJSON могут быть «Республика Адыгея» vs «Адыгея»
          nameToCode.get(n.replace(/^Республика\s+/i, "")) ||
          null;
      }
    }

    if (!code) {
      missing++;
      console.warn("missing:", { iso, name: pickName(p) ?? null });
    }

    f.properties = { ...p, code: code || null };
  }

  await fs.writeFile(GEO_OUT, JSON.stringify(geo));
  console.log("Saved:", GEO_OUT, "missing:", missing);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
