import type { SeoFieldDiff, SeoFieldSnapshot } from './seo-types'

export const SEO_DIFF_FIELDS: Array<{ field: keyof SeoFieldSnapshot; label: string }> = [
  { field: 'pageTitle', label: 'Page title' },
  { field: 'metaDescription', label: 'Meta description' },
  { field: 'description', label: 'Page description' },
  { field: 'seoKeywords', label: 'SEO keywords' },
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function keywordsToDisplay(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ')
  }
  return String(value || '').trim()
}

export function emptySeoSnapshot(): SeoFieldSnapshot {
  return {
    pageTitle: '',
    metaDescription: '',
    description: '',
    seoKeywords: '',
  }
}

export function snapshotFromSeoData(data: {
  pageTitle?: string | null
  metaDescription?: string | null
  description?: string | null
  seoKeywords?: string[] | string | null
}): SeoFieldSnapshot {
  return {
    pageTitle: String(data.pageTitle || '').trim(),
    metaDescription: String(data.metaDescription || '').trim(),
    description: String(data.description || '').trim(),
    seoKeywords: keywordsToDisplay(data.seoKeywords),
  }
}

export function snapshotFromChanges(changes: unknown): SeoFieldSnapshot {
  const rec = asRecord(changes)
  return snapshotFromSeoData({
    pageTitle: typeof rec.pageTitle === 'string' ? rec.pageTitle : '',
    metaDescription: typeof rec.metaDescription === 'string' ? rec.metaDescription : '',
    description: typeof rec.description === 'string' ? rec.description : '',
    seoKeywords: rec.seoKeywords as string[] | string | null,
  })
}

export function snapshotFromAnalysisPrevious(analysis: unknown): SeoFieldSnapshot | null {
  const previous = asRecord(analysis).previous
  if (!previous || typeof previous !== 'object') return null
  return snapshotFromChanges(previous)
}

export function runIdFromAnalysis(analysis: unknown): string | null {
  const runId = asRecord(analysis).runId
  return typeof runId === 'string' && runId.trim() ? runId.trim() : null
}

export function getSeoFieldDiffs(before: SeoFieldSnapshot, after: SeoFieldSnapshot): SeoFieldDiff[] {
  return SEO_DIFF_FIELDS.map(({ field, label }) => {
    const beforeValue = before[field] || ''
    const afterValue = after[field] || ''
    return {
      field,
      label,
      before: beforeValue,
      after: afterValue,
      changed: beforeValue !== afterValue,
    }
  })
}

export function faqSuggestionsFromChanges(changes: unknown): Array<{ question: string; answer: string }> {
  const rec = asRecord(changes)
  if (!Array.isArray(rec.faqSuggestions)) return []
  return rec.faqSuggestions
    .map((item) => {
      const faq = asRecord(item)
      const question = String(faq.question || '').trim()
      const answer = String(faq.answer || '').trim()
      return { question, answer }
    })
    .filter((item) => item.question || item.answer)
}

export function sourceNotesFromChanges(changes: unknown, sources: unknown): string[] {
  const fromChanges = asRecord(changes).sourceNotes
  if (Array.isArray(fromChanges)) return fromChanges.map((item) => String(item || '').trim()).filter(Boolean)
  if (Array.isArray(sources)) return sources.map((item) => String(item || '').trim()).filter(Boolean)
  return []
}
