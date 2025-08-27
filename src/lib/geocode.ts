import { prisma } from "./db";
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN as string | undefined;
export type LatLng = { lat: number; lng: number };

async function fetchMapbox(query: string): Promise<LatLng | null> {
  if (!MAPBOX_TOKEN) return null;
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "place,region,postcode,locality");
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.features?.[0];
  if (!f?.center) return null;
  const [lng, lat] = f.center;
  return { lat, lng };
}
export async function geocodeCityState(city: string, state: string): Promise<LatLng | null> {
  const keyCity = (city || "").trim();
  const keyState = (state || "").trim().toUpperCase();
  if (!keyCity || !keyState) return null;
  const cached = await prisma.geoCache.findUnique({ where: { city_state: { city: keyCity, state: keyState } } }).catch(()=>null);
  if (cached) return { lat: cached.lat, lng: cached.lng };
  const result = await fetchMapbox(`${keyCity}, ${keyState}, USA`);
  if (!result) return null;
  await prisma.geoCache.create({ data: { city: keyCity, state: keyState, lat: result.lat, lng: result.lng } }).catch(()=>{});
  return result;
}
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.7613;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * R;
}
