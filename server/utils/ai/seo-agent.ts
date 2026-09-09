import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { generateJsonWithOpenAI } from './openai'
import { seoExpertPrompt } from './seo-expert-prompt'
import type { PubSeoData, SavedSeoChanges, SeoAnalysis, SeoChanges } from './seo-types'

const MAX_BATCH_LIMIT = 500
/** Netlify background functions stop after ~15 minutes; treat leftover running rows as dead after this. */
export const SEO_AGENT_STALE_RUN_MS = 20 * 60 * 1000

function isMissingSeoRecommendationTableError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    message.includes('venue_seo_recommendations') ||
    message.includes('VenueSeoRecommendation')
  )
}

function cleanString(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function splitList(value: unknown): string[] {
  const text = cleanString(value)
  if (!text) return []
  return text
    .split(/[,;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function countImprovements(changes: SeoChanges): number {
  let total = 0
  if (changes.pageTitle) total += 1
  if (changes.metaDescription) total += 1
  if (changes.description) total += 1
  total += changes.seoKeywords?.length ?? 0
  total += changes.faqSuggestions?.length ?? 0
  total += changes.missingContentWarnings?.length ?? 0
  total += changes.topics?.length ?? 0
  return total
}

function fallbackAnalysis(data: PubSeoData): SeoAnalysis {
  const warnings = findMissingSeoContentFromData(data)
  const keywords = [
    data.name,
    `pub in ${data.town}`,
    data.county ? `${data.town} ${data.county} pub` : null,
    ...data.facilities.slice(0, 5),
  ].filter(Boolean) as string[]

  return {
    score: Math.max(20, 100 - warnings.length * 12),
    issues: warnings,
    opportunities: [
      'Add a concise, localised page title',
      'Use a search-focused meta description',
      'Add FAQs that match pub visitor intent',
    ],
    changes: {
      pageTitle: generateSeoTitleFromData(data),
      metaDescription: generateMetaDescriptionFromData(data),
      description: rewriteVenueDescriptionFromData(data),
      seoKeywords: keywords,
      faqSuggestions: suggestFaqsFromData(data),
      missingContentWarnings: warnings,
      topics: [`${data.town} pubs`, 'food and drink', 'opening times'],
      sourceNotes: ['Generated from existing UK Pubs listing data'],
    },
  }
}

export async function getPubSeoData(venueId: number): Promise<PubSeoData> {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      profile: true,
      claim: true,
    },
  })

  if (!venue) throw new Error(`Venue ${venueId} was not found`)

  const nearby = await prisma.venue.findMany({
    where: {
      id: { not: venue.id },
      town: venue.town,
      is_live: venue.is_live,
    },
    select: { venuename: true, town: true },
    take: 8,
    orderBy: { venuename: 'asc' },
  })

  const profileImages = Array.isArray(venue.profile?.headerImageUrls)
    ? venue.profile?.headerImageUrls.map(String)
    : []

  return {
    venueId: venue.id,
    name: venue.venuename,
    venueType: venue.venuetype,
    address: [venue.address, venue.address2].map(cleanString).filter(Boolean).join(', '),
    town: venue.town,
    county: venue.county,
    postcode: venue.postcode,
    location: [venue.town, venue.county, venue.postcode].map(cleanString).filter(Boolean).join(', '),
    description: cleanString(venue.profile?.customDescription) || cleanString(venue.description),
    facilities: splitList(venue.features),
    openingHours: null,
    images: [venue.photo, venue.profile?.headerImageUrl, ...profileImages].map(cleanString).filter(Boolean) as string[],
    pageTitle: cleanString(venue.profile?.pageTitle),
    metaDescription: cleanString(venue.profile?.metaDescription),
    seoKeywords: splitList(venue.profile?.seoKeywords),
    website: cleanString(venue.website),
    nearbyAreas: [venue.town, venue.county].map(cleanString).filter(Boolean) as string[],
    nearbyLandmarks: nearby.map((item) => `${item.venuename}, ${item.town}`),
    isClaimed: venue.claim?.status === 'verified',
  }
}

export function findMissingSeoContentFromData(data: PubSeoData): string[] {
  const warnings: string[] = []
  if (!data.description || data.description.length < 160) warnings.push('Pub description is missing or too short')
  if (!data.pageTitle) warnings.push('SEO page title is missing')
  if (!data.metaDescription) warnings.push('Meta description is missing')
  if (data.facilities.length === 0) warnings.push('Facilities/features are missing')
  if (!data.openingHours) warnings.push('Opening hours are missing')
  if (data.images.length === 0) warnings.push('Listing images are missing')
  if (data.seoKeywords.length === 0) warnings.push('SEO keywords are missing')
  return warnings
}

export async function analyseSeo(venueId: number): Promise<SeoAnalysis> {
  const data = await getPubSeoData(venueId)
  return generateJsonWithOpenAI<SeoAnalysis>({
    system: seoExpertPrompt(`
Analyse this UK pub listing and generate practical, owner-reviewable SEO improvements.

Assess every area that can reasonably be inferred from the supplied data, including title quality, meta description quality, local relevance, duplicate/thin content risk, internal-link opportunities, heading/HTML structure opportunities, canonicalisation, robots/indexability, structured data, Open Graph metadata, image alt text, crawlability, CTR opportunities and Nuxt SEO implementation considerations.

Keep page titles under 60 characters and meta descriptions under 155 characters. If web search is available, use the pub name and address only to verify missing factual amenities such as outdoor seating, dog friendliness, food, sport, accessibility or live music. Never invent facts. Put unverifiable gaps in missingContentWarnings and relevant evidence or caveats in sourceNotes.
`),
    user: { task: 'analyse_pub_seo', venue: data },
    fallback: fallbackAnalysis(data),
    webSearch: process.env.AI_SEO_ENABLE_WEB_SEARCH === 'true',
  })
}

export function generateSeoTitleFromData(data: PubSeoData): string {
  const place = data.town || data.county || 'UK'
  return `${data.name} | Pub in ${place}`.slice(0, 60)
}

export async function generateSeoTitle(venueId: number): Promise<string> {
  const data = await getPubSeoData(venueId)
  const result = await generateJsonWithOpenAI<{ pageTitle: string }>({
    system: seoExpertPrompt(`
Create exactly one SEO page title for this UK pub listing.
Keep it under 60 characters, naturally include the pub name and strongest useful local context, avoid keyword stuffing, avoid boilerplate where possible, and optimise for relevance and CTR without being misleading.
`),
    user: { task: 'generate_pub_page_title', venue: data },
    fallback: { pageTitle: generateSeoTitleFromData(data) },
  })
  return result.pageTitle
}

export function generateMetaDescriptionFromData(data: PubSeoData): string {
  const features = data.facilities.slice(0, 3).join(', ')
  const base = `Visit ${data.name}, a pub in ${data.location}.`
  const suffix = features ? ` Find details on ${features}, facilities and local information.` : ' Find facilities, location and local information.'
  return `${base}${suffix}`.slice(0, 155)
}

export async function generateMetaDescription(venueId: number): Promise<string> {
  const data = await getPubSeoData(venueId)
  const result = await generateJsonWithOpenAI<{ metaDescription: string }>({
    system: seoExpertPrompt(`
Create exactly one search-friendly meta description for this UK pub listing.
Keep it under 155 characters, make it specific and useful, use factual local context, improve likely search-result CTR without clickbait, and avoid repetitive programmatic wording or keyword stuffing.
`),
    user: { task: 'generate_pub_meta_description', venue: data },
    fallback: { metaDescription: generateMetaDescriptionFromData(data) },
  })
  return result.metaDescription
}

export function rewriteVenueDescriptionFromData(data: PubSeoData): string {
  const source = data.description || `${data.name} is a pub in ${data.location}.`
  const features = data.facilities.length ? ` Facilities include ${data.facilities.slice(0, 8).join(', ')}.` : ''
  return `${source.replace(/\s+/g, ' ').trim()}${features}`.slice(0, 1200)
}

export async function rewriteVenueDescription(venueId: number): Promise<string> {
  const data = await getPubSeoData(venueId)
  const result = await generateJsonWithOpenAI<{ description: string }>({
    system: seoExpertPrompt(`
Rewrite this UK pub listing description to be factual, locally useful, naturally written and suitable for a large-scale directory.
Avoid invented claims, keyword stuffing, generic filler and near-duplicate programmatic wording. Use supplied facts only. Prefer genuinely helpful detail for visitors and natural British English.
`),
    user: { task: 'rewrite_pub_description', venue: data },
    fallback: { description: rewriteVenueDescriptionFromData(data) },
  })
  return result.description
}

export function suggestFaqsFromData(data: PubSeoData): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Where is ${data.name}?`,
      answer: `${data.name} is in ${data.location}.`,
    },
    {
      question: `What facilities does ${data.name} have?`,
      answer: data.facilities.length
        ? `${data.name} lists facilities including ${data.facilities.slice(0, 6).join(', ')}.`
        : 'Facilities have not yet been added to this listing.',
    },
    {
      question: `Is ${data.name} near other pubs?`,
      answer: data.nearbyLandmarks.length
        ? `Other nearby listings include ${data.nearbyLandmarks.slice(0, 3).join(', ')}.`
        : `${data.name} is listed in ${data.town}.`,
    },
  ]
}

export async function suggestFaqs(venueId: number): Promise<Array<{ question: string; answer: string }>> {
  const data = await getPubSeoData(venueId)
  const result = await generateJsonWithOpenAI<{ faqs: Array<{ question: string; answer: string }> }>({
    system: seoExpertPrompt(`
Suggest 3 to 6 useful FAQs for this UK pub listing based only on supplied facts.
Prioritise real visitor intent such as location, facilities and other supported practical information. Do not manufacture FAQ content merely for SEO, do not invent answers, and avoid repetitive questions that would create thin or duplicate content across the directory.
`),
    user: { task: 'suggest_pub_faqs', venue: data },
    fallback: { faqs: suggestFaqsFromData(data) },
  })
  return result.faqs
}

export async function findMissingSeoContent(venueId: number): Promise<string[]> {
  return findMissingSeoContentFromData(await getPubSeoData(venueId))
}

export async function saveSeoChanges(venueId: number, changes: SeoChanges): Promise<SavedSeoChanges> {
  const data = await getPubSeoData(venueId)
  const improvementCount = countImprovements(changes)
  const status = data.isClaimed ? 'pending' : 'applied'

  let recommendation
  try {
    recommendation = await prisma.venueSeoRecommendation.create({
      data: {
        venueId,
        status,
        improvementCount,
        analysis: {
          generatedFor: data.name,
          generatedAt: new Date().toISOString(),
        },
        changes: changes as any,
        warnings: changes.missingContentWarnings || [],
        sources: changes.sourceNotes || [],
        appliedAt: status === 'applied' ? new Date() : null,
      },
    })
  } catch (error) {
    if (!isMissingSeoRecommendationTableError(error)) throw error
    throw createError({
      statusCode: 503,
      statusMessage: 'AI SEO database migration has not been applied yet',
    })
  }

  if (status === 'applied') {
    await prisma.venueProfile.upsert({
      where: { venueId },
      create: {
        venueId,
        pageTitle: changes.pageTitle?.slice(0, 100) || null,
        metaDescription: changes.metaDescription?.slice(0, 500) || null,
        customDescription: changes.description?.slice(0, 5000) || null,
        seoKeywords: changes.seoKeywords?.join(', ').slice(0, 500) || null,
      },
      update: {
        pageTitle: changes.pageTitle?.slice(0, 100) || undefined,
        metaDescription: changes.metaDescription?.slice(0, 500) || undefined,
        customDescription: changes.description?.slice(0, 5000) || undefined,
        seoKeywords: changes.seoKeywords?.join(', ').slice(0, 500) || undefined,
      },
    })
  }

  return {
    venueId,
    status,
    recommendationId: recommendation.id,
    improvementCount,
  }
}

export async function approveSeoRecommendation(venueId: number, recommendationId: string): Promise<SavedSeoChanges> {
  const recommendation = await prisma.venueSeoRecommendation.findFirst({
    where: { id: recommendationId, venueId, status: 'pending' },
  })
  if (!recommendation) throw new Error('Pending SEO recommendation was not found')

  const changes = recommendation.changes as SeoChanges
  await prisma.venueProfile.upsert({
    where: { venueId },
    create: {
      venueId,
      pageTitle: changes.pageTitle?.slice(0, 100) || null,
      metaDescription: changes.metaDescription?.slice(0, 500) || null,
      customDescription: changes.description?.slice(0, 5000) || null,
      seoKeywords: changes.seoKeywords?.join(', ').slice(0, 500) || null,
    },
    update: {
      pageTitle: changes.pageTitle?.slice(0, 100) || undefined,
      metaDescription: changes.metaDescription?.slice(0, 500) || undefined,
      customDescription: changes.description?.slice(0, 5000) || undefined,
      seoKeywords: changes.seoKeywords?.join(', ').slice(0, 500) || undefined,
    },
  })

  await prisma.venueSeoRecommendation.update({
    where: { id: recommendation.id },
    data: { status: 'applied', reviewedAt: new Date(), appliedAt: new Date() },
  })

  return {
    venueId,
    status: 'applied',
    recommendationId,
    improvementCount: recommendation.improvementCount,
  }
}

export async function runSeoForVenue(venueId: number): Promise<SavedSeoChanges> {
  const analysis = await analyseSeo(venueId)
  return saveSeoChanges(venueId, analysis.changes)
}

export async function getPendingSeoImprovementCount(venueId: number): Promise<number> {
  const aggregate = await prisma.venueSeoRecommendation.aggregate({
    where: { venueId, status: 'pending' },
    _sum: { improvementCount: true },
  })
  return aggregate._sum.improvementCount || 0
}

/** Live listings with thin, missing, or fallback SEO — processed or not. */
const venuesNeedingSeoFromSql = Prisma.sql`
  FROM "Venue" v
  LEFT JOIN venue_profiles p ON p.venue_id = v.id
  LEFT JOIN LATERAL (
    SELECT r.generated_at, r.sources
    FROM venue_seo_recommendations r
    WHERE r.venue_id = v.id
    ORDER BY r.generated_at DESC
    LIMIT 1
  ) latest ON true
  WHERE v.is_live = '1'
    AND NOT EXISTS (
      SELECT 1
      FROM venue_seo_recommendations pending
      WHERE pending.venue_id = v.id
        AND pending.status = 'pending'
    )
    AND (
      p.venue_id IS NULL
      OR NULLIF(BTRIM(COALESCE(p.page_title, '')), '') IS NULL
      OR length(BTRIM(p.page_title)) < 15
      OR NULLIF(BTRIM(COALESCE(p.meta_description, '')), '') IS NULL
      OR length(BTRIM(p.meta_description)) < 70
      OR NULLIF(BTRIM(COALESCE(p.seo_keywords, '')), '') IS NULL
      OR length(BTRIM(COALESCE(p.custom_description, v.description, ''))) < 160
      OR COALESCE(latest.sources::text, '') LIKE '%Generated from existing UK Pubs listing data%'
    )
    AND (latest.generated_at IS NULL OR latest.generated_at < NOW() - INTERVAL '12 hours')
`

export async function countVenuesNeedingSeoImprovement(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    ${venuesNeedingSeoFromSql}
  `
  return rows[0]?.count || 0
}

