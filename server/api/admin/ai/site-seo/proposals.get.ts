import { prisma } from '../../../../utils/prisma'
import { requireAdmin } from '../../../../utils/require-admin'
import { isMissingSiteSeoTableError } from '../../../../utils/ai/site-seo-config'

const STATUSES = ['pending', 'applied', 'acknowledged', 'rejected', 'reverted'] as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const status = String(query.status || 'pending').trim().toLowerCase()
  const auditId = String(query.auditId || '').trim()
  const kind = String(query.kind || '').trim()
  const take = Math.min(100, Math.max(1, Number.parseInt(String(query.take || '50'), 10) || 50))
  const skip = Math.max(0, Number.parseInt(String(query.skip || '0'), 10) || 0)

  const where: Record<string, unknown> = {}
  if (status !== 'all' && (STATUSES as readonly string[]).includes(status)) where.status = status
  if (auditId) where.auditId = auditId
  if (kind) where.kind = kind

  try {
    const [items, total] = await Promise.all([
      prisma.siteSeoProposal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
        include: { audit: { select: { id: true, startedAt: true, focus: true, score: true } } },
      }),
      prisma.siteSeoProposal.count({ where }),
    ])
    return { items, total, skip, take, migrationReady: true }
  } catch (error) {
    if (!isMissingSiteSeoTableError(error)) throw error
    return { items: [], total: 0, skip, take, migrationReady: false }
  }
})
