import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const dir = path.resolve(".data", "faacsv");
  const files = ["PILOT_BASIC.csv", "PILOT_CERT.csv"].map(f=>path.join(dir, f));
  let latest = 0;
  for (const f of files) {
    try { const stat = fs.statSync(f); latest = Math.max(latest, stat.mtimeMs); } catch {}
  }
  return new Response(JSON.stringify({ lastModifiedMs: latest || null }), { headers: { "content-type": "application/json" } });
}