export async function findVenuesNeedingSeoImprovement(limit: number): Promise<Array<{ id: number }>> {
  const requestedLimit = Math.min(Math.max(1, limit), MAX_BATCH_LIMIT)
  return prisma.$queryRaw<Array<{ id: number }>>`
    SELECT v.id
    ${venuesNeedingSeoFromSql}
    ORDER BY latest.generated_at ASC NULLS FIRST, v.updated_at ASC, v.id ASC
    LIMIT ${requestedLimit}
  `
}

export async function expireStaleSeoRuns(now = new Date()) {
  const cutoff = new Date(now.getTime() - SEO_AGENT_STALE_RUN_MS)
  const staleWhere = {
    status: 'running',
    startedAt: { lt: cutoff },
  } as const

  const [completed, completedWithErrors, failed] = await Promise.all([
    prisma.aiSeoRun.updateMany({
      where: { ...staleWhere, processedCount: { gt: 0 }, errorCount: 0 },
      data: { status: 'completed', finishedAt: now },
    }),
    prisma.aiSeoRun.updateMany({
      where: { ...staleWhere, processedCount: { gt: 0 }, errorCount: { gt: 0 } },
      data: { status: 'completed_with_errors', finishedAt: now },
    }),
    prisma.aiSeoRun.updateMany({
      where: { ...staleWhere, processedCount: 0 },
      data: {
        status: 'failed',
        finishedAt: now,
        error: { message: 'Run stopped without finishing (worker timeout).' },
      },
    }),
  ])

  return completed.count + completedWithErrors.count + failed.count
}

