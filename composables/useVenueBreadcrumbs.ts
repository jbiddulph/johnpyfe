import { cleanDbString, formatPlaceName } from '@/utils/format-venue'
import type { BreadcrumbItem } from '@/components/Breadcrumbs.vue'

type PlaceRef = { name?: string | null; href?: string | null } | null | undefined

export function buildVenueBreadcrumbItems(options: {
  venue: { venuename: string; town?: unknown; county?: unknown } | null | undefined
  townRef?: PlaceRef
  countyRef?: PlaceRef
  /** When set, venue name becomes a link (e.g. event detail page). */
  venueLink?: string | null
  /** Final crumb label (defaults to venue name). */
  currentLabel?: string
}): BreadcrumbItem[] {
  const { venue, townRef, countyRef, venueLink, currentLabel } = options
  if (!venue) return []

  const townLabel = formatPlaceName(venue.town)
  const countyLabel = formatPlaceName(venue.county)
  const items: BreadcrumbItem[] = [{ label: 'Home', to: '/' }]

  if (countyRef?.href) {
    items.push({ label: 'Counties', to: '/counties' })
    items.push({ label: countyRef.name || countyLabel, to: countyRef.href })
  } else if (cleanDbString(venue.county)) {
    items.push({ label: countyLabel })
  }

  if (townRef?.href) {
    items.push({ label: townRef.name || townLabel, to: townRef.href })
  } else if (cleanDbString(venue.town)) {
    items.push({ label: townLabel })
  }

  const venueLabel = venue.venuename
  if (venueLink && currentLabel && currentLabel !== venueLabel) {
    items.push({ label: venueLabel, to: venueLink })
    items.push({ label: currentLabel })
  } else if (venueLink) {
    items.push({ label: venueLabel, to: venueLink })
  } else {
    items.push({ label: currentLabel || venueLabel })
  }

  return items
}
