import fs from "node:fs";
import path from "node:path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const p = path.resolve("data", "type_ratings_map.csv");
  const out: { label: string; codes: string[] }[] = [];

  if (fs.existsSync(p)) {
    const txt = fs.readFileSync(p, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("#")) continue;
      const [needle, codes] = line.split(",");
      if (!needle || !codes) continue;
      if (!q || needle.toLowerCase().includes(q)) {
        out.push({ label: needle.trim(), codes: codes.split("|").map(s=>s.trim()).filter(Boolean) });
      }
    }
  }
  const core = ["CE-500","CE-525","CE-525S","EMB-505","HA-420","LR-60","G-1159","G-V","B-737","A-320"];
  for (const x of core) {
    if (!q || x.toLowerCase().includes(q)) out.push({ label: x, codes: [x] });
  }
  const dedup = new Map(out.map(o => [o.label.toLowerCase(), o]));
  const list = Array.from(dedup.values()).slice(0, 20);
  return new Response(JSON.stringify({ suggestions: list }), { headers: { "content-type": "application/json" } });
}
