// FROST (RULES.md): which forecast nights are «frost conditions» on which parcel. PURE. Every input must be positively known: a missing or unreadable
// value (cloud, topo class, temperature, wind, elevation) means the night CANNOT be judged and is reported as missing, never as «no frost». It never
// claims damage: damage temperatures per crop and stage are [SET] and not modelled here.

export type Topo = 'plain' | 'slope' | 'coastal';
/** One forecast night. `tminC` is the 2 m minimum of the forecast cell; `from`/`to` are the evening and morning dates (YYYY-MM-DD). */
export interface FrostNight { night: string; from: string; to: string; tminC: number; windKmh: number; cloudOktas: number | undefined }
export interface FrostParcel { elevationM: number; topo: Topo | undefined; nights: readonly FrostNight[] }
/** All thresholds are [SET] (agronomist). `offsetC` is added to the cell minimum on a night that already counts as radiative (R = 1, the strongest case). */
export interface FrostParams { tminMaxC: number; windMaxKmh: number; cloudMaxOktas: number; elevationMaxM: number; offsetC: Readonly<Record<Topo, number>>; leafBelowAirC: readonly [number, number]; coverGainC: readonly [number, number] }
export interface FrostHit { night: FrostNight; parcelTminC: number; leafRangeC: readonly [number, number] }
export interface FrostFacts { params: FrostParams; parcels: Readonly<Record<string, FrostParcel>>; tenderCrops: readonly string[]; guardCrops: readonly string[]; coversOnHand: boolean }

const ok = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n);

/** The nights on which one parcel has frost conditions, and the inputs that were missing (each name once). */
export function frostNights(parcel: FrostParcel, p: FrostParams): { hits: FrostHit[]; missing: string[] } {
  const hits: FrostHit[] = [];
  const missing = new Set<string>();
  if (!ok(parcel.elevationM)) missing.add('elevation');
  if (parcel.topo === undefined || !(parcel.topo in p.offsetC)) missing.add('topo_class');
  for (const n of parcel.nights) {
    if (!ok(n.tminC)) missing.add('tmin');
    if (!ok(n.windKmh)) missing.add('wind');
    if (!ok(n.cloudOktas)) missing.add('cloud_oktas');
  }
  for (const n of parcel.nights) {
    if (!ok(parcel.elevationM) || parcel.topo === undefined || !(parcel.topo in p.offsetC) || !ok(n.tminC) || !ok(n.windKmh) || !ok(n.cloudOktas)) continue;
    const t = n.tminC + p.offsetC[parcel.topo];
    if (t <= p.tminMaxC && n.windKmh <= p.windMaxKmh && n.cloudOktas <= p.cloudMaxOktas && parcel.elevationM <= p.elevationMaxM) {
      hits.push({ night: n, parcelTminC: t, leafRangeC: [t - p.leafBelowAirC[1], t - p.leafBelowAirC[0]] });
    }
  }
  return { hits, missing: [...missing] };
}
