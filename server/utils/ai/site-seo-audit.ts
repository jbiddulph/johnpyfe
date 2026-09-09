import { prisma } from '../prisma'
import { generateJsonWithOpenAI } from './openai'
import { seoExpertPrompt } from './seo-expert-prompt'
import {
  SITE_SEO_PROPOSAL_KINDS,
  type SiteSeoAuditResult,
  type SiteSeoFinding,
  type SiteSeoInventory,
  type SiteSeoProposalDraft,
  type SiteSeoProposalKind,
} from './site-seo-types'
import {
  deleteSiteSeoPageConfig,
  getSiteSeoPageConfig,
  loadSiteSeoConfig,
  writeSiteSeoPageConfig,
  writeSiteSeoSettings,
} from './site-seo-config'
import {
  SITE_SEO_PAGES,
  SITE_SEO_STATIC_DEFAULTS,
  isSiteSeoPageKey,
  renderSeoTemplate,
  siteSeoPageDefinition,
  splitKeywords,
  type SiteSeoPageConfigFields,
  type SiteSeoPageKey,
  type SiteSeoSettings,
} from '../../../utils/site-seo-pages'
import {
  SITE_BRAND,
  countySeoDescription,
  countySeoHeadline,
  countySeoKeywords,
  townSeoDescription,
  townSeoHeadline,
  townSeoKeywords,
  venueImageAlt,
  venueSeoDescription,
  venueSeoHeadline,
  venueSeoKeywords,
} from '../../../utils/site-seo-copy'
import { formatPlaceName, slugifyPlace } from '../../../utils/format-venue'
import { resolveSiteUrl } from '../../../utils/site-url'

/** Audits that have not written progress in this window are treated as dead. */
export const SITE_SEO_AUDIT_STALE_MS = 20 * 60 * 1000
const SITE_SEO_AUDIT_TIMEOUT_MS_DEFAULT = 150_000
const MAX_PROPOSALS = 40

function auditTimeoutMs() {
  const configured = Number.parseInt(process.env.OPENAI_SITE_SEO_TIMEOUT_MS || '', 10)
  return Number.isFinite(configured) && configured > 0 ? configured : SITE_SEO_AUDIT_TIMEOUT_MS_DEFAULT
}

function clean(value: unknown, max = 5000): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

type VenueSample = { id: number; venuename: string; slug: string; town: string; county: string; postcode: string; venuetype: string }

function renderCurrent(
  key: SiteSeoPageKey,
  current: SiteSeoPageConfigFields,
  defaults: { title: string; description: string; keywords: string },
  vars: Record<string, unknown>,
) {
  return {
    title: current.titleTemplate ? renderSeoTemplate(current.titleTemplate, vars) || defaults.title : defaults.title,
    description: current.descriptionTemplate
      ? renderSeoTemplate(current.descriptionTemplate, vars) || defaults.description
      : defaults.description,
    keywords: current.keywords ? renderSeoTemplate(current.keywords, vars) || defaults.keywords : defaults.keywords,
    vars,
  }
}

