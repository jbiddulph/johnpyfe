import { prisma } from '../prisma'
import { resolveSiteUrl } from '../../../utils/site-url'
import {
  isGscPrioritiserEnabled,
  queryGscSearchAnalytics,
  type GscSearchRow,
} from './gsc-client'

export type GscPageOpportunity = {
  pageUrl: string
  path: string
  venueId: number | null
  clicks: number
  impressions: number
  ctr: number
  position: number
  expectedCtr: number
  ctrGap: number
  opportunityScore: number
  reason: string
  topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
}

export type GscVenueOpportunity = GscPageOpportunity & { venueId: number }

type CacheEntry = {
  expiresAt: number
  opportunities: GscPageOpportunity[]
  fetchedAt: string
  error?: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
let opportunityCache: CacheEntry | null = null

/** Rough organic CTR curve used to estimate underperformance. */
export function expectedCtrForPosition(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0.02
  if (position <= 1) return 0.28
  if (position <= 2) return 0.15
  if (position <= 3) return 0.11
  if (position <= 5) return 0.075
  if (position <= 10) return 0.035
  if (position <= 20) return 0.015
  return 0.005
}

export function scoreGscOpportunity(input: {
  clicks: number
  impressions: number
  ctr: number
  position: number
}): { expectedCtr: number; ctrGap: number; opportunityScore: number; reason: string } {
  const impressions = Math.max(0, input.impressions)
  const clicks = Math.max(0, input.clicks)
  const position = Math.max(1, input.position)
  const ctr = impressions > 0 ? clicks / impressions : Math.max(0, input.ctr)
  const expectedCtr = expectedCtrForPosition(position)
  const ctrGap = Math.max(0, expectedCtr - ctr)

  // Primary: wasted impressions from weak CTR at a reachable position.
  let opportunityScore = impressions * ctrGap

  // Striking distance: page 1–2 with solid demand.
  if (position > 3 && position <= 20 && impressions >= 100) {
    opportunityScore += impressions * (0.02 / Math.max(position, 1))
  }

  // Protect winners that already attract clicks (freshen title/copy carefully).
  if (clicks >= 20 && position <= 10) {
    opportunityScore += clicks * 0.5
  }

  let reason = 'General Search Console opportunity'
  if (ctrGap >= 0.02 && impressions >= 80) {
    reason = `Low CTR vs expected at position ~${position.toFixed(1)} (${(ctr * 100).toFixed(1)}% vs ${(expectedCtr * 100).toFixed(1)}%)`
  } else if (position > 3 && position <= 20 && impressions >= 100) {
    reason = `Striking distance (avg position ${position.toFixed(1)}) with ${impressions} impressions`
  } else if (clicks >= 20) {
    reason = `Already earning ${clicks} clicks — worth refreshing SEO copy`
  }

  return { expectedCtr, ctrGap, opportunityScore, reason }
}

/** Extract pathname from absolute or relative GSC page URLs. */
export function pathFromGscPageUrl(pageUrl: string): string {
  try {
    if (pageUrl.startsWith('http://') || pageUrl.startsWith('https://')) {
      return new URL(pageUrl).pathname || '/'
    }
  } catch {
    /* fall through */
  }
  const trimmed = pageUrl.trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed.split('?')[0] : `/${trimmed.split('?')[0]}`
}

/** Map a GSC page path to a venue id when it matches /venues/:id/:slug. */
export function venueIdFromPath(path: string): number | null {
  const match = path.match(/^\/venues\/(\d+)(?:\/|$)/i)
  if (!match) return null
  const id = Number.parseInt(match[1], 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

function minImpressions() {
  return Math.max(10, Number.parseInt(process.env.AI_SEO_GSC_MIN_IMPRESSIONS || '40', 10) || 40)
}

function rowsToOpportunities(rows: GscSearchRow[]): GscPageOpportunity[] {
  const site = resolveSiteUrl()
  const minImpr = minImpressions()
  const opportunities: GscPageOpportunity[] = []

  for (const row of rows) {
    const pageUrl = String(row.keys?.[0] || '').trim()
    if (!pageUrl) continue
    const impressions = Number(row.impressions || 0)
    if (impressions < minImpr) continue

    const path = pathFromGscPageUrl(pageUrl)
    const clicks = Number(row.clicks || 0)
    const position = Number(row.position || 0)
    const ctr = Number(row.ctr || 0)
    const scored = scoreGscOpportunity({ clicks, impressions, ctr, position })
    if (scored.opportunityScore <= 0) continue

    const absoluteUrl = pageUrl.startsWith('http') ? pageUrl : `${site}${path}`
    opportunities.push({
      pageUrl: absoluteUrl,
      path,
      venueId: venueIdFromPath(path),
      clicks,
      impressions,
      ctr,
      position,
      expectedCtr: scored.expectedCtr,
      ctrGap: scored.ctrGap,
      opportunityScore: scored.opportunityScore,
      reason: scored.reason,
    })
  }

  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore)
  return opportunities
}

async function loadFreshOpportunities(): Promise<CacheEntry> {
  try {
    const rows = await queryGscSearchAnalytics({
      dimensions: ['page'],
      rowLimit: 5000,
    })
    return {
      expiresAt: Date.now() + CACHE_TTL_MS,
      opportunities: rowsToOpportunities(rows),
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      expiresAt: Date.now() + 15 * 60 * 1000,
      opportunities: [],
      fetchedAt: new Date().toISOString(),
      error: (error as Error).message,
    }
  }
}

export async function getGscPageOpportunities(options: { forceRefresh?: boolean } = {}) {
  if (!isGscPrioritiserEnabled()) {
    return {
      enabled: false as const,
      configured: false,
      opportunities: [] as GscPageOpportunity[],
      fetchedAt: null as string | null,
      error: null as string | null,
    }
  }

  if (!options.forceRefresh && opportunityCache && opportunityCache.expiresAt > Date.now()) {
    return {
      enabled: true as const,
      configured: true,
      opportunities: opportunityCache.opportunities,
      fetchedAt: opportunityCache.fetchedAt,
      error: opportunityCache.error || null,
    }
  }

  opportunityCache = await loadFreshOpportunities()
  return {
    enabled: true as const,
    configured: true,
    opportunities: opportunityCache.opportunities,
    fetchedAt: opportunityCache.fetchedAt,
    error: opportunityCache.error || null,
  }
}

async function filterEligibleVenueIds(venueIds: number[]): Promise<number[]> {
  if (!venueIds.length) return []

  const [liveVenues, pending, recent] = await Promise.all([
    prisma.venue.findMany({
      where: { id: { in: venueIds }, is_live: '1' },
      select: { id: true },
    }),
    prisma.venueSeoRecommendation.findMany({
      where: { venueId: { in: venueIds }, status: 'pending' },
      select: { venueId: true },
      distinct: ['venueId'],
    }),
    prisma.venueSeoRecommendation.findMany({
      where: {
        venueId: { in: venueIds },
        generatedAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      select: { venueId: true },
      distinct: ['venueId'],
    }),
  ])

  const live = new Set(liveVenues.map((v) => v.id))
  const blocked = new Set([
    ...pending.map((row) => row.venueId),
    ...recent.map((row) => row.venueId),
  ])

  return venueIds.filter((id) => live.has(id) && !blocked.has(id))
}

/**
 * Top venue ids to spend OpenAI tokens on, ordered by GSC opportunity score.
 * Falls back to [] when GSC is disabled or returns no mappable venue pages.
 */
export async function findGscPriorityVenueIds(limit: number): Promise<number[]> {
  if (!isGscPrioritiserEnabled()) return []

  const { opportunities, error } = await getGscPageOpportunities()
  if (error) {
    console.warn('[gsc-prioritiser] using empty priority list:', error)
    return []
  }

  const orderedIds: number[] = []
  const seen = new Set<number>()
  for (const opportunity of opportunities) {
    if (!opportunity.venueId) continue
    if (seen.has(opportunity.venueId)) continue
    seen.add(opportunity.venueId)
    orderedIds.push(opportunity.venueId)
  }

  const eligible = await filterEligibleVenueIds(orderedIds)
  return eligible.slice(0, Math.max(1, limit))
}

export async function getGscOpportunityForVenue(venueId: number): Promise<GscVenueOpportunity | null> {
  const { opportunities } = await getGscPageOpportunities()
  const match = opportunities.find((item) => item.venueId === venueId)
  if (!match || !match.venueId) return null
  return match as GscVenueOpportunity
}

/** Top queries for a venue page — used to steer title/meta generation. */
export async function fetchTopQueriesForPage(pageUrl: string, limit = 8) {
  if (!isGscPrioritiserEnabled()) return []

  try {
    const rows = await queryGscSearchAnalytics({
      dimensions: ['query'],
      rowLimit: Math.min(25, Math.max(1, limit)),
      dimensionFilterGroups: [
        {
          filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }],
        },
      ],
    })

    return rows.map((row) => ({
      query: String(row.keys?.[0] || '').trim(),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    })).filter((row) => row.query)
  } catch (error) {
    console.warn('[gsc-prioritiser] top queries failed', pageUrl, (error as Error).message)
    return []
  }
}

export async function getGscPriorityPreview(limit = 25) {
  const snapshot = await getGscPageOpportunities()
  const venueOpps = snapshot.opportunities.filter((item): item is GscVenueOpportunity => Boolean(item.venueId))
  const eligibleIds = await filterEligibleVenueIds(venueOpps.map((item) => item.venueId))
  const eligible = new Set(eligibleIds)

  return {
    ...snapshot,
    venueOpportunities: venueOpps.filter((item) => eligible.has(item.venueId)).slice(0, limit),
    venueOpportunityCount: venueOpps.filter((item) => eligible.has(item.venueId)).length,
    pageOpportunityCount: snapshot.opportunities.length,
  }
}
