import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import type { SeoFieldSnapshot } from './seo-types'
import {
  emptySeoSnapshot,
  faqSuggestionsFromChanges,
  getSeoFieldDiffs,
  runIdFromAnalysis,
  snapshotFromAnalysisPrevious,
  snapshotFromChanges,
  sourceNotesFromChanges,
} from './seo-snapshot'

export type SeoPreviousSource = 'stored' | 'previous_recommendation' | 'missing'

export type SeoImprovementItem = {
  id: string
  venueId: number
  venueName: string
  slug: string
  town: string
  venuePath: string
  status: string
  generatedAt: string
  appliedAt: string | null
  runId: string | null
  previousSource: SeoPreviousSource
  diffs: ReturnType<typeof getSeoFieldDiffs>
  faqSuggestions: Array<{ question: string; answer: string }>
  sourceNotes: string[]
}

export {
  emptySeoSnapshot,
  getSeoFieldDiffs,
  snapshotFromChanges,
  snapshotFromSeoData,
  snapshotFromAnalysisPrevious,
} from './seo-snapshot'

async function previousSnapshotsForRecommendations(
  recs: Array<{ id: string; venueId: number; generatedAt: Date; analysis: unknown }>,
): Promise<Map<string, { snapshot: SeoFieldSnapshot; source: SeoPreviousSource }>> {
  const resolved = new Map<string, { snapshot: SeoFieldSnapshot; source: SeoPreviousSource }>()

  for (const rec of recs) {
    const stored = snapshotFromAnalysisPrevious(rec.analysis)
    if (stored) resolved.set(rec.id, { snapshot: stored, source: 'stored' })
  }

  const missing = recs.filter((rec) => !resolved.has(rec.id))
  if (missing.length === 0) return resolved

  const venueIds = [...new Set(missing.map((rec) => rec.venueId))]
  const priors = await prisma.venueSeoRecommendation.findMany({
    where: { venueId: { in: venueIds } },
    select: { id: true, venueId: true, generatedAt: true, changes: true },
    orderBy: { generatedAt: 'asc' },
  })

  const byVenue = new Map<number, typeof priors>()
  for (const prior of priors) {
    const list = byVenue.get(prior.venueId) || []
    list.push(prior)
    byVenue.set(prior.venueId, list)
  }

  for (const rec of missing) {
    const list = byVenue.get(rec.venueId) || []
    const prior = [...list].reverse().find((item) => item.id !== rec.id && item.generatedAt < rec.generatedAt)
    if (prior) {
      resolved.set(rec.id, {
        snapshot: snapshotFromChanges(prior.changes),
        source: 'previous_recommendation',
      })
    } else {
      resolved.set(rec.id, { snapshot: emptySeoSnapshot(), source: 'missing' })
    }
  }

  return resolved
}

export async function listSeoImprovements(options: {
  status?: string
  runId?: string
  skip?: number
  take?: number
}) {
  const skip = Math.max(0, options.skip || 0)
  const take = Math.min(50, Math.max(1, options.take || 20))
  const status = String(options.status || '').trim().toLowerCase()
  const runId = String(options.runId || '').trim()
  const statusFilter = status && status !== 'all' ? status : null

  let run = null
  let matchedBy: 'runId' | 'timeWindow' | null = null
  const where: Prisma.VenueSeoRecommendationWhereInput = {}

  if (statusFilter) where.status = statusFilter

  if (runId) {
    run = await prisma.aiSeoRun.findUnique({
      where: { id: runId },
    })
    if (!run) {
      throw createError({ statusCode: 404, statusMessage: 'SEO run was not found' })
    }

    const taggedRows = statusFilter
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM venue_seo_recommendations
          WHERE analysis->>'runId' = ${runId}
            AND status = ${statusFilter}
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM venue_seo_recommendations
          WHERE analysis->>'runId' = ${runId}
        `

    if (taggedRows.length > 0) {
      matchedBy = 'runId'
      where.id = { in: taggedRows.map((row) => row.id) }
    } else {
      matchedBy = 'timeWindow'
      where.generatedAt = {
        gte: run.startedAt,
        lte: run.finishedAt || new Date(),
      }
    }
  }

  const [total, recs] = await Promise.all([
    prisma.venueSeoRecommendation.count({ where }),
    prisma.venueSeoRecommendation.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take,
      include: {
        venue: {
          select: { id: true, venuename: true, slug: true, town: true },
        },
      },
    }),
  ])

  const previousById = await previousSnapshotsForRecommendations(recs)

  const items: SeoImprovementItem[] = recs.map((rec) => {
    const previous = previousById.get(rec.id) || { snapshot: emptySeoSnapshot(), source: 'missing' as const }
    const after = snapshotFromChanges(rec.changes)
    return {
      id: rec.id,
      venueId: rec.venueId,
      venueName: rec.venue.venuename,
      slug: rec.venue.slug,
      town: rec.venue.town,
      venuePath: `/venues/${rec.venue.id}/${encodeURIComponent(rec.venue.slug)}`,
      status: rec.status,
      generatedAt: rec.generatedAt.toISOString(),
      appliedAt: rec.appliedAt?.toISOString() || null,
      runId: runIdFromAnalysis(rec.analysis) || (matchedBy === 'timeWindow' ? runId : null),
      previousSource: previous.source,
      diffs: getSeoFieldDiffs(previous.snapshot, after),
      faqSuggestions: faqSuggestionsFromChanges(rec.changes),
      sourceNotes: sourceNotesFromChanges(rec.changes, rec.sources),
    }
  })

  return {
    items,
    total,
    skip,
    take,
    matchedBy,
    run: run
      ? {
          id: run.id,
          status: run.status,
          requestedLimit: run.requestedLimit,
          processedCount: run.processedCount,
          appliedCount: run.appliedCount,
          draftedCount: run.draftedCount,
          errorCount: run.errorCount,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
        }
      : null,
  }
}
