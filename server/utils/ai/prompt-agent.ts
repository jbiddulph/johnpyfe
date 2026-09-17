import type { AiPromptHistoryItem, AiPromptLink, AiPromptResponse } from '../../../types/ai-prompt'
import { AI_PROMPT_MAX_LENGTH } from '../../../types/ai-prompt'
import { isOpenAiConfigured, runOpenAIToolLoop } from './openai'
import { dedupePromptLinks, PROMPT_TOOL_DEFINITIONS, runPromptTool } from './prompt-tools'

const PROMPT_SYSTEM = `You are the UK Pubs assistant for ukpubs.co.uk, a directory of pubs, bars and venues across the United Kingdom.

Answer visitors in friendly British English. Keep answers short: a few sentences or a compact list of 3–6 places.

Private database functions run on the server when you call a tool. Use them whenever the question is about pubs, towns, counties, events, news, stadiums, amenities, or listings. Do not invent venues, events, opening hours, prices, or facilities.

Never mention SQL, Prisma, internal function names, or that tools exist. If a tool returns nothing, say so and suggest the map (/map), counties (/counties), or search.

Return plain text only. Related links are shown separately on the page, so name places rather than pasting long URLs.`

function clip(text: unknown, max = AI_PROMPT_MAX_LENGTH) {
  return String(text ?? '').trim().slice(0, max)
}

function buildUserMessage(prompt: string, history: AiPromptHistoryItem[]) {
  const recent = history.slice(-6).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: clip(item.content),
  }))
  if (!recent.length) return prompt
  return `${recent
    .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'Visitor'}: ${item.content}`)
    .join('\n')}\nVisitor: ${prompt}`
}

function fallbackAnswer(prompt: string, links: AiPromptLink[]) {
  if (!links.length) {
    return `I looked through the UK Pubs listings for “${prompt}” but did not find a close match. Try a town or pub name, or browse the map and county pages.`
  }
  const preview = links
    .slice(0, 6)
    .map((link) => `• ${link.title}${link.meta ? ` (${link.meta})` : ''}`)
    .join('\n')
  return `I looked through the UK Pubs listings for “${prompt}”. Here are the closest matches:\n\n${preview}`
}

async function catalogFallback(prompt: string): Promise<{ links: AiPromptLink[] }> {
  try {
    const [pubs, places, events] = await Promise.all([
      runPromptTool('search_pubs', { query: prompt, limit: 6 }),
      runPromptTool('search_places', { query: prompt }),
      runPromptTool('search_events', { query: prompt, limit: 4 }),
    ])
    return { links: dedupePromptLinks([...places.links, ...pubs.links, ...events.links]) }
  } catch (error) {
    console.warn('[ai-prompt] catalogue lookup failed', error)
    return { links: [] }
  }
}

export async function answerAiPrompt(options: {
  prompt: string
  history?: AiPromptHistoryItem[]
}): Promise<AiPromptResponse> {
  const prompt = clip(options.prompt)
  const history = (options.history || []).filter(
    (item) => item && (item.role === 'user' || item.role === 'assistant') && clip(item.content),
  )

  const collected: AiPromptLink[] = []
  const usedTools: string[] = []

  const execute = async (name: string, args: Record<string, unknown>) => {
    const result = await runPromptTool(name, args)
    collected.push(...result.links)
    return result.data
  }

  if (!isOpenAiConfigured()) {
    const fallback = await catalogFallback(prompt)
    return {
      prompt,
      answer: fallbackAnswer(prompt, fallback.links),
      links: fallback.links,
      usedTools: ['search_pubs', 'search_places', 'search_events'],
      fallback: true,
    }
  }

  try {
    const loop = await runOpenAIToolLoop({
      system: PROMPT_SYSTEM,
      user: buildUserMessage(prompt, history),
      tools: PROMPT_TOOL_DEFINITIONS,
      execute,
      maxRounds: 4,
      timeoutMs: Number.parseInt(process.env.OPENAI_PROMPT_TIMEOUT_MS || '20000', 10) || 20_000,
    })
    usedTools.push(...loop.usedTools)

    let links = dedupePromptLinks(collected)
    let answer = loop.text.trim()

    if (!answer) {
      if (!links.length) {
        const fallback = await catalogFallback(prompt)
        links = fallback.links
      }
      answer = fallbackAnswer(prompt, links)
      return { prompt, answer, links, usedTools, fallback: true }
    }

    if (!links.length) {
      const fallback = await catalogFallback(prompt)
      links = fallback.links
    }

    return { prompt, answer, links, usedTools, fallback: false }
  } catch (error) {
    console.warn('[ai-prompt] falling back to catalogue search', error)
    const fallback = await catalogFallback(prompt)
    return {
      prompt,
      answer: fallbackAnswer(prompt, fallback.links),
      links: fallback.links,
      usedTools,
      fallback: true,
    }
  }
}