export async function runDailySeoAgent(limit = MAX_BATCH_LIMIT) {
  const requestedLimit = Math.min(Math.max(1, limit), MAX_BATCH_LIMIT)
  const concurrency = Math.min(
    Math.max(1, Number.parseInt(process.env.AI_SEO_BATCH_CONCURRENCY || '2', 10) || 2),
    5,
  )
  await expireStaleSeoRuns()
  const run = await prisma.aiSeoRun.create({
    data: { requestedLimit },
  })

  let processedCount = 0
  let appliedCount = 0
  let draftedCount = 0
  let errorCount = 0
  let persistChain = Promise.resolve()

  function persistProgress(extra: { status?: string; finishedAt?: Date; error?: { message: string } } = {}) {
    persistChain = persistChain
      .then(() =>
        prisma.aiSeoRun.update({
          where: { id: run.id },
          data: {
            processedCount,
            appliedCount,
            draftedCount,
            errorCount,
            ...extra,
          },
        }),
      )
      .catch((error) => {
        console.warn('[seo-agent] failed to persist run progress', run.id, (error as Error).message)
      })
    return persistChain
  }

  try {
    const venues = await findVenuesNeedingSeoImprovement(requestedLimit)
    await persistProgress()

    let nextIndex = 0
    async function worker() {
      const venue = venues[nextIndex]
      nextIndex += 1
      if (!venue) return
      try {
        const result = await runSeoForVenue(venue.id)
        processedCount += 1
        if (result.status === 'applied') appliedCount += 1
        if (result.status === 'pending') draftedCount += 1
      } catch (error) {
        errorCount += 1
        console.warn('[seo-agent] venue failed', venue.id, (error as Error).message)
      }
      void persistProgress()
      await worker()
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, venues.length) }, () => worker()))
    await persistProgress()

    return prisma.aiSeoRun.update({
      where: { id: run.id },
      data: {
        status: errorCount > 0 ? 'completed_with_errors' : 'completed',
        processedCount,
        appliedCount,
        draftedCount,
        errorCount,
        finishedAt: new Date(),
      },
    })
  } catch (error) {
    await persistProgress({
      status: 'failed',
      error: { message: (error as Error).message },
      finishedAt: new Date(),
    })
    throw error
  }
}
