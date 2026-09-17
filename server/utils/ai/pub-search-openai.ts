import OpenAI from 'openai'
import { extractHeuristicFilters, validateAiPubSearchFilters } from './pub-search-filters'
import {
  PUB_SEARCH_TOOLS,
  executeCreatePubCrawl,
  executeSearchPubs,
  executeToolCall,
  type ToolExecutionState,
  type UserLocation,
} from './pub-search-tools'
import type { AiPubSearchFilters } from '../../../utils/ai-pub-search'

const MAX_TOOL_ROUNDS = 3

function openaiApiKey() {
  const config = useRuntimeConfig()
  return String(config.openaiApiKey || process.env.OPENAI_API_KEY || '').trim()
}

function modelName() {
  return process.env.OPENAI_PUB_SEARCH_MODEL || process.env.OPENAI_SEO_MODEL || 'gpt-5-mini'
}

const SYSTEM_PROMPT = `You help visitors find real pubs in the UK Pubs database.

Rules:
- Always call search_pubs or create_pub_crawl before answering a search.
- Use create_pub_crawl when the user wants a pub crawl, a numbered route, or several pubs in walking order.
- Use get_pub_details only for a specific venue id returned by a tool.
- Never invent pubs, addresses, ratings, or opening hours.
- Never write SQL or ask to update pub records.
- Features must come from: garden, dogs, music, food, sport, ale, family, wifi, parking, accessible, quiz, rooms.
- If the user says "near me" set nearMe true and omit location.
- If they name a town or station, put it in location.
- If they ask for pubs between two places, set location and locationEnd.
- Default radius is 3 miles unless they specify another distance.
- Keep the final answer short (2-4 sentences). Mention that results are from UK Pubs listings.`

function emptyState(): ToolExecutionState {
  return {
    filters: null,
    pubs: [],
    crawl: null,
    origin: null,
    details: [],
  }
}

export async function runFallbackPubSearch(
  question: string,
  userLocation: UserLocation,
  makeCrawl = false,
) {
  const state = emptyState()
  const extracted = extractHeuristicFilters(question)
  const filters = validateAiPubSearchFilters({
    ...extracted,
    makeCrawl: makeCrawl || extracted.makeCrawl,
  })

  if (filters.makeCrawl) {
    await executeCreatePubCrawl(filters, userLocation, state)
  } else {
    await executeSearchPubs(filters, userLocation, state)
  }

  return {
    usedAi: false,
    answer: fallbackAnswer(question, state, filters),
    state,
  }
}

function fallbackAnswer(question: string, state: ToolExecutionState, filters: AiPubSearchFilters) {
  if (state.pubs.length && state.crawl) {
    return `Here is a ${state.pubs.length}-pub crawl from UK Pubs listings${filters.location ? ` around ${filters.location}` : ''}. Walking order uses Mapbox directions.`
  }
  if (state.pubs.length) {
    const where = filters.location || (filters.nearMe ? 'near you' : 'from the directory')
    return `Found ${state.pubs.length} matching pub${state.pubs.length === 1 ? '' : 's'} ${where} in the UK Pubs database.`
  }
  if (filters.nearMe && !state.origin) {
    return 'Share your location to search for pubs near you, or name a town such as Worthing or Brighton.'
  }
  return `No matching pubs were found in the UK Pubs database for “${question.slice(0, 120)}”. Try a nearby town or fewer filters.`
}

export async function runAiPubSearch(
  question: string,
  userLocation: UserLocation,
  makeCrawl = false,
) {
  const apiKey = openaiApiKey()
  if (!apiKey) {
    return runFallbackPubSearch(question, userLocation, makeCrawl)
  }

  const client = new OpenAI({ apiKey, timeout: 18_000, maxRetries: 0 })
  const state = emptyState()
  const locationNote = userLocation
    ? `The visitor has shared their location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}).`
    : 'The visitor has not shared a location.'

  const input: any[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `${question}\n\n${locationNote}\nPrefer create_pub_crawl: ${makeCrawl ? 'yes' : 'only if they asked for a crawl'}.`,
    },
  ]

  try {
    let response = await client.responses.create({
      model: modelName(),
      tools: PUB_SEARCH_TOOLS as any,
      tool_choice: 'auto',
      input,
    })

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const calls = response.output.filter((item: any) => item.type === 'function_call')
      if (!calls.length) break

      input.push(...response.output)
      for (const call of calls) {
        const output = await executeToolCall(call.name, call.arguments, userLocation, state)
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(output),
        })
      }

      response = await client.responses.create({
        model: modelName(),
        tools: PUB_SEARCH_TOOLS as any,
        input,
      })
    }

    if (!state.pubs.length) {
      return runFallbackPubSearch(question, userLocation, makeCrawl)
    }

    const answer = response.output_text?.trim()
      || (state.crawl
        ? `Here is a ${state.pubs.length}-stop crawl from UK Pubs listings.`
        : `Found ${state.pubs.length} matching pubs in the UK Pubs database.`)

    return {
      usedAi: true,
      answer,
      state,
    }
  } catch (error) {
    console.warn('[ai-pub-search] OpenAI failed, using heuristic search:', error)
    const fallback = await runFallbackPubSearch(question, userLocation, makeCrawl)
    return fallback
  }
}
