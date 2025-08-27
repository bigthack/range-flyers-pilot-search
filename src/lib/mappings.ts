import fs from "node:fs";
import path from "node:path";
let cache: Record<string, string[]> | null = null;

function loadMap(): Record<string, string[]> {
  if (cache) return cache;
  const p = path.resolve("data", "type_ratings_map.csv");
  const out: Record<string, string[]> = {};
  if (!fs.existsSync(p)) { cache = {}; return out; }
  const txt = fs.readFileSync(p, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [needle, codes] = line.split(",");
    if (!needle || !codes) continue;
    const arr = codes.split("|").map(s => s.trim()).filter(Boolean);
    out[needle.trim().toLowerCase()] = arr;
  }
  cache = out;
  return out;
}

export async function mapAircraftQueryToTypeCodes(q: string): Promise<string[]> {
  if (!q) return [];
  const m = loadMap();
  const key = q.trim().toLowerCase();
  if (m[key]) return m[key];
  if (/^c(itation)?\s*m2$/i.test(q)) return ["CE-525S","CE-525"];
  if (/^cj[1-4](\+)?$/i.test(q)) return ["CE-525","CE-525S"];
  if (/^c(itation)?\s*(v|bravo|ultra|encore)/i.test(q)) return ["CE-500"];
  if (/^[A-Z]{1,2}-?\d{3,4}[A-Z]?$/.test(q.toUpperCase())) {
    return [q.toUpperCase().replace(/([A-Z])(\d)/, "$1-$2")];
  }
  return [];
}
