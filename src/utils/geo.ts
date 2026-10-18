/** فاصله دو نقطه روی زمین به کیلومتر (فرمول هاورساین) */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** تبدیل ارقام انگلیسی به فارسی */
export function toFa(input: string | number): string {
  return String(input).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${toFa(Math.round(km * 1000))} متر`;
  return `${toFa(km.toFixed(1))} کیلومتر`;
}

/** لینک مسیریابی در اپ/سایت گوگل مپ */
export const googleDirectionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/** لینک نمایش نقطه در گوگل مپ */
export const googlePlaceUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export function isInsideBounds(
  lat: number,
  lng: number,
  bounds: [[number, number], [number, number]]
): boolean {
  const [[s, w], [n, e]] = bounds;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}
