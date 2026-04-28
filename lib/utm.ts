/* Shared UTM ↔ WGS84 conversion (WGS84 ellipsoid) */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function utmToLatLon(easting: number, northing: number, zone: string): [number, number] {
  const zoneNum = parseInt(zone, 10);
  const isSouth = /S/i.test(zone);
  const a = 6378137.0, f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const k0 = 0.9996;
  const x = easting - 500000;
  const y = isSouth ? northing - 10000000 : northing;
  const lon0 = (zoneNum - 1) * 6 - 180 + 3;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinPhi1 = Math.sin(phi1), cosPhi1 = Math.cos(phi1), tanPhi1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 ** 2);
  const T1 = tanPhi1 ** 2;
  const C1 = (e2 / (1 - e2)) * cosPhi1 ** 2;
  const R1 = a * (1 - e2) / (1 - e2 * sinPhi1 ** 2) ** 1.5;
  const D = x / (N1 * k0);
  const lat = phi1 - (N1 * tanPhi1 / R1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * (e2 / (1 - e2))) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * (e2 / (1 - e2)) - 3 * C1 ** 2) * D ** 6 / 720
  );
  const lon = lon0 * DEG + (
    D
    - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * (e2 / (1 - e2)) + 24 * T1 ** 2) * D ** 5 / 120
  ) / cosPhi1;
  return [lat * RAD, lon * RAD];
}

export function latLonToUtm(lat: number, lon: number, zone?: number): { easting: number; northing: number; zone: number; isSouth: boolean } {
  const a = 6378137.0, f = 1 / 298.257223563;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const k0 = 0.9996;
  const phi = lat * DEG;
  const lam = lon * DEG;
  const zoneNum = zone ?? Math.floor((lon + 180) / 6) + 1;
  const lon0 = ((zoneNum - 1) * 6 - 180 + 3) * DEG;
  const isSouth = lat < 0;
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi), tanPhi = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * sinPhi ** 2);
  const T = tanPhi ** 2;
  const C = (e2 / (1 - e2)) * cosPhi ** 2;
  const A = cosPhi * (lam - lon0);
  const M = a * (
    (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi
    - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi)
  );
  const easting = k0 * N * (
    A + (1 - T + C) * A ** 3 / 6
    + (5 - 18 * T + T ** 2 + 72 * C - 58 * (e2 / (1 - e2))) * A ** 5 / 120
  ) + 500000;
  const northingRaw = k0 * (M + N * tanPhi * (
    A ** 2 / 2
    + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
    + (61 - 58 * T + T ** 2 + 600 * C - 330 * (e2 / (1 - e2))) * A ** 6 / 720
  ));
  const northing = isSouth ? northingRaw + 10000000 : northingRaw;
  return { easting, northing, zone: zoneNum, isSouth };
}

export function decimalToDMS(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mRaw = (abs - d) * 60;
  const m = Math.floor(mRaw);
  const s = (mRaw - m) * 60;
  return `${d}°${m}'${s.toFixed(4)}"${dir}`;
}

export function dmsToDeg(dms: string): number | null {
  const m = dms.match(/^(\d+)[°d](\d+)['\u2019](\d+(?:\.\d+)?)["\u201d]?\s*([NSEWnsew])$/);
  if (!m) return null;
  const [, d, min, sec, dir] = m;
  let v = +d + +min / 60 + +sec / 3600;
  if (/[SWsw]/.test(dir)) v = -v;
  return v;
}
