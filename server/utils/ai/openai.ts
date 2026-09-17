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

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function defaultOpenAiModel() {
  return process.env.OPENAI_PROMPT_MODEL || process.env.OPENAI_SEO_MODEL || 'gpt-5-mini'
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
  strict?: boolean
}

/** Alias used by the homepage Ask UK Pubs assistant. */
export type OpenAIToolDefinition = OpenAIFunctionTool

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
  tools?: OpenAIToolDefinition[]
  previousResponseId?: string
  timeoutMs?: number
  maxOutputTokens?: number
  model?: string
  instructions?: string
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
        ...(options.instructions ? { instructions: options.instructions } : {}),
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

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* ignore invalid JSON from the model */
  }
  return {}
}

export async function runOpenAIToolLoop(options: {
  instructions?: string
  input: unknown
  tools: OpenAIToolDefinition[]
  model?: string
  timeoutMs?: number
  maxRounds?: number
  maxOutputTokens?: number
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown> | unknown
}): Promise<{ text: string; toolsUsed: string[]; toolResults: unknown[] }> {
  const maxRounds = options.maxRounds && options.maxRounds > 0 ? options.maxRounds : 3
  const budgetMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : getTimeoutMs() * 2
  const deadline = Date.now() + budgetMs
  const toolsUsed: string[] = []
  const toolResults: unknown[] = []
  let previousResponseId: string | undefined
  let nextInput: unknown = options.input
  let lastText = ''

  for (let round = 0; round < maxRounds; round += 1) {
    const leftover = deadline - Date.now()
    if (leftover < 2000) break

    const result = await createOpenAIResponse({
      input: nextInput,
      previousResponseId,
      tools: options.tools,
      timeoutMs: Math.min(12_000, leftover - 400),
      maxOutputTokens: options.maxOutputTokens ?? 700,
      model: options.model,
      instructions: round === 0 ? options.instructions : undefined,
    })

    previousResponseId = result.id || previousResponseId
    if (result.outputText) lastText = result.outputText

    if (!result.functionCalls.length) break

    const outputs: Array<Record<string, unknown>> = []
    for (const call of result.functionCalls) {
      if (deadline - Date.now() < 1000) break
      toolsUsed.push(call.name)
      const toolResult = await options.execute(call.name, parseToolArgs(call.arguments))
      toolResults.push(toolResult)
      outputs.push({
        type: 'function_call_output',
        call_id: call.callId,
        output: JSON.stringify(toolResult ?? {}).slice(0, 7000),
      })
    }

    if (!outputs.length) break
    nextInput = outputs
  }

  return { text: lastText, toolsUsed, toolResults }
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
