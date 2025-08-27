import { NextRequest } from "next/server";
import { prisma } from "../../../lib/db";
import { mapAircraftQueryToTypeCodes } from "../../../lib/mappings";
import { geocodeCityState, haversineMiles } from "../../../lib/geocode";

function levelRank(c: string): number {
  const order = ["S","T","V","P","C","A"];
  const idx = order.indexOf(c);
  return idx === -1 ? -1 : idx;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const aircraft = (searchParams.get("aircraft") || "").trim();
  const state = (searchParams.get("state") || "").trim().toUpperCase();
  const city = (searchParams.get("city") || "").trim();
  const radiusMi = Number(searchParams.get("radiusMi") || "0");
  const minLevel = (searchParams.get("minLevel") || "C").trim().toUpperCase();
  const requireInst = (searchParams.get("instrument") || "true") === "true";
  const requireMulti = (searchParams.get("multi") || "true") === "true";

  const wantedTypeCodes = await mapAircraftQueryToTypeCodes(aircraft);

  const where: any = {};
  if (state) where.state = state;
  if (requireInst) where.hasInstrument = true;
  if (requireMulti) where.hasMultiEngine = true;

  const pilots = await prisma.airman.findMany({
    where,
    select: {
      id: true, firstName: true, lastName: true, city: true, state: true,
      certificateLevels: true, ratings: { select: { code: true } }, typeRatings: { select: { typeCode: true } }
    },
    take: 200
  });

  const filtered = pilots.filter(p => {
    const maxLevel = p.certificateLevels.reduce((mx, c) => Math.max(mx, levelRank(c)), -1);
    if (maxLevel < levelRank(minLevel)) return false;
    if (wantedTypeCodes.length) {
      const pilotCodes = new Set(p.typeRatings.map(t => t.typeCode));
      const ok = wantedTypeCodes.some(c => pilotCodes.has(c));
      if (!ok) return false;
    }
    return true;
  });

  let geoResults = filtered;
  if (city && state && radiusMi > 0) {
    const center = await geocodeCityState(city, state);
    if (center) {
      const withGeo = await Promise.all(geoResults.map(async (p) => {
        if (!p.city || !p.state) return { p, dist: Infinity };
        const pos = await geocodeCityState(p.city, p.state);
        if (!pos) return { p, dist: Infinity };
        return { p, dist: haversineMiles(center, pos) };
      }));
      geoResults = withGeo.filter(x => x.dist <= radiusMi).map(x => x.p);
    }
  }

  const results = geoResults.map(p => ({
    firstName: p.firstName, lastName: p.lastName, city: p.city, state: p.state,
    certificateLevels: p.certificateLevels,
    ratings: p.ratings.map(r => r.code),
    typeRatings: p.typeRatings.map(t => t.typeCode)
  }));

  return new Response(JSON.stringify({ results }), { headers: { "content-type": "application/json" } });
}
