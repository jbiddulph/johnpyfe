import { cleanDbString } from './format-venue'

type EventPhotoConfig = {
  eventImgFolder?: string
}

const DEFAULT_EVENT_PHOTO = '/ukpubs-logo.png'

/** Returns a usable event image URL (Skiddle CDN, Supabase folder, or placeholder). */
export function resolveEventPhotoUrl(
  photo: unknown,
  config: EventPhotoConfig = {},
): string {
  const p = cleanDbString(photo)
  if (!p) return DEFAULT_EVENT_PHOTO
  if (p.startsWith('http://') || p.startsWith('https://')) return p

  const folder = config.eventImgFolder || ''
  if (folder) {
    const base = folder.replace(/\/$/, '')
    const path = p.startsWith('/') ? p : `/${p}`
    return `${base}${path}`
  }

  if (p.startsWith('/')) return p
  return DEFAULT_EVENT_PHOTO
}

export type FormattedEventStart = {
  day: string
  month: string
  year: string
  time: string | null
  label: string
}

function daySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** Format event_start for listings. Times are stored as UK wall-clock (UTC components). */
export function formatEventStart(dateString: unknown): FormattedEventStart {
  const raw = cleanDbString(dateString)
  if (!raw) {
    return { day: '', month: '', year: '', time: null, label: '' }
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '', time: null, label: '' }
  }

  const dayNum = date.getUTCDate()
  const day = `${dayNum}${daySuffix(dayNum)}`
  const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })
  const year = date.getUTCFullYear().toString().slice(-2)
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const time = hours === '00' && minutes === '00' ? null : `${hours}:${minutes}`

  return {
    day,
    month,
    year,
    time,
    label: time ? `${day} ${month} at ${time}` : `${day} ${month}`,
  }
}
