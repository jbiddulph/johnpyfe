/** Sort events soonest first (stable by id when start times match). */
export function sortEventsByStartAsc<T extends { event_start?: string | Date | null; id?: number }>(
  events: T[] | null | undefined,
): T[] {
  if (!events?.length) return []

  return [...events].sort((a, b) => {
    const aTime = a.event_start ? new Date(a.event_start).getTime() : Number.NaN
    const bTime = b.event_start ? new Date(b.event_start).getTime() : Number.NaN
    const aValid = Number.isFinite(aTime)
    const bValid = Number.isFinite(bTime)

    if (aValid && bValid && aTime !== bTime) return aTime - bTime
    if (aValid && !bValid) return -1
    if (!aValid && bValid) return 1
    return (a.id ?? 0) - (b.id ?? 0)
  })
}