export async function buildSiteSeoInventory(): Promise<SiteSeoInventory> {
  const config = await loadSiteSeoConfig()
  const siteUrl = resolveSiteUrl()

  const [venueStats] = await prisma.$queryRaw<
    Array<{
      total: number
      without_photo: number
      thin_description: number
      without_features: number
      without_website: number
      towns: number
      counties: number
    }>
  >`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN NULLIF(BTRIM(COALESCE(photo, '')), '') IS NULL THEN 1 ELSE 0 END)::int AS without_photo,
      SUM(CASE WHEN length(BTRIM(COALESCE(description, ''))) < 160 THEN 1 ELSE 0 END)::int AS thin_description,
      SUM(CASE WHEN NULLIF(BTRIM(COALESCE(features, '')), '') IS NULL THEN 1 ELSE 0 END)::int AS without_features,
      SUM(CASE WHEN NULLIF(BTRIM(COALESCE(website, '')), '') IS NULL THEN 1 ELSE 0 END)::int AS without_website,
      COUNT(DISTINCT lower(BTRIM(town)))::int AS towns,
      COUNT(DISTINCT lower(BTRIM(county)))::int AS counties
    FROM "Venue"
    WHERE is_live = '1'
  `

  const [
    upcomingEvents,
    newsArticles,
    stadiumPages,
    profilesWithSeo,
    pendingRecs,
    appliedRecs,
    newsWithoutImage,
    latestNews,
    recentNews,
    topTowns,
    topCounties,
    sampleVenues,
    sampleEvents,
  ] = await Promise.all([
    prisma.event.count({ where: { event_start: { gte: new Date() } } }).catch(() => 0),
    prisma.ukpubsNews.count().catch(() => 0),
    prisma.stadium.count().catch(() => 0),
    prisma.venueProfile.count({ where: { OR: [{ pageTitle: { not: null } }, { metaDescription: { not: null } }] } }).catch(() => 0),
    prisma.venueSeoRecommendation.count({ where: { status: 'pending' } }).catch(() => 0),
    prisma.venueSeoRecommendation.count({ where: { status: 'applied' } }).catch(() => 0),
    prisma.ukpubsNews.count({ where: { imageUrl: null } }).catch(() => 0),
    prisma.ukpubsNews.findFirst({ orderBy: { publishedAt: 'desc' }, select: { publishedAt: true } }).catch(() => null),
    prisma.ukpubsNews
      .findMany({
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: { slug: true, title: true, excerpt: true, publishedAt: true, imageUrl: true },
      })
      .catch(() => []),
    prisma.$queryRaw<Array<{ town: string; county: string; count: number }>>`
      SELECT town, MIN(county) AS county, COUNT(*)::int AS count
      FROM "Venue"
      WHERE is_live = '1' AND NULLIF(BTRIM(town), '') IS NOT NULL
      GROUP BY town
      ORDER BY count DESC
      LIMIT 3
    `.catch(() => []),
    prisma.$queryRaw<Array<{ county: string; count: number; towns: number }>>`
      SELECT county, COUNT(*)::int AS count, COUNT(DISTINCT lower(BTRIM(town)))::int AS towns
      FROM "Venue"
      WHERE is_live = '1' AND NULLIF(BTRIM(county), '') IS NOT NULL
      GROUP BY county
      ORDER BY count DESC
      LIMIT 3
    `.catch(() => []),
    prisma.venue
      .findMany({
        where: { is_live: '1' },
        select: { id: true, venuename: true, slug: true, town: true, county: true, postcode: true, venuetype: true },
        orderBy: { updated_at: 'desc' },
        take: 3,
      })
      .catch(() => [] as VenueSample[]),
    prisma.event
      .findMany({
        where: { event_start: { gte: new Date() } },
        orderBy: { event_start: 'asc' },
        take: 2,
        select: { id: true, event_title: true, event_start: true, listing: { select: { venuename: true, town: true } } },
      })
      .catch(() => [] as Array<{ id: number; event_title: string; event_start: Date; listing: { venuename: string; town: string } | null }>),
  ])

  const pages: SiteSeoInventory['pages'] = SITE_SEO_PAGES.map((page) => {
    const current = config.pages[page.key] ?? {}
    const examples: SiteSeoInventory['pages'][number]['examples'] = []
    const staticDefault = SITE_SEO_STATIC_DEFAULTS[page.key]

    if (staticDefault) {
      examples.push({
        url: `${siteUrl}${page.route}`,
        ...renderCurrent(page.key, current, { ...staticDefault, keywords: staticDefault.keywords ?? '' }, {}),
      })
    } else if (page.key === 'town') {
      for (const row of topTowns) {
        const town = formatPlaceName(row.town)
        const county = formatPlaceName(row.county)
        const vars = { town, county, venueCount: row.count }
        examples.push({
          url: `${siteUrl}/town/${slugifyPlace(row.town)}`,
          ...renderCurrent(
            page.key,
            current,
            { title: townSeoHeadline(town, county), description: townSeoDescription(town, county), keywords: townSeoKeywords(town, county) },
            vars,
          ),
        })
      }
    } else if (page.key === 'county') {
      for (const row of topCounties) {
        const county = formatPlaceName(row.county)
        const vars = { county, venueCount: row.count, townCount: row.towns }
        examples.push({
          url: `${siteUrl}/county/${slugifyPlace(row.county)}`,
          ...renderCurrent(
            page.key,
            current,
            { title: countySeoHeadline(county), description: countySeoDescription(county), keywords: countySeoKeywords(county) },
            vars,
          ),
        })
      }
    } else if (page.key === 'venue') {
      for (const venue of sampleVenues) {
        const vars = {
          venue: formatPlaceName(venue.venuename),
          town: formatPlaceName(venue.town),
          county: formatPlaceName(venue.county),
          postcode: clean(venue.postcode),
          venueType: clean(venue.venuetype),
        }
        examples.push({
          url: `${siteUrl}/venues/${venue.id}/${venue.slug}`,
          ...renderCurrent(
            page.key,
            current,
            {
              title: venueSeoHeadline(venue.venuename, venue.town),
              description: venueSeoDescription(venue.venuename, venue.town, venue.county),
              keywords: venueSeoKeywords(venue.venuename, venue.town, venue.county),
            },
            vars,
          ),
        })
      }
    } else if (page.key === 'event') {
      for (const item of sampleEvents) {
        const venue = item.listing?.venuename ?? ''
        const town = formatPlaceName(item.listing?.town)
        const date = item.event_start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        const vars = { event: item.event_title, venue, town, date }
        examples.push({
          url: `${siteUrl}/events/${item.id}`,
          ...renderCurrent(
            page.key,
            current,
            {
              title: `${item.event_title}${venue ? ` at ${venue}` : ''}`,
              description: `${item.event_title}${town ? ` in ${town}` : ''} — find pubs, gigs and events on UK Pubs.`,
              keywords: '',
            },
            vars,
          ),
        })
      }
    } else if (page.key === 'news-article') {
      for (const item of recentNews.slice(0, 2)) {
        const vars = { title: item.title, excerpt: item.excerpt }
        examples.push({
          url: `${siteUrl}/news/${item.slug}`,
          ...renderCurrent(page.key, current, { title: item.title, description: item.excerpt, keywords: '' }, vars),
        })
      }
    } else if (page.key === 'search') {
      const vars = { query: 'Brighton' }
      examples.push({
        url: `${siteUrl}/search?q=brighton`,
        ...renderCurrent(
          page.key,
          current,
          {
            title: 'Brighton',
            description: 'Search results for brighton. Find matching pubs, venues and places across the UK on UK Pubs.',
            keywords: 'Brighton, UK pubs, pubs, venues, search',
          },
          vars,
        ),
      })
    } else if (page.key === 'stadium') {
      const vars = { club: 'Arsenal', stadium: 'Emirates Stadium', radiusMiles: 1 }
      examples.push({
        url: `${siteUrl}/pubs-near-stadiums/arsenal`,
        ...renderCurrent(
          page.key,
          current,
          {
            title: 'Pubs near Arsenal — Emirates Stadium',
            description: 'Find pubs and venues within 1 mile of Emirates Stadium, home of Arsenal.',
            keywords: '',
          },
          vars,
        ),
      })
    }

    return {
      key: page.key,
      label: page.label,
      route: page.route,
      scale: page.scale,
      vars: page.vars,
      supports: page.supports,
      current,
      examples,
    }
  })

  const daysSinceLastNews = latestNews?.publishedAt
    ? Math.floor((Date.now() - latestNews.publishedAt.getTime()) / 86_400_000)
    : null

  const total = venueStats?.total ?? 0

  return {
    generatedAt: new Date().toISOString(),
    site: { url: siteUrl, brand: SITE_BRAND, titleSuffix: config.settings.titleSuffix || SITE_BRAND },
    counts: {
      liveVenues: total,
      towns: venueStats?.towns ?? 0,
      counties: venueStats?.counties ?? 0,
      upcomingEvents,
      newsArticles,
      stadiumPages,
    },
    quality: {
      venuesWithoutPhoto: venueStats?.without_photo ?? 0,
      venuesThinDescription: venueStats?.thin_description ?? 0,
      venuesWithoutFeatures: venueStats?.without_features ?? 0,
      venuesWithoutWebsite: venueStats?.without_website ?? 0,
      venueProfilesWithCustomSeo: profilesWithSeo,
      listingRecommendationsPending: pendingRecs,
      listingRecommendationsApplied: appliedRecs,
      newsWithoutImage,
      daysSinceLastNews,
    },
    pages,
    settings: config.settings,
    news: recentNews.map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      publishedAt: item.publishedAt.toISOString(),
      hasImage: Boolean(item.imageUrl),
    })),
    technical: {
      canonicalTags: true,
      robotsDisallow: ['/admin', '/login', '/register', '/auth'],
      sitemapChunks: true,
      isrRoutes: ['/', '/town/**', '/county/**', '/counties', '/search', '/venues/**', '/events/**', '/news/**', '/pubs-near-stadiums/**'],
      structuredData: ['WebPage', 'BreadcrumbList', 'BarOrPub', 'Event', 'NewsArticle', 'CollectionPage', 'AggregateRating'],
      openGraph: true,
      imageAltStrategy: `Venue photos default to "${venueImageAlt('The Crown', 'Brighton', 'East Sussex')}" style alt text; news images use "{title} — UK pub news".`,
    },
  }
}

