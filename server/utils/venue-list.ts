/** Matches public venues index page size. */
export const VENUE_PAGE_SIZE = 104

export function parseVenuePagination(query: Record<string, unknown>) {
  const skip = Math.max(0, Number.parseInt(String(query.skip ?? 0), 10) || 0)
  const requestedTake = Number.parseInt(String(query.take ?? VENUE_PAGE_SIZE), 10) || VENUE_PAGE_SIZE
  const maxTake = query.all === '1' || query.all === 'true' ? 5000 : VENUE_PAGE_SIZE
  const take = Math.min(maxTake, Math.max(1, requestedTake))
  return { skip, take }
}

/** Normalise list API response for callers that expect a raw array. */
export function unwrapVenueList<T>(data: T[] | { items: T[] } | null | undefined): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && 'items' in data && Array.isArray(data.items)) return data.items
  return []
}

export function paginatedVenueResponse<T>(items: T[], total: number, skip: number, take: number) {
  return {
    items,
    total,
    page: Math.floor(skip / take) + 1,
    pageSize: take,
    totalPages: Math.max(1, Math.ceil(total / take)),
  }
}

export const venueHubSelect = {
  id: true,
  slug: true,
  venuename: true,
  address: true,
  town: true,
  postcode: true,
  latitude: true,
  longitude: true,
  photo: true,
  telephone: true,
  website: true,
} as const
