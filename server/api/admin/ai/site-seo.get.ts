import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'
import { SITE_SEO_PAGES } from '../../../../utils/site-seo-pages'
import { expireStaleSiteSeoAudits } from '../../../utils/ai/site-seo-audit'
import { isMissingSiteSeoTableError, loadSiteSeoConfig } from '../../../utils/ai/site-seo-config'
import { SITE_SEO_PROPOSAL_KIND_LABELS } from '../../../utils/ai/site-seo-types'

/** Overview for the site-wide SEO admin page: latest audit, proposal counts, live overrides. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const registry = SITE_SEO_PAGES.map((page) => ({
    key: page.key,
    label: page.label,
    route: page.route,
    scale: page.scale,
    vars: page.vars,
    supports: page.supports,
  }))

  try {
    await expireStaleSiteSeoAudits()
    const [latestAudit, recentAudits, counts, config] = await Promise.all([
      prisma.siteSeoAudit.findFirst({ orderBy: { startedAt: 'desc' } }),
      prisma.siteSeoAudit.findMany({
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: { id: true, status: true, score: true, focus: true, proposalCount: true, startedAt: true, finishedAt: true, error: true },
      }),
      prisma.siteSeoProposal.groupBy({ by: ['status'], _count: { _all: true } }),
      loadSiteSeoConfig(),
    ])

    const proposalCounts: Record<string, number> = {}
    for (const row of counts) proposalCounts[row.status] = row._count._all

    return {
      migrationReady: true,
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      latestAudit: latestAudit
        ? { ...latestAudit, inventory: undefined }
        : null,
      recentAudits,
      proposalCounts,
      config: { pages: config.pages, settings: config.settings },
      registry,
      kindLabels: SITE_SEO_PROPOSAL_KIND_LABELS,
    }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    return {
      migrationReady: false,
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      latestAudit: null,
      recentAudits: [],
      proposalCounts: {},
      config: { pages: {}, settings: { includeKeywords: [], excludeKeywords: [], titleSuffix: null } },
      registry,
      kindLabels: SITE_SEO_PROPOSAL_KIND_LABELS,
    }
  }
})