// ---------------------------------------------------------------------------
// Prompt + fallback
// ---------------------------------------------------------------------------

function auditTaskInstructions(focus: string | null) {
  return `
You are auditing the WHOLE UKPubs.co.uk site rather than a single pub listing. You receive a site inventory: page types (with the placeholders each template supports and examples of what real URLs render today), content-quality counts, keyword settings, recent news and technical notes.

Work out the best overall SEO strategy for the site and return concrete, admin-reviewable proposals. Nothing you return is applied automatically — an admin approves each proposal (or a whole batch) first, so be bold but precise.

Return JSON with this exact shape:
{
  "score": <0-100 overall site SEO health>,
  "summary": "<3-6 sentence plain-English assessment and strategy>",
  "findings": [{ "area": "<titles|descriptions|content|internal-links|images|news|technical|keywords>", "severity": "high|medium|low|info", "detail": "<specific finding>" }],
  "proposals": [
    {
      "kind": "page_meta" | "content" | "link_titles" | "image_alt" | "keyword_strategy" | "news_refresh" | "manual",
      "target": "<page key from the inventory, or 'global' for keyword_strategy, or a news slug for news_refresh>",
      "title": "<short label for the admin>",
      "rationale": "<why this helps, referencing the inventory>",
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "after": { ...payload }
    }
  ]
}

Payload rules by kind:
- page_meta: { "titleTemplate": string, "descriptionTemplate": string, "keywords": string } — templates may use ONLY the placeholders listed in that page's "vars" wrapped in braces, e.g. "Pubs in {town}, {county} — beer gardens, live sport & events". Titles under 60 characters when rendered (the site appends " | ${SITE_BRAND}" automatically, so do not add the brand). Descriptions 120-155 characters. Keywords: comma-separated, 5-10 phrases. Omit a field to leave it unchanged.
- content: { "introText": string } — 1-3 sentences of fresh, factual intro copy for that page type (placeholders allowed). Must read naturally at scale; never invent facilities or facts.
- link_titles: { "linkTitleTemplate": string } — title attribute for links to that page type (only for pages whose "supports" includes linkTitle).
- image_alt: { "imageAltTemplate": string } — alt text template (only where "supports" includes imageAlt).
- keyword_strategy: { "includeKeywords": string[], "excludeKeywords": string[], "titleSuffix": string|null } — site-wide phrases to add to every keywords tag, phrases to strip everywhere, and an optional replacement for the " | ${SITE_BRAND}" title suffix.
- news_refresh: { "title": string, "excerpt": string } — a rewritten (spun) headline and standfirst for an existing article slug from the inventory that keeps the facts but improves clarity, freshness and search intent.
- manual: { "steps": string[] } — technical or structural work that needs a developer (schema, canonical, internal linking, robots, sitemap, performance). Use sparingly and be specific.

Prefer a mix: a few high-impact site-wide moves (e.g. rewriting the title and description strategy for the 40,000 pub pages, the town hubs and the county hubs), plus smaller fixes. Cover titles, descriptions, keyword inclusion/exclusion, link titles, image alt text, fresh intro content and news freshness where the inventory shows weaknesses. Every proposal must be self-contained and safe to approve on its own. Maximum ${MAX_PROPOSALS} proposals.
${focus ? `\nThe admin asked you to focus on: ${focus}\n` : ''}`
}

