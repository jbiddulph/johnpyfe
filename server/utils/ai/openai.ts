type GenerateJsonOptions = {
  system: string
  user: unknown
  fallback?: unknown
  webSearch?: boolean
  /** Override the default request timeout (long site-wide audits need more than a listing). */
  timeoutMs?: number
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_TIMEOUT_MS = 15_000

function getTimeoutMs(): number {
  const configured = Number.parseInt(process.env.OPENAI_SEO_TIMEOUT_MS || '', 10)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_TIMEOUT_MS
}

function fallbackOrThrow<T>(options: GenerateJsonOptions, error: unknown): T {
  const message = error instanceof Error ? error.message : String(error)
  console.warn('[openai] SEO generation failed; using fallback when available', message)
  if (options.fallback !== undefined) return options.fallback as T
  throw error
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text

  const parts: string[] = []
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export type OpenAIFunctionTool = {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type OpenAIFunctionCall = {
  callId: string
  name: string
  arguments: string
}

export type OpenAIResponseResult = {
  id: string
  output: any[]
  outputText: string
  functionCalls: OpenAIFunctionCall[]
}

function defaultPromptModel() {
  return process.env.OPENAI_PROMPT_MODEL || process.env.OPENAI_SEO_MODEL || 'gpt-5-mini'
}

function extractFunctionCalls(payload: any): OpenAIFunctionCall[] {
  const calls: OpenAIFunctionCall[] = []
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'function_call' && item?.type !== 'custom_tool_call') continue
    const callId = String(item.call_id || item.id || '')
    const name = String(item.name || '')
    if (!callId || !name) continue
    const rawArgs = item.arguments
    calls.push({
      callId,
      name,
      arguments: typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs || {}),
    })
  }
  return calls
}

export async function createOpenAIResponse(options: {
  input: unknown
  tools?: OpenAIFunctionTool[]
  previousResponseId?: string
  timeoutMs?: number
  maxOutputTokens?: number
  model?: string
}): Promise<OpenAIResponseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : getTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || defaultPromptModel(),
        input: options.input,
        ...(options.previousResponseId ? { previous_response_id: options.previousResponseId } : {}),
        ...(options.tools?.length
          ? {
              tools: options.tools,
              tool_choice: 'auto',
            }
          : {}),
        ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(`OpenAI request failed with ${response.status}: ${details.slice(0, 500)}`)
    }

    const payload = await response.json()
    return {
      id: String(payload?.id || ''),
      output: Array.isArray(payload?.output) ? payload.output : [],
      outputText: extractOutputText(payload),
      functionCalls: extractFunctionCalls(payload),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function generateJsonWithOpenAI<T>(options: GenerateJsonOptions): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    if (options.fallback !== undefined) return options.fallback as T
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : getTimeoutMs())

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.webSearch
          ? process.env.OPENAI_SEO_WEB_MODEL || process.env.OPENAI_SEO_MODEL || 'gpt-5.5'
          : process.env.OPENAI_SEO_MODEL || 'gpt-5-mini',
        ...(options.webSearch
          ? {
              tools: [{ type: 'web_search' }],
              tool_choice: 'auto',
              include: ['web_search_call.action.sources'],
            }
          : {}),
        input: [
          {
            role: 'system',
            content: `${options.system}\nReturn only valid JSON. Do not include markdown fences.`,
          },
          {
            role: 'user',
            content: JSON.stringify(options.user),
          },
        ],
      }),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(`OpenAI request failed with ${response.status}: ${details.slice(0, 500)}`)
    }

    const payload = await response.json()
    const outputText = extractOutputText(payload)
    if (!outputText) throw new Error('OpenAI returned an empty response')
    return JSON.parse(outputText) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fallbackOrThrow<T>(options, new Error(`OpenAI returned invalid JSON: ${error.message}`))
    }
    return fallbackOrThrow<T>(options, error)
  } finally {
    clearTimeout(timeout)
  }
}
