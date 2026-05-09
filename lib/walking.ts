// Office anchor — coordinates loaded from env so the public repo doesn't
// pin them. Same value used by the Python ingestion scripts.
function readOfficeCoord(name: "OFFICE_LAT" | "OFFICE_LNG"): number {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} env var is required`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got: ${raw}`);
  return n;
}
export const OFFICE_LAT = readOfficeCoord("OFFICE_LAT");
export const OFFICE_LNG = readOfficeCoord("OFFICE_LNG");

const EARTH_RADIUS_M = 6_371_000;
const WALKING_SPEED_M_PER_MIN = 80;
const DETOUR_FACTOR = 1.3;

// Restaurants beyond this walking time are excluded from the public
// catalogue. The seed grid pulls a ~1.2 km radius (~15 min walk) which
// is wider than the display radius on purpose to absorb tile-corner noise.
export const MAX_WALK_MIN = 10;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function walkMinutesFromOffice(lat: number, lng: number): number {
  const meters = haversineMeters(OFFICE_LAT, OFFICE_LNG, lat, lng);
  return Math.round((meters * DETOUR_FACTOR) / WALKING_SPEED_M_PER_MIN);
}

const COMPASS_8 = [
  "North",
  "North-East",
  "East",
  "South-East",
  "South",
  "South-West",
  "West",
  "North-West",
] as const;
export type Compass8 = (typeof COMPASS_8)[number];

export function compassFromOffice(lat: number, lng: number): Compass8 {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(OFFICE_LAT);
  const φ2 = toRad(lat);
  const Δλ = toRad(lng - OFFICE_LNG);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return COMPASS_8[Math.round(deg / 45) % 8] as Compass8;
}