export function fallbackSiteSeoAudit(inventory: SiteSeoInventory, focus: string | null): SiteSeoAuditResult {
  const findings: SiteSeoFinding[] = []
  const proposals: SiteSeoProposalDraft[] = []
  const total = inventory.counts.liveVenues
  const q = inventory.quality
  const page = (key: SiteSeoPageKey) => inventory.pages.find((item) => item.key === key)

  const venuePage = page('venue')
  if (venuePage && !venuePage.current.titleTemplate) {
    findings.push({
      area: 'titles',
      severity: 'high',
      detail: `${total.toLocaleString()} pub pages share the same "{venue}, {town}" title pattern with no descriptive hook, so results look identical in search.`,
    })
    proposals.push({
      kind: 'page_meta',
      target: 'venue',
      title: 'Give every pub page a descriptive, local title and description',
      rationale: 'Pub pages are the bulk of the site. Adding the venue type and county to the title and a benefit-led description differentiates 40,000 near-identical results and improves CTR.',
      impact: 'high',
      effort: 'low',
      after: {
        titleTemplate: '{venue}, {town} — pub, events & opening info',
        descriptionTemplate:
          'Everything about {venue} in {town}, {county}: upcoming events, photos, facilities, reviews and how to find it. Plan a visit or add it to your pub crawl on UK Pubs.',
        keywords: '{venue}, {venue} {town}, pubs in {town}, {town} pubs, {county} pubs, pub events {town}',
      },
    })
  }

  const townPage = page('town')
  if (townPage && !townPage.current.titleTemplate) {
    findings.push({
      area: 'titles',
      severity: 'medium',
      detail: `${inventory.counts.towns.toLocaleString()} town hub pages use a generic "Pubs in {town}" title; adding the venue count and intent words should lift click-through.`,
    })
    proposals.push({
      kind: 'page_meta',
      target: 'town',
      title: 'Richer titles and descriptions for town hub pages',
      rationale: 'Town hubs target the highest-volume local queries ("pubs in X"). Mentioning the number of pubs and what visitors can do makes the snippet more compelling and more specific per town.',
      impact: 'high',
      effort: 'low',
      after: {
        titleTemplate: 'Pubs in {town}, {county}: {venueCount} pubs, bars & what’s on',
        descriptionTemplate:
          'Browse {venueCount} pubs and bars in {town}, {county}. See upcoming events, live sport and beer gardens, read reviews and plan a {town} pub crawl on UK Pubs.',
        keywords: 'pubs in {town}, {town} pubs, best pubs {town}, {town} bars, pub crawl {town}, {county} pubs',
      },
    })
  }
  if (townPage && !townPage.current.introText) {
    proposals.push({
      kind: 'content',
      target: 'town',
      title: 'Add fresh intro copy to every town page',
      rationale: 'Town hubs currently open with a bare heading and a list. A short factual intro gives search engines context and gives visitors a reason to stay.',
      impact: 'medium',
      effort: 'low',
      after: {
        introText:
          'Looking for a pub in {town}? We list {venueCount} pubs and bars across {town}, {county}, with upcoming events, photos and reviews for each one. Pick a pub below or build a {town} pub crawl on the map.',
      },
    })
  }

  const countyPage = page('county')
  if (countyPage && !countyPage.current.titleTemplate) {
    proposals.push({
      kind: 'page_meta',
      target: 'county',
      title: 'Richer titles and descriptions for county hub pages',
      rationale: 'County hubs are the main internal-link path to towns. Descriptive titles with the town and pub counts help them rank for "{county} pubs" queries and pass relevance down to town pages.',
      impact: 'medium',
      effort: 'low',
      after: {
        titleTemplate: 'Pubs in {county}: {venueCount} pubs across {townCount} towns',
        descriptionTemplate:
          'Explore {venueCount} pubs and bars across {townCount} towns in {county}. Browse by town, find events and live sport, and discover the best local pubs on UK Pubs.',
        keywords: 'pubs in {county}, {county} pubs, best pubs {county}, {county} bars, pub events {county}',
      },
    })
  }

  if (!inventory.settings.includeKeywords.length) {
    proposals.push({
      kind: 'keyword_strategy',
      target: 'global',
      title: 'Site-wide keyword inclusion and exclusion list',
      rationale: 'Keywords are legacy metadata, but a consistent set of core phrases keeps the tag tidy across page types, and removing thin generic terms like "bar" avoids noise.',
      impact: 'low',
      effort: 'low',
      after: {
        includeKeywords: ['UK pubs', 'pub finder', 'pubs near me'],
        excludeKeywords: ['bar', 'bars'],
        titleSuffix: null,
      },
    })
  }

  if (venuePage && !venuePage.current.linkTitleTemplate) {
    proposals.push({
      kind: 'link_titles',
      target: 'venue',
      title: 'Descriptive link titles on pub cards',
      rationale: 'Pub cards on town, county and search pages link with the bare pub name. A title attribute with the town gives extra context to assistive tech and crawlers.',
      impact: 'low',
      effort: 'low',
      after: { linkTitleTemplate: '{venue} — pub in {town}, {county}' },
    })
  }

  if (venuePage && !venuePage.current.imageAltTemplate) {
    findings.push({
      area: 'images',
      severity: 'medium',
      detail: `${pct(q.venuesWithoutPhoto, total)}% of live pubs have no photo, and card images use a fixed alt pattern that does not mention the venue type.`,
    })
    proposals.push({
      kind: 'image_alt',
      target: 'venue',
      title: 'More descriptive alt text on pub card images',
      rationale: 'Alt text is the main image-SEO signal. Including the venue type and county makes each image description unique and useful.',
      impact: 'low',
      effort: 'low',
      after: { imageAltTemplate: 'Exterior of {venue}, a {venueType} in {town}, {county}' },
    })
  }

  if (q.venuesThinDescription > 0) {
    findings.push({
      area: 'content',
      severity: 'high',
      detail: `${pct(q.venuesThinDescription, total)}% of pub pages have descriptions under 160 characters — thin content at scale. The listing SEO agent is working through these (${q.listingRecommendationsApplied.toLocaleString()} applied, ${q.listingRecommendationsPending.toLocaleString()} awaiting owner review).`,
    })
  }

  if (q.daysSinceLastNews !== null && q.daysSinceLastNews > 14) {
    findings.push({
      area: 'news',
      severity: 'medium',
      detail: `The newest article is ${q.daysSinceLastNews} days old. Regular news keeps the homepage fresh and earns crawl frequency.`,
    })
  }
  for (const article of inventory.news.slice(0, 2)) {
    if (article.title.length > 70) {
      proposals.push({
        kind: 'news_refresh',
        target: article.slug,
        title: `Tighten headline: “${article.title.slice(0, 60)}…”`,
        rationale: 'Headlines over ~65 characters are truncated in search results. A shorter, front-loaded headline keeps the key facts visible.',
        impact: 'low',
        effort: 'low',
        after: { title: article.title.slice(0, 64).replace(/[\s,;:–—-]+$/, ''), excerpt: article.excerpt },
      })
    }
  }

  findings.push({
    area: 'technical',
    severity: 'info',
    detail: 'Canonical tags, Open Graph, chunked sitemaps, robots rules and BarOrPub / Event / NewsArticle structured data are already in place.',
  })
  proposals.push({
    kind: 'manual',
    target: 'venue',
    title: 'Add FAQ and Review structured data to pub pages',
    rationale: 'Pub pages already emit BarOrPub schema. FAQPage (from the listing agent’s FAQ suggestions) and Review markup for approved reviews can earn rich results.',
    impact: 'medium',
    effort: 'medium',
    after: {
      steps: [
        'Emit FAQPage JSON-LD on pub pages when approved FAQ suggestions exist.',
        'Emit Review JSON-LD alongside the existing AggregateRating for published reviews.',
        'Validate with the Rich Results Test on a sample of town and pub URLs.',
      ],
    },
  })

  const score = Math.max(
    25,
    Math.min(90, 80 - (venuePage?.current.titleTemplate ? 0 : 15) - Math.round(pct(q.venuesThinDescription, total) / 5)),
  )

  return {
    score,
    summary: `Rule-based audit${focus ? ` (focus: ${focus})` : ''}: the site has solid technical foundations, but its ${total.toLocaleString()} pub pages and ${inventory.counts.towns.toLocaleString()} town hubs still rely on generic templated titles and thin copy. The biggest wins are a descriptive site-wide title/description strategy, fresh intro copy on hub pages and more specific link/alt text. Enable OPENAI_API_KEY for a full AI-written strategy.`,
    findings,
    proposals,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g

function stripUnsupportedPlaceholders(template: string, allowed: string[]) {
  return template.replace(PLACEHOLDER_RE, (match, key: string) => (allowed.includes(key) ? match : ''))
}

function normaliseProposal(raw: any, inventory: SiteSeoInventory): SiteSeoProposalDraft | null {
  const kind = String(raw?.kind ?? '').trim() as SiteSeoProposalKind
  if (!SITE_SEO_PROPOSAL_KINDS.includes(kind)) return null
  const target = clean(raw?.target, 200)
  const title = clean(raw?.title, 300) || 'SEO proposal'
  const rationale = clean(raw?.rationale, 4000) || 'Suggested by the SEO agent.'
  const impact = (['high', 'medium', 'low'] as const).includes(raw?.impact) ? raw.impact : 'medium'
  const effort = (['low', 'medium', 'high'] as const).includes(raw?.effort) ? raw.effort : 'low'
  const afterRaw = typeof raw?.after === 'object' && raw?.after !== null ? raw.after : {}
  const after: Record<string, unknown> = {}

  if (kind === 'keyword_strategy') {
    after.includeKeywords = splitKeywords(afterRaw.includeKeywords).slice(0, 20)
    after.excludeKeywords = splitKeywords(afterRaw.excludeKeywords).slice(0, 20)
    after.titleSuffix = clean(afterRaw.titleSuffix, 40) || null
    if (!(after.includeKeywords as string[]).length && !(after.excludeKeywords as string[]).length && !after.titleSuffix) return null
    return { kind, target: 'global', title, rationale, impact, effort, after }
  }

  if (kind === 'news_refresh') {
    if (!inventory.news.some((item) => item.slug === target)) return null
    const newTitle = clean(afterRaw.title, 300)
    const excerpt = clean(afterRaw.excerpt, 500)
    const content = typeof afterRaw.content === 'string' ? afterRaw.content.trim().slice(0, 20000) : ''
    if (newTitle) after.title = newTitle
    if (excerpt) after.excerpt = excerpt
    if (content) after.content = content
    if (!Object.keys(after).length) return null
    return { kind, target, title, rationale, impact, effort, after }
  }

  if (kind === 'manual') {
    const steps = Array.isArray(afterRaw.steps) ? afterRaw.steps.map((step: unknown) => clean(step, 500)).filter(Boolean).slice(0, 12) : []
    after.steps = steps.length ? steps : [rationale]
    if (afterRaw.notes) after.notes = clean(afterRaw.notes, 2000)
    return { kind, target: isSiteSeoPageKey(target) ? target : 'global', title, rationale, impact, effort, after }
  }

  if (!isSiteSeoPageKey(target)) return null
  const definition = siteSeoPageDefinition(target)
  if (!definition) return null
  const allowedVars = definition.vars

  const template = (value: unknown, max: number) => {
    const text = clean(value, max)
    return text ? stripUnsupportedPlaceholders(text, allowedVars).replace(/\s{2,}/g, ' ').trim() : ''
  }

  if (kind === 'page_meta') {
    const titleTemplate = template(afterRaw.titleTemplate, 200)
    const descriptionTemplate = template(afterRaw.descriptionTemplate, 500)
    const keywords = template(afterRaw.keywords, 500)
    if (titleTemplate && definition.supports.includes('title')) after.titleTemplate = titleTemplate
    if (descriptionTemplate && definition.supports.includes('description')) after.descriptionTemplate = descriptionTemplate
    if (keywords && definition.supports.includes('keywords')) after.keywords = keywords
  } else if (kind === 'content') {
    const introText = clean(afterRaw.introText, 2000)
    if (introText && definition.supports.includes('intro')) after.introText = stripUnsupportedPlaceholders(introText, allowedVars)
  } else if (kind === 'link_titles') {
    const linkTitleTemplate = template(afterRaw.linkTitleTemplate, 200)
    if (linkTitleTemplate && definition.supports.includes('linkTitle')) after.linkTitleTemplate = linkTitleTemplate
  } else if (kind === 'image_alt') {
    const imageAltTemplate = template(afterRaw.imageAltTemplate, 200)
    if (imageAltTemplate && definition.supports.includes('imageAlt')) after.imageAltTemplate = imageAltTemplate
  }

  if (!Object.keys(after).length) return null
  return { kind, target, title, rationale, impact, effort, after }
}

export function normaliseSiteSeoAuditResult(raw: any, inventory: SiteSeoInventory): SiteSeoAuditResult {
  const scoreRaw = Number(raw?.score)
  const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 50
  const summary = clean(raw?.summary, 4000) || 'The SEO agent completed a site-wide audit.'
  const findings: SiteSeoFinding[] = Array.isArray(raw?.findings)
    ? raw.findings
        .map((item: any) => ({
          area: clean(item?.area, 60) || 'general',
          severity: (['high', 'medium', 'low', 'info'] as const).includes(item?.severity) ? item.severity : 'info',
          detail: clean(item?.detail, 2000),
        }))
        .filter((item: SiteSeoFinding) => item.detail)
        .slice(0, 40)
    : []
  const proposals = (Array.isArray(raw?.proposals) ? raw.proposals : [])
    .map((item: unknown) => normaliseProposal(item, inventory))
    .filter((item: SiteSeoProposalDraft | null): item is SiteSeoProposalDraft => Boolean(item))
    .slice(0, MAX_PROPOSALS)
  return { score, summary, findings, proposals }
}

/** Snapshot of what a proposal would replace, so the admin sees before/after and can revert. */
export async function snapshotBeforeForProposal(proposal: SiteSeoProposalDraft): Promise<Record<string, unknown> | null> {
  if (proposal.kind === 'keyword_strategy') {
    const { settings } = await loadSiteSeoConfig()
    return { ...settings }
  }
  if (proposal.kind === 'news_refresh') {
    const article = await prisma.ukpubsNews.findUnique({
      where: { slug: proposal.target },
      select: { title: true, excerpt: true, content: true },
    })
    if (!article) return null
    const before: Record<string, unknown> = { title: article.title, excerpt: article.excerpt }
    if ('content' in proposal.after) before.content = article.content
    return before
  }
  if (proposal.kind === 'manual') return null
  if (!isSiteSeoPageKey(proposal.target)) return null
  const current = await getSiteSeoPageConfig(proposal.target)
  const before: Record<string, unknown> = {}
  for (const field of Object.keys(proposal.after)) {
    before[field] = (current as Record<string, unknown>)[field] ?? null
  }
  return before
}

// ---------------------------------------------------------------------------
// Running an audit
// ---------------------------------------------------------------------------

export async function expireStaleSiteSeoAudits(now = new Date()) {
  const cutoff = new Date(now.getTime() - SITE_SEO_AUDIT_STALE_MS)
  return prisma.siteSeoAudit.updateMany({
    where: { status: 'running', updatedAt: { lt: cutoff } },
    data: { status: 'failed', finishedAt: now, error: { message: 'Audit timed out before finishing.' } },
  })
}

export async function getRunningSiteSeoAudit() {
  await expireStaleSiteSeoAudits()
  return prisma.siteSeoAudit.findFirst({ where: { status: 'running' }, orderBy: { startedAt: 'desc' } })
}

export async function createSiteSeoAudit(focus: string | null) {
  return prisma.siteSeoAudit.create({ data: { focus: focus ? focus.slice(0, 2000) : null } })
}

/** Build the inventory, ask the model for a site-wide strategy and store proposals for review. */
export async function runSiteSeoAudit(auditId: string) {
  const audit = await prisma.siteSeoAudit.findUnique({ where: { id: auditId } })
  if (!audit) throw new Error(`Site SEO audit ${auditId} was not found`)
  if (audit.status !== 'running') return audit

  try {
    const inventory = await buildSiteSeoInventory()
    await prisma.siteSeoAudit.update({ where: { id: auditId }, data: { inventory: inventory as any } })

    const focus = audit.focus?.trim() || null
    const fallback = fallbackSiteSeoAudit(inventory, focus)
    const raw = await generateJsonWithOpenAI<SiteSeoAuditResult>({
      system: seoExpertPrompt(auditTaskInstructions(focus)),
      user: { task: 'site_wide_seo_audit', inventory },
      fallback,
      timeoutMs: auditTimeoutMs(),
      webSearch: process.env.AI_SEO_ENABLE_WEB_SEARCH === 'true',
    })
    const result = normaliseSiteSeoAuditResult(raw, inventory)
    if (!result.proposals.length) {
      result.proposals = fallback.proposals
      result.findings = result.findings.length ? result.findings : fallback.findings
    }

    for (const proposal of result.proposals) {
      const before = await snapshotBeforeForProposal(proposal)
      await prisma.siteSeoProposal.create({
        data: {
          auditId,
          kind: proposal.kind,
          target: proposal.target,
          title: proposal.title.slice(0, 300),
          rationale: proposal.rationale,
          impact: proposal.impact,
          effort: proposal.effort,
          before: before as any,
          after: proposal.after as any,
        },
      })
    }

    return prisma.siteSeoAudit.update({
      where: { id: auditId },
      data: {
        status: 'completed',
        score: result.score,
        summary: result.summary,
        findings: result.findings as any,
        proposalCount: result.proposals.length,
        finishedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[site-seo-audit] failed', auditId, (error as Error).message)
    return prisma.siteSeoAudit.update({
      where: { id: auditId },
      data: { status: 'failed', error: { message: (error as Error).message }, finishedAt: new Date() },
    })
  }
}

// ---------------------------------------------------------------------------
// Review: approve / reject / revert
// ---------------------------------------------------------------------------

function pageFieldsFromPayload(payload: Record<string, unknown>) {
  const fields: Partial<Record<keyof SiteSeoPageConfigFields, string | null>> = {}
  for (const key of ['titleTemplate', 'descriptionTemplate', 'keywords', 'introText', 'linkTitleTemplate', 'imageAltTemplate'] as const) {
    if (key in payload) {
      const value = payload[key]
      fields[key] = value === null || value === undefined ? null : String(value)
    }
  }
  return fields
}

async function writePayload(kind: SiteSeoProposalKind, target: string, payload: Record<string, unknown>) {
  if (kind === 'manual') return
  if (kind === 'keyword_strategy') {
    await writeSiteSeoSettings({
      includeKeywords: 'includeKeywords' in payload ? splitKeywords(payload.includeKeywords) : undefined,
      excludeKeywords: 'excludeKeywords' in payload ? splitKeywords(payload.excludeKeywords) : undefined,
      titleSuffix: 'titleSuffix' in payload ? (payload.titleSuffix ? String(payload.titleSuffix) : null) : undefined,
    } as Partial<Record<'includeKeywords' | 'excludeKeywords' | 'titleSuffix', unknown>>)
    return
  }
  if (kind === 'news_refresh') {
    const data: Record<string, string> = {}
    if (typeof payload.title === 'string' && payload.title.trim()) data.title = payload.title.trim().slice(0, 300)
    if (typeof payload.excerpt === 'string' && payload.excerpt.trim()) data.excerpt = payload.excerpt.trim().slice(0, 500)
    if (typeof payload.content === 'string' && payload.content.trim()) data.content = payload.content.trim()
    if (Object.keys(data).length) await prisma.ukpubsNews.update({ where: { slug: target }, data })
    return
  }
  if (!isSiteSeoPageKey(target)) throw new Error(`Unknown page key ${target}`)
  await writeSiteSeoPageConfig(target, pageFieldsFromPayload(payload))
}

/** Admin approved a proposal: apply its payload (optionally edited) and record it. */
export async function approveSiteSeoProposal(id: string, editedAfter?: Record<string, unknown> | null) {
  const proposal = await prisma.siteSeoProposal.findUnique({ where: { id } })
  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
  if (proposal.status !== 'pending') throw createError({ statusCode: 409, statusMessage: `Proposal is already ${proposal.status}` })

  const kind = proposal.kind as SiteSeoProposalKind
  let after = (proposal.after as Record<string, unknown>) ?? {}
  if (editedAfter && typeof editedAfter === 'object') {
    const inventory = { news: [{ slug: proposal.target, title: '', excerpt: '', publishedAt: '', hasImage: false }] } as SiteSeoInventory
    const normalised = normaliseProposal({ ...proposal, after: editedAfter }, inventory)
    if (!normalised) throw createError({ statusCode: 400, statusMessage: 'Edited proposal is not valid' })
    after = normalised.after
  }

  const before = await snapshotBeforeForProposal({ ...(proposal as any), kind, after })
  await writePayload(kind, proposal.target, after)

  const now = new Date()
  return prisma.siteSeoProposal.update({
    where: { id },
    data: {
      status: kind === 'manual' ? 'acknowledged' : 'applied',
      before: before as any,
      after: after as any,
      reviewedAt: now,
      appliedAt: kind === 'manual' ? null : now,
    },
  })
}

export async function rejectSiteSeoProposal(id: string) {
  const proposal = await prisma.siteSeoProposal.findUnique({ where: { id } })
  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
  if (proposal.status !== 'pending') throw createError({ statusCode: 409, statusMessage: `Proposal is already ${proposal.status}` })
  return prisma.siteSeoProposal.update({ where: { id }, data: { status: 'rejected', reviewedAt: new Date() } })
}

/** Undo an applied proposal by writing back its "before" snapshot. */
export async function revertSiteSeoProposal(id: string) {
  const proposal = await prisma.siteSeoProposal.findUnique({ where: { id } })
  if (!proposal) throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
  if (proposal.status !== 'applied') throw createError({ statusCode: 409, statusMessage: 'Only applied proposals can be reverted' })

  const kind = proposal.kind as SiteSeoProposalKind
  const before = (proposal.before as Record<string, unknown> | null) ?? {}
  if (kind === 'keyword_strategy') {
    await writeSiteSeoSettings({
      includeKeywords: splitKeywords(before.includeKeywords),
      excludeKeywords: splitKeywords(before.excludeKeywords),
      titleSuffix: before.titleSuffix ? String(before.titleSuffix) : null,
    })
  } else if (kind === 'news_refresh') {
    await writePayload(kind, proposal.target, before)
  } else if (isSiteSeoPageKey(proposal.target)) {
    const fields: Record<string, string | null> = {}
    for (const key of Object.keys(proposal.after as Record<string, unknown>)) {
      fields[key] = before[key] === undefined || before[key] === null ? null : String(before[key])
    }
    await writeSiteSeoPageConfig(proposal.target, fields)
  }

  return prisma.siteSeoProposal.update({ where: { id }, data: { status: 'reverted', reviewedAt: new Date() } })
}

export async function bulkReviewSiteSeoProposals(
  action: 'approve' | 'reject',
  filter: { ids?: string[]; auditId?: string },
) {
  const where: Record<string, unknown> = { status: 'pending' }
  if (filter.ids?.length) where.id = { in: filter.ids }
  if (filter.auditId) where.auditId = filter.auditId
  const proposals = await prisma.siteSeoProposal.findMany({ where, orderBy: { createdAt: 'asc' }, select: { id: true } })

  let done = 0
  const errors: Array<{ id: string; message: string }> = []
  for (const { id } of proposals) {
    try {
      if (action === 'approve') await approveSiteSeoProposal(id)
      else await rejectSiteSeoProposal(id)
      done += 1
    } catch (error) {
      errors.push({ id, message: (error as Error).message })
    }
  }
  return { action, done, errors }
}

export async function removeSiteSeoPageOverride(pageKey: SiteSeoPageKey) {
  await deleteSiteSeoPageConfig(pageKey)
}

export type { SiteSeoSettings }
