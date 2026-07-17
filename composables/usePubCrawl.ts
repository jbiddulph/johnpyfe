import { buildCrawlLegs, formatWalkingDistance } from '@/utils/crawl-distance'

export type CrawlStop = {
  id?: string
  venueId: number | null
  venueName: string
  town?: string | null
  county?: string | null
  latitude: number | null
  longitude: number | null
  notes?: string | null
  sortOrder?: number
}

export type CrawlSummary = {
  id: string
  name: string
  currentStopIndex: number
  stopCount: number
  updatedAt: string
  completedAt?: string | null
  canEdit?: boolean
  role?: 'owner' | 'member' | 'none'
  stops?: CrawlStop[]
}

const ACTIVE_CRAWL_KEY_PREFIX = 'ukpubs_active_crawl_id:'
const LEGACY_ACTIVE_CRAWL_KEY = 'ukpubs_active_crawl_id'

function storageKeyForUser(userId: string | null | undefined) {
  if (!userId) return null
  return `${ACTIVE_CRAWL_KEY_PREFIX}${userId}`
}

function rememberActiveCrawlId(id: string | null, userId?: string | null) {
  if (!import.meta.client) return
  try {
    const key = storageKeyForUser(userId)
    // Always clear the legacy global key so account-switching cannot leak crawls
    localStorage.removeItem(LEGACY_ACTIVE_CRAWL_KEY)
    if (!key) return
    if (id) localStorage.setItem(key, id)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function readRememberedCrawlId(userId?: string | null) {
  if (!import.meta.client) return null
  try {
    const key = storageKeyForUser(userId)
    if (key) {
      const scoped = localStorage.getItem(key)
      if (scoped) return scoped
    }
    // One-time legacy fallback (pre user-scoped keys)
    return localStorage.getItem(LEGACY_ACTIVE_CRAWL_KEY)
  } catch {
    return null
  }
}

function formatSavedTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function usePubCrawl() {
  const { isLoggedIn, initializeAuth, user } = useAuth()

  const crawls = useState<CrawlSummary[]>('ukpubs-crawls', () => [])
  const activeCrawl = useState<CrawlSummary | null>('ukpubs-active-crawl', () => null)
  const stops = useState<CrawlStop[]>('ukpubs-crawl-stops', () => [])
  const currentStopIndex = useState<number>('ukpubs-crawl-progress', () => 0)
  const draftName = useState<string>('ukpubs-crawl-draft-name', () => '')
  const loadingList = useState<boolean>('ukpubs-crawl-loading', () => false)
  const saving = useState<boolean>('ukpubs-crawl-saving', () => false)
  const addingStop = useState<boolean>('ukpubs-crawl-adding', () => false)
  const deletingId = useState<string | null>('ukpubs-crawl-deleting', () => null)
  const errorMessage = useState<string>('ukpubs-crawl-error', () => '')
  const dirty = useState<boolean>('ukpubs-crawl-dirty', () => false)
  const lastSavedAt = useState<string>('ukpubs-crawl-saved-at', () => '')
  const initialized = useState<boolean>('ukpubs-crawl-initialized', () => false)
  const boundUserId = useState<string | null>('ukpubs-crawl-bound-user', () => null)

  const currentUserId = computed(() => (user.value as { id?: string } | null)?.id || null)

  function resetCrawlState(options?: { clearRemembered?: boolean }) {
    crawls.value = []
    activeCrawl.value = null
    stops.value = []
    currentStopIndex.value = 0
    draftName.value = ''
    dirty.value = false
    lastSavedAt.value = ''
    errorMessage.value = ''
    initialized.value = false
    if (options?.clearRemembered) {
      rememberActiveCrawlId(null, boundUserId.value || currentUserId.value)
    }
  }

  // When switching accounts in the same browser, drop the previous user's crawl state
  watch(
    currentUserId,
    (next, prev) => {
      if (next === prev) return
      if (prev && next !== prev) {
        rememberActiveCrawlId(null, prev)
        resetCrawlState()
      }
      boundUserId.value = next
    },
    { immediate: true },
  )

  const legs = computed(() => buildCrawlLegs(stops.value))

  const totalWalkLabel = computed(() => {
    const miles = legs.value.reduce((sum, leg) => sum + (leg.miles ?? 0), 0)
    if (!miles) return ''
    return `Total ~${formatWalkingDistance(miles).replace(/^~/, '')}`
  })

  const progressPercent = computed(() => {
    if (!stops.value.length) return 0
    return Math.round(((currentStopIndex.value + 1) / stops.value.length) * 100)
  })

  const hasActiveCrawl = computed(() => !!activeCrawl.value)
  const canEditActiveCrawl = computed(() =>
    !!activeCrawl.value
    && activeCrawl.value.canEdit === true
    && activeCrawl.value.role === 'owner',
  )

  function ensureCanEdit() {
    if (!canEditActiveCrawl.value) {
      errorMessage.value = 'Only the crawl creator can edit or delete this list.'
      return false
    }
    return true
  }

  function legLabel(fromIndex: number) {
    return legs.value[fromIndex]?.label || 'Distance unknown'
  }

  function markDirty() {
    dirty.value = true
  }

  function clearActive() {
    activeCrawl.value = null
    stops.value = []
    currentStopIndex.value = 0
    draftName.value = ''
    dirty.value = false
    lastSavedAt.value = ''
    rememberActiveCrawlId(null, currentUserId.value)
  }

  async function loadCrawls() {
    if (!isLoggedIn.value) return
    loadingList.value = true
    errorMessage.value = ''
    try {
      crawls.value = await useAuthFetch<CrawlSummary[]>('/api/crawls')
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load crawls'
    } finally {
      loadingList.value = false
    }
  }

  async function loadCrawl(id: string) {
    errorMessage.value = ''
    try {
      const crawl = await useAuthFetch<CrawlSummary & { stops: CrawlStop[] }>(`/api/crawls/${id}`)
      activeCrawl.value = crawl
      draftName.value = crawl.name
      stops.value = (crawl.stops || []).map((s) => ({ ...s }))
      currentStopIndex.value = crawl.currentStopIndex || 0
      dirty.value = false
      lastSavedAt.value = formatSavedTime(crawl.updatedAt)
      rememberActiveCrawlId(crawl.id, currentUserId.value)
      return crawl
    } catch (err: any) {
      const status = err?.statusCode || err?.status || err?.data?.statusCode
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not load crawl'
      // Drop a remembered crawl this account cannot access (common after switching users)
      if (status === 401 || status === 403 || status === 404) {
        rememberActiveCrawlId(null, currentUserId.value)
        if (activeCrawl.value?.id === id) {
          activeCrawl.value = null
          stops.value = []
          currentStopIndex.value = 0
          draftName.value = ''
        }
      }
      return null
    }
  }

  async function ensureActiveCrawl() {
    if (activeCrawl.value?.id) {
      // Guard against stale in-memory crawl from another account
      if (crawls.value.length && !crawls.value.some((c) => c.id === activeCrawl.value?.id)) {
        clearActive()
      } else {
        if (!stops.value.length && (activeCrawl.value.stopCount || 0) > 0) {
          await loadCrawl(activeCrawl.value.id)
        }
        return activeCrawl.value
      }
    }

    await loadCrawls()

    const remembered = readRememberedCrawlId(currentUserId.value)
    if (remembered && crawls.value.some((c) => c.id === remembered)) {
      return loadCrawl(remembered)
    }
    // Clear legacy/global remembered ids that this user cannot access
    if (remembered && !crawls.value.some((c) => c.id === remembered)) {
      rememberActiveCrawlId(null, currentUserId.value)
    }

    if (crawls.value.length >= 1) {
      return loadCrawl(crawls.value[0].id)
    }

    errorMessage.value = 'Create a pub crawl first, then add pubs to it.'
    return null
  }

  async function createCrawl(nameInput?: string) {
    const name = (nameInput ?? draftName.value).trim()
    if (!name) return null
    saving.value = true
    errorMessage.value = ''
    try {
      const crawl = await useAuthFetch<CrawlSummary>('/api/crawls', {
        method: 'POST',
        body: { name },
      })
      activeCrawl.value = crawl
      draftName.value = crawl.name
      stops.value = []
      currentStopIndex.value = 0
      dirty.value = false
      lastSavedAt.value = 'just now'
      rememberActiveCrawlId(crawl.id, currentUserId.value)
      await loadCrawls()
      return crawl
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not create crawl'
      return null
    } finally {
      saving.value = false
    }
  }

  async function saveMeta() {
    if (!activeCrawl.value || !ensureCanEdit()) return null
    const name = draftName.value.trim()
    if (!name) return null
    saving.value = true
    errorMessage.value = ''
    try {
      const crawl = await useAuthFetch<CrawlSummary>(`/api/crawls/${activeCrawl.value.id}`, {
        method: 'PUT',
        body: { name },
      })
      activeCrawl.value = { ...activeCrawl.value, name: crawl.name, canEdit: true, role: 'owner' }
      rememberActiveCrawlId(crawl.id, currentUserId.value)
      await loadCrawls()
      return crawl
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not rename crawl'
      return null
    } finally {
      saving.value = false
    }
  }

  async function saveCrawl() {
    if (!activeCrawl.value || !ensureCanEdit()) return null
    saving.value = true
    errorMessage.value = ''
    try {
      const crawl = await useAuthFetch<CrawlSummary & { stops: CrawlStop[] }>(
        `/api/crawls/${activeCrawl.value.id}/stops`,
        {
          method: 'PUT',
          body: {
            name: draftName.value.trim() || activeCrawl.value.name,
            currentStopIndex: currentStopIndex.value,
            stops: stops.value.map((s) => ({
              venueId: s.venueId,
              venueName: s.venueName,
              latitude: s.latitude,
              longitude: s.longitude,
              notes: s.notes ?? null,
            })),
          },
        },
      )
      activeCrawl.value = { ...crawl, canEdit: true, role: 'owner' }
      draftName.value = crawl.name
      stops.value = (crawl.stops || []).map((s) => ({ ...s }))
      currentStopIndex.value = crawl.currentStopIndex || 0
      dirty.value = false
      lastSavedAt.value = 'just now'
      rememberActiveCrawlId(crawl.id, currentUserId.value)
      await loadCrawls()
      return crawl
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not save crawl'
      return null
    } finally {
      saving.value = false
    }
  }

  async function deleteCrawl(id: string) {
    const target = crawls.value.find((c) => c.id === id)
    if (target && target.canEdit === false) {
      errorMessage.value = 'Only the crawl creator can delete this list.'
      return false
    }
    deletingId.value = id
    errorMessage.value = ''
    try {
      await useAuthFetch(`/api/crawls/${id}`, { method: 'DELETE' })
      if (activeCrawl.value?.id === id) clearActive()
      await loadCrawls()
      return true
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not delete crawl'
      return false
    } finally {
      deletingId.value = null
    }
  }

  async function addManualStop(_nameInput: string) {
    // Manual free-text stops are no longer supported — use addVenueStop with a DB venue.
    errorMessage.value = 'Pick a pub from the search results.'
    return false
  }

  /** Add a map venue and persist immediately. */
  async function addVenueStop(venue: {
    id: number
    name: string
    lat: number | null
    lng: number | null
  }) {
    const crawl = await ensureActiveCrawl()
    if (!crawl) return false
    if (crawl.canEdit === false || crawl.role === 'member') {
      errorMessage.value = 'Only the crawl creator can add pubs to this list.'
      return false
    }

    if (!stops.value.length && (crawl.stopCount || 0) > 0) {
      await loadCrawl(crawl.id)
    }

    if (venue.id && stops.value.some((s) => s.venueId === venue.id)) {
      errorMessage.value = 'That pub is already on this crawl.'
      return false
    }

    addingStop.value = true
    errorMessage.value = ''
    try {
      const created = await useAuthFetch<CrawlStop>(`/api/crawls/${crawl.id}/stops`, {
        method: 'POST',
        body: {
          venueId: venue.id || null,
          venueName: venue.name,
          latitude: venue.lat,
          longitude: venue.lng,
        },
      })
      stops.value = [...stops.value, created]
      dirty.value = false
      lastSavedAt.value = 'just now'
      await loadCrawls()
      if (activeCrawl.value) {
        activeCrawl.value = {
          ...activeCrawl.value,
          stopCount: stops.value.length,
          stops: stops.value,
        }
      }
      return true
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not add pub to crawl'
      return false
    } finally {
      addingStop.value = false
    }
  }

  function removeStopLocal(index: number) {
    if (!ensureCanEdit()) return
    stops.value.splice(index, 1)
    if (currentStopIndex.value >= stops.value.length) {
      currentStopIndex.value = Math.max(0, stops.value.length - 1)
    }
    markDirty()
  }

  function isVenueOnActiveCrawl(venueId: number | null | undefined) {
    if (!venueId) return false
    if (stops.value.some((s) => s.venueId === venueId)) return true
    // Fallback while the active crawl's stops are still hydrating
    return (activeCrawl.value?.stops || []).some((s) => s.venueId === venueId)
  }

  /** Remove a map venue from the active crawl and persist immediately. */
  async function removeVenueStop(venueId: number) {
    if (!activeCrawl.value) {
      errorMessage.value = 'Open or create a crawl first.'
      return false
    }
    if (!ensureCanEdit()) return false

    if (!stops.value.length && (activeCrawl.value.stopCount || 0) > 0) {
      await loadCrawl(activeCrawl.value.id)
    }

    const stop = stops.value.find((s) => s.venueId === venueId)
    if (!stop) {
      errorMessage.value = 'That pub is not on this crawl.'
      return false
    }

    addingStop.value = true
    errorMessage.value = ''
    try {
      await useAuthFetch(`/api/crawls/${activeCrawl.value.id}/stops/${stop.id}`, {
        method: 'DELETE',
      })

      const nextStops = stops.value.filter((s) => s.id !== stop.id)
      stops.value = nextStops
      if (currentStopIndex.value >= nextStops.length) {
        currentStopIndex.value = Math.max(0, nextStops.length - 1)
      }

      dirty.value = false
      lastSavedAt.value = 'just now'
      await loadCrawls()
      if (activeCrawl.value) {
        activeCrawl.value = {
          ...activeCrawl.value,
          stopCount: nextStops.length,
          currentStopIndex: currentStopIndex.value,
          stops: nextStops,
        }
      }
      return true
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not remove pub from crawl'
      return false
    } finally {
      addingStop.value = false
    }
  }

  function setProgress(index: number) {
    if (!ensureCanEdit()) return
    if (index < 0 || index >= stops.value.length) return
    currentStopIndex.value = index
    markDirty()
  }

  /** Persist progress immediately (manual Next / auto check-in). Creator only. */
  async function setProgressAndSave(index: number, options?: { fromArrival?: boolean }) {
    if (!activeCrawl.value || !ensureCanEdit()) return false
    if (index < 0 || index >= stops.value.length) return false

    // Only move forward on auto-arrival; allow manual jumps either way
    if (options?.fromArrival && index <= currentStopIndex.value) return false

    const previousIndex = currentStopIndex.value
    currentStopIndex.value = index
    errorMessage.value = ''
    try {
      const crawl = await useAuthFetch<CrawlSummary>(`/api/crawls/${activeCrawl.value.id}`, {
        method: 'PUT',
        body: { currentStopIndex: index },
      })
      activeCrawl.value = {
        ...activeCrawl.value,
        currentStopIndex: crawl.currentStopIndex,
      }
      dirty.value = false
      lastSavedAt.value = 'just now'
      await loadCrawls()
      return true
    } catch (err: any) {
      currentStopIndex.value = previousIndex
      errorMessage.value = err?.data?.statusMessage || err?.message || 'Could not update progress'
      markDirty()
      return false
    }
  }

  function reorderStops(fromIndex: number, toIndex: number) {
    if (!ensureCanEdit()) return
    if (fromIndex === toIndex) return
    const next = stops.value.slice()
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    stops.value = next

    if (currentStopIndex.value === fromIndex) {
      currentStopIndex.value = toIndex
    } else if (fromIndex < currentStopIndex.value && toIndex >= currentStopIndex.value) {
      currentStopIndex.value -= 1
    } else if (fromIndex > currentStopIndex.value && toIndex <= currentStopIndex.value) {
      currentStopIndex.value += 1
    }
    markDirty()
  }

  async function initialize() {
    await initializeAuth()
    if (!isLoggedIn.value || !currentUserId.value) {
      resetCrawlState({ clearRemembered: false })
      clearActive()
      initialized.value = true
      return
    }

    boundUserId.value = currentUserId.value
    await loadCrawls()

    // Drop in-memory active crawl if it is not in this user's accessible list
    if (activeCrawl.value && !crawls.value.some((c) => c.id === activeCrawl.value?.id)) {
      clearActive()
    }

    if (!activeCrawl.value) {
      const remembered = readRememberedCrawlId(currentUserId.value)
      if (remembered && crawls.value.some((c) => c.id === remembered)) {
        await loadCrawl(remembered)
      } else {
        if (remembered) rememberActiveCrawlId(null, currentUserId.value)
        if (crawls.value.length >= 1) {
          // Prefer first accessible crawl (owned + accepted shared)
          await loadCrawl(crawls.value[0].id)
        }
      }
    } else if (activeCrawl.value.id && !stops.value.length && activeCrawl.value.stopCount) {
      await loadCrawl(activeCrawl.value.id)
    }
    initialized.value = true
  }

  /** Remember + load a crawl after accepting an invite. */
  async function openSharedCrawl(id: string) {
    if (!id) return null
    rememberActiveCrawlId(id, currentUserId.value)
    await loadCrawls()
    return loadCrawl(id)
  }

  return {
    crawls,
    activeCrawl,
    stops,
    currentStopIndex,
    draftName,
    loadingList,
    saving,
    addingStop,
    deletingId,
    errorMessage,
    dirty,
    lastSavedAt,
    initialized,
    legs,
    totalWalkLabel,
    progressPercent,
    hasActiveCrawl,
    canEditActiveCrawl,
    legLabel,
    clearActive,
    loadCrawls,
    loadCrawl,
    ensureActiveCrawl,
    createCrawl,
    saveMeta,
    saveCrawl,
    deleteCrawl,
    addManualStop,
    addVenueStop,
    removeStopLocal,
    isVenueOnActiveCrawl,
    removeVenueStop,
    setProgress,
    setProgressAndSave,
    reorderStops,
    openSharedCrawl,
    initialize,
  }
}
