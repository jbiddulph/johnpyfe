import { cleanDbString } from '../../utils/format-venue'

/** Normalised key for matching DB county strings to a canonical UK county. */
export function countyLookupKey(value: unknown): string | null {
  const s = cleanDbString(value)
  if (!s) return null
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Ceremonial counties, metropolitan areas, and common DB variants used in Venue.county.
 * Excludes towns/villages wrongly stored in the county field (e.g. Hedge End, Pulborough).
 */
const UK_COUNTY_CANONICAL: Record<string, string> = {
  aberdeen: 'Aberdeen',
  aberdeenshire: 'Aberdeenshire',
  anglesey: 'Anglesey',
  angus: 'Angus',
  antrim: 'Antrim',
  argyll: 'Argyll',
  'argyll and bute': 'Argyll and Bute',
  armagh: 'Armagh',
  avon: 'Avon',
  ayrshire: 'Ayrshire',
  bedfordshire: 'Bedfordshire',
  berkshire: 'Berkshire',
  berwickshire: 'Berwickshire',
  breconshire: 'Breconshire',
  buckinghamshire: 'Buckinghamshire',
  caernarfonshire: 'Caernarfonshire',
  caithness: 'Caithness',
  cambridgeshire: 'Cambridgeshire',
  cardiff: 'Cardiff',
  cardiganshire: 'Cardiganshire',
  carmarthenshire: 'Carmarthenshire',
  ceredigion: 'Ceredigion',
  cheshire: 'Cheshire',
  clackmannanshire: 'Clackmannanshire',
  cleveland: 'Cleveland',
  clwyd: 'Clwyd',
  cornwall: 'Cornwall',
  cumbria: 'Cumbria',
  denbighshire: 'Denbighshire',
  derbyshire: 'Derbyshire',
  devon: 'Devon',
  dorset: 'Dorset',
  down: 'Down',
  dumfries: 'Dumfries',
  'dumfries and galloway': 'Dumfries and Galloway',
  dunbartonshire: 'Dunbartonshire',
  durham: 'Durham',
  'county durham': 'County Durham',
  'east riding of yorkshire': 'East Riding of Yorkshire',
  'east sussex': 'East Sussex',
  'e sussex': 'East Sussex',
  essex: 'Essex',
  fermanagh: 'Fermanagh',
  fife: 'Fife',
  flintshire: 'Flintshire',
  glamorgan: 'Glamorgan',
  gloucestershire: 'Gloucestershire',
  'greater london': 'Greater London',
  'greater manchester': 'Greater Manchester',
  gwent: 'Gwent',
  gwynedd: 'Gwynedd',
  hampshire: 'Hampshire',
  herefordshire: 'Herefordshire',
  hertfordshire: 'Hertfordshire',
  'highland': 'Highland',
  humberside: 'Humberside',
  'isle of man': 'Isle of Man',
  'isle of wight': 'Isle of Wight',
  kent: 'Kent',
  kincardineshire: 'Kincardineshire',
  kinrossshire: 'Kinross-shire',
  kirkcudbrightshire: 'Kirkcudbrightshire',
  lanarkshire: 'Lanarkshire',
  lancashire: 'Lancashire',
  leicestershire: 'Leicestershire',
  lincolnshire: 'Lincolnshire',
  london: 'London',
  londonderry: 'Londonderry',
  'city of london': 'City of London',
  merionethshire: 'Merionethshire',
  merseyside: 'Merseyside',
  'mid glamorgan': 'Mid Glamorgan',
  middlesbrough: 'Middlesbrough',
  midlothian: 'Midlothian',
  monmouthshire: 'Monmouthshire',
  montgomeryshire: 'Montgomeryshire',
  moray: 'Moray',
  norfolk: 'Norfolk',
  'north yorkshire': 'North Yorkshire',
  northamptonshire: 'Northamptonshire',
  northumberland: 'Northumberland',
  nottinghamshire: 'Nottinghamshire',
  orkney: 'Orkney',
  oxfordshire: 'Oxfordshire',
  peeblesshire: 'Peeblesshire',
  pembrokeshire: 'Pembrokeshire',
  perthshire: 'Perthshire',
  powys: 'Powys',
  radnorshire: 'Radnorshire',
  renfrewshire: 'Renfrewshire',
  rossshire: 'Ross-shire',
  roxburghshire: 'Roxburghshire',
  rutland: 'Rutland',
  selkirkshire: 'Selkirkshire',
  shetland: 'Shetland',
  shropshire: 'Shropshire',
  somerset: 'Somerset',
  'south glamorgan': 'South Glamorgan',
  'south yorkshire': 'South Yorkshire',
  staffordshire: 'Staffordshire',
  stirlingshire: 'Stirlingshire',
  suffolk: 'Suffolk',
  surrey: 'Surrey',
  sussex: 'Sussex',
  sutherland: 'Sutherland',
  swansea: 'Swansea',
  'tyne and wear': 'Tyne and Wear',
  tyrone: 'Tyrone',
  warwickshire: 'Warwickshire',
  'west glamorgan': 'West Glamorgan',
  'west lothian': 'West Lothian',
  'west midlands': 'West Midlands',
  'west sussex': 'West Sussex',
  'west yorkshire': 'West Yorkshire',
  wiltshire: 'Wiltshire',
  worcestershire: 'Worcestershire',
  wrexham: 'Wrexham',
  yorkshire: 'Yorkshire',
  // Common city/region labels stored as county in the dataset (kept for hub counts)
  birmingham: 'Birmingham',
  bristol: 'Bristol',
  edinburgh: 'Edinburgh',
  glasgow: 'Glasgow',
  leeds: 'Leeds',
  liverpool: 'Liverpool',
  manchester: 'Manchester',
  newcastle: 'Newcastle',
  'newcastle upon tyne': 'Newcastle upon Tyne',
  nottingham: 'Nottingham',
  sheffield: 'Sheffield',
}

export function isKnownUkCounty(value: unknown): boolean {
  const key = countyLookupKey(value)
  return Boolean(key && UK_COUNTY_CANONICAL[key])
}

export function canonicalUkCountyName(value: unknown): string | null {
  const key = countyLookupKey(value)
  if (!key) return null
  return UK_COUNTY_CANONICAL[key] ?? null
}

/** Canonical slug for a county hub URL (one slug per canonical county). */
export function canonicalCountySlug(value: unknown): string | null {
  const name = canonicalUkCountyName(value)
  if (!name) return null
  const key = countyLookupKey(name)
  if (!key) return null
  return key.replace(/\s+/g, '-')
}

/** Resolve a county hub slug from the allowlist when the DB has no matching rows yet. */
export function findCanonicalCountyBySlug(slug: string): string | null {
  const normalised = slug.trim().toLowerCase()
  if (!normalised) return null
  for (const [key, canonical] of Object.entries(UK_COUNTY_CANONICAL)) {
    if (key.replace(/\s+/g, '-') === normalised) return canonical
  }
  return null
}
