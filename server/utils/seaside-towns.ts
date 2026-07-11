import { haversineMiles } from './venue-nearby'

/** UK coastal towns with a centre point — venues are matched by town name or proximity. */
export type SeasideTownDef = {
  key: string
  displayName: string
  lat: number
  lon: number
  /** How far from the town centre a venue can be and still count toward this town. */
  radiusMiles: number
  /** DB town values that map to this seaside town (lowercase). */
  townNames: string[]
}

export const SEASIDE_TOWN_DEFS: SeasideTownDef[] = [
  { key: 'brighton', displayName: 'Brighton', lat: 50.8225, lon: -0.1372, radiusMiles: 2.5, townNames: ['brighton', 'hove'] },
  { key: 'worthing', displayName: 'Worthing', lat: 50.814, lon: -0.371, radiusMiles: 2, townNames: ['worthing'] },
  { key: 'bournemouth', displayName: 'Bournemouth', lat: 50.7192, lon: -1.8808, radiusMiles: 2.5, townNames: ['bournemouth', 'poole', 'christchurch'] },
  { key: 'portsmouth', displayName: 'Portsmouth', lat: 50.8198, lon: -1.088, radiusMiles: 2.5, townNames: ['portsmouth', 'southsea'] },
  { key: 'southampton', displayName: 'Southampton', lat: 50.9097, lon: -1.4044, radiusMiles: 2.5, townNames: ['southampton'] },
  { key: 'eastbourne', displayName: 'Eastbourne', lat: 50.768, lon: 0.2905, radiusMiles: 2, townNames: ['eastbourne'] },
  { key: 'hastings', displayName: 'Hastings', lat: 50.8543, lon: 0.5732, radiusMiles: 2, townNames: ['hastings', 'st leonards', 'st. leonards'] },
  { key: 'margate', displayName: 'Margate', lat: 51.3863, lon: 1.3862, radiusMiles: 2, townNames: ['margate', 'ramsgate', 'broadstairs'] },
  { key: 'dover', displayName: 'Dover', lat: 51.1279, lon: 1.3134, radiusMiles: 2, townNames: ['dover', 'folkestone'] },
  { key: 'southend-on-sea', displayName: 'Southend-on-Sea', lat: 51.5459, lon: 0.7077, radiusMiles: 2.5, townNames: ['southend-on-sea', 'southend', 'westcliff-on-sea', 'westcliff'] },
  { key: 'clacton', displayName: 'Clacton-on-Sea', lat: 51.7895, lon: 1.1557, radiusMiles: 2, townNames: ['clacton-on-sea', 'clacton'] },
  { key: 'great-yarmouth', displayName: 'Great Yarmouth', lat: 52.6083, lon: 1.7305, radiusMiles: 2.5, townNames: ['great yarmouth', 'gorleston'] },
  { key: 'lowestoft', displayName: 'Lowestoft', lat: 52.4752, lon: 1.7516, radiusMiles: 2, townNames: ['lowestoft'] },
  { key: 'southwold', displayName: 'Southwold', lat: 52.3267, lon: 1.6784, radiusMiles: 1.5, townNames: ['southwold'] },
  { key: 'felixstowe', displayName: 'Felixstowe', lat: 51.9641, lon: 1.3515, radiusMiles: 2, townNames: ['felixstowe', 'harwich'] },
  { key: 'blackpool', displayName: 'Blackpool', lat: 53.8175, lon: -3.0357, radiusMiles: 3, townNames: ['blackpool', 'lytham st annes', 'lytham', 'st annes'] },
  { key: 'southport', displayName: 'Southport', lat: 53.6476, lon: -3.0063, radiusMiles: 2.5, townNames: ['southport', 'formby'] },
  { key: 'morecambe', displayName: 'Morecambe', lat: 54.0731, lon: -2.8697, radiusMiles: 2, townNames: ['morecambe'] },
  { key: 'scarborough', displayName: 'Scarborough', lat: 54.2797, lon: -0.4044, radiusMiles: 2.5, townNames: ['scarborough'] },
  { key: 'whitby', displayName: 'Whitby', lat: 54.4858, lon: -0.6206, radiusMiles: 2, townNames: ['whitby'] },
  { key: 'bridlington', displayName: 'Bridlington', lat: 54.0839, lon: -0.1923, radiusMiles: 2, townNames: ['bridlington'] },
  { key: 'cleethorpes', displayName: 'Cleethorpes', lat: 53.553, lon: -0.032, radiusMiles: 2, townNames: ['cleethorpes'] },
  { key: 'skegness', displayName: 'Skegness', lat: 53.1434, lon: 0.3408, radiusMiles: 2, townNames: ['skegness', 'mablethorpe'] },
  { key: 'torquay', displayName: 'Torquay', lat: 50.4619, lon: -3.5253, radiusMiles: 2.5, townNames: ['torquay', 'paignton', 'brixham'] },
  { key: 'plymouth', displayName: 'Plymouth', lat: 50.3755, lon: -4.1427, radiusMiles: 3, townNames: ['plymouth'] },
  { key: 'weymouth', displayName: 'Weymouth', lat: 50.6144, lon: -2.4571, radiusMiles: 2, townNames: ['weymouth', 'portland'] },
  { key: 'swanage', displayName: 'Swanage', lat: 50.6082, lon: -1.9608, radiusMiles: 1.5, townNames: ['swanage'] },
  { key: 'bognor-regis', displayName: 'Bognor Regis', lat: 50.785, lon: -0.6758, radiusMiles: 2, townNames: ['bognor regis', 'bognor'] },
  { key: 'littlehampton', displayName: 'Littlehampton', lat: 50.8035, lon: -0.5409, radiusMiles: 2, townNames: ['littlehampton'] },
  { key: 'newquay', displayName: 'Newquay', lat: 50.412, lon: -5.0757, radiusMiles: 2, townNames: ['newquay'] },
  { key: 'penzance', displayName: 'Penzance', lat: 50.1186, lon: -5.5371, radiusMiles: 2, townNames: ['penzance', 'st ives', 'st. ives'] },
  { key: 'falmouth', displayName: 'Falmouth', lat: 50.1542, lon: -5.0711, radiusMiles: 2, townNames: ['falmouth'] },
  { key: 'tenby', displayName: 'Tenby', lat: 51.6731, lon: -4.7019, radiusMiles: 2, townNames: ['tenby'] },
  { key: 'swansea', displayName: 'Swansea', lat: 51.6214, lon: -3.9436, radiusMiles: 3, townNames: ['swansea', 'mumbles'] },
  { key: 'llandudno', displayName: 'Llandudno', lat: 53.3241, lon: -3.8276, radiusMiles: 2, townNames: ['llandudno', 'colwyn bay', 'rhyl'] },
  { key: 'aberystwyth', displayName: 'Aberystwyth', lat: 52.4153, lon: -4.0829, radiusMiles: 2, townNames: ['aberystwyth'] },
  { key: 'weston-super-mare', displayName: 'Weston-super-Mare', lat: 51.346, lon: -2.9767, radiusMiles: 2.5, townNames: ['weston-super-mare', 'weston super mare'] },
  { key: 'minehead', displayName: 'Minehead', lat: 51.2039, lon: -3.4738, radiusMiles: 2, townNames: ['minehead'] },
  { key: 'ilfracombe', displayName: 'Ilfracombe', lat: 51.2092, lon: -4.1267, radiusMiles: 2, townNames: ['ilfracombe'] },
  { key: 'salcombe', displayName: 'Salcombe', lat: 50.2396, lon: -3.7679, radiusMiles: 1.5, townNames: ['salcombe'] },
  { key: 'dartmouth', displayName: 'Dartmouth', lat: 50.3514, lon: -3.5792, radiusMiles: 2, townNames: ['dartmouth'] },
  { key: 'exmouth', displayName: 'Exmouth', lat: 50.6198, lon: -3.4025, radiusMiles: 2, townNames: ['exmouth'] },
  { key: 'tynemouth', displayName: 'Tynemouth', lat: 55.0175, lon: -1.4236, radiusMiles: 2, townNames: ['tynemouth', 'whitley bay', 'cullercoats'] },
  { key: 'south-shields', displayName: 'South Shields', lat: 54.9981, lon: -1.4328, radiusMiles: 2, townNames: ['south shields'] },
  { key: 'sunderland', displayName: 'Sunderland', lat: 54.9069, lon: -1.3838, radiusMiles: 3, townNames: ['sunderland', 'roker'] },
  { key: 'redcar', displayName: 'Redcar', lat: 54.6181, lon: -1.0693, radiusMiles: 2, townNames: ['redcar'] },
]

const townNameToSeaside = new Map<string, SeasideTownDef>()
for (const def of SEASIDE_TOWN_DEFS) {
  for (const name of def.townNames) {
    townNameToSeaside.set(name, def)
  }
}

export function normalizeTownKey(town: string) {
  return town.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function seasideTownByName(town: string | null | undefined): SeasideTownDef | null {
  if (!town) return null
  return townNameToSeaside.get(normalizeTownKey(town)) ?? null
}

export function nearestSeasideByCoords(
  lat: number,
  lon: number,
): { def: SeasideTownDef; distanceMiles: number } | null {
  let best: { def: SeasideTownDef; distanceMiles: number } | null = null
  for (const def of SEASIDE_TOWN_DEFS) {
    const d = haversineMiles(lat, lon, def.lat, def.lon)
    if (d > def.radiusMiles) continue
    if (!best || d < best.distanceMiles) {
      best = { def, distanceMiles: d }
    }
  }
  return best
}
