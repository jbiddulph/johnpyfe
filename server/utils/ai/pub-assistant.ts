import type { PubAssistantHistoryItem, PubAssistantReply } from '../../../types/pub-assistant'
import { isOpenAIConfigured, runOpenAIToolLoop } from './openai'
import { executePubAssistantTool, PUB_ASSISTANT_TOOLS } from './pub-assistant-tools'
import {
  collectAssistantLinks,
  normalisePubQuestion,
  parseVisitorCoordinate,
  PUB_ASSISTANT_HISTORY_LIMIT,
  PUB_ASSISTANT_QUESTION_MAX,
  PUB_ASSISTANT_QUESTION_MIN,
} from './pub-assistant-format'

const SYSTEM_PROMPT = `You are Ask UK Pubs, the assistant for ukpubs.co.uk — a UK directory of pubs, sports bars, venues, events, and pub news.

Rules:
- Answer questions about UK pubs, nights out, events, pub crawls, sports bars, amenities, towns, counties, and stadium neighbourhoods.
- If someone asks something unrelated, briefly say you only help with pubs and related nights out, then offer a pub-related example.
- Prefer live listing data from tools over general knowledge. Call tools before naming specific pubs, events, or news stories.
- Never invent a pub, address, event, or review that did not come back from a tool. If tools return nothing, say so and suggest a broader search or the map at /map.
- When you mention a listing, use markdown links with the site-relative href from the tool result, e.g. [The Hop](/venues/123/the-hop).
- Keep answers concise (about 80-180 words), friendly, and practical. Use short paragraphs or a tight bullet list.
- Do not mention tool names, function calls, API keys, or internal ids unless a user needs a link.
- You may use the visitor coordinates only for "near me" / nearby requests.`

function pubAssistantModel() {
  return process.env.OPENAI_PUB_ASSISTANT_MODEL || process.env.OPENAI_SEO_MODEL || 'gpt-5-mini'
}

function pubAssistantTimeoutMs() {
  const configured = Number.parseInt(process.env.OPENAI_PUB_ASSISTANT_TIMEOUT_MS || '', 10)
  if (Number.isFinite(configured) && configured > 0) return configured
  return 22_000
}

function sanitiseHistory(history: unknown): PubAssistantHistoryItem[] {
  if (!Array.isArray(history)) return []
  const items: PubAssistantHistoryItem[] = []
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') continue
    const role = (entry as PubAssistantHistoryItem).role
    const content = normalisePubQuestion((entry as PubAssistantHistoryItem).content).slice(0, 1_500)
    if ((role !== 'user' && role !== 'assistant') || content.length < 1) continue
    items.push({ role, content })
  }
  return items.slice(-PUB_ASSISTANT_HISTORY_LIMIT)
}

export function isPubAssistantConfigured() {
  return isOpenAIConfigured()
}

export async function askPubAssistant(options: {
  question: unknown
  history?: unknown
  latitude?: unknown
  longitude?: unknown
}): Promise<PubAssistantReply> {
  if (!isOpenAIConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Ask UK Pubs is not configured',
      message: 'OPENAI_API_KEY is not configured on the server.',
    })
  }

  const question = normalisePubQuestion(options.question)
  if (question.length < PUB_ASSISTANT_QUESTION_MIN) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question is too short',
      message: `Please ask a question of at least ${PUB_ASSISTANT_QUESTION_MIN} characters.`,
    })
  }
  if (question.length > PUB_ASSISTANT_QUESTION_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Question is too long',
      message: `Please keep questions to ${PUB_ASSISTANT_QUESTION_MAX} characters or fewer.`,
    })
  }

  const latitude = parseVisitorCoordinate(options.latitude, -90, 90)
  const longitude = parseVisitorCoordinate(options.longitude, -180, 180)
  const history = sanitiseHistory(options.history)

  const input: unknown[] = history.map((item) => ({
    role: item.role,
    content: item.content,
  }))

  const locationNote =
    latitude != null && longitude != null
      ? `\nVisitor coordinates (use only for nearby/near-me requests): latitude ${latitude}, longitude ${longitude}.`
      : ''

  input.push({
    role: 'user',
    content: `${question}${locationNote}`,
  })

  const { text, toolsUsed, toolResults } = await runOpenAIToolLoop({
    instructions: SYSTEM_PROMPT,
    input,
    tools: PUB_ASSISTANT_TOOLS,
    model: pubAssistantModel(),
    timeoutMs: pubAssistantTimeoutMs(),
    maxRounds: 3,
    execute: executePubAssistantTool,
  })

  const answer = text.trim() || 'I could not find a matching listing. Try a town name, a pub name, or browse the map.'

  return {
    answer,
    links: collectAssistantLinks(toolResults),
    toolsUsed: [...new Set(toolsUsed)],
  }
}
