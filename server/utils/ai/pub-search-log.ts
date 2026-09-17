import { prisma } from '../prisma'
import type { AiPubSearchFilters } from '../../../utils/ai-pub-search'

export type AiPubSearchStatus = 'ok' | 'empty' | 'fail' | 'rate_limited'

export async function recordAiPubSearch(entry: {
  query: string
  userId?: string | null
  visitorId?: string | null
  status: AiPubSearchStatus
  error?: string | null
  filters?: AiPubSearchFilters | null
  resultCount?: number
}) {
  try {
    await prisma.aiPubSearch.create({
      data: {
        query: entry.query.slice(0, 500),
        userId: entry.userId || null,
        visitorId: entry.visitorId || null,
        status: entry.status,
        error: entry.error ? entry.error.slice(0, 1000) : null,
        filters: entry.filters ? JSON.parse(JSON.stringify(entry.filters)) : undefined,
        resultCount: entry.resultCount ?? 0,
      },
    })
  } catch (error) {
    console.warn('[ai-pub-search] failed to record search:', error)
    if (entry.status === 'fail') {
      console.error('[ai-pub-search] failed search:', entry.query, entry.error)
    }
  }
}
