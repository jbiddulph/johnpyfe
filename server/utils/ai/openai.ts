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

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export type OpenAIResponseItem = {
  type?: string
  call_id?: string
  name?: string
  arguments?: string
  content?: Array<{ type?: string; text?: string }>
}

export type OpenAIResponsePayload = {
  id?: string
  status?: string
  output_text?: string
  output?: OpenAIResponseItem[]
}

export function extractOpenAIOutputText(payload: OpenAIResponsePayload | null | undefined): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const parts: string[] = []
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

function extractOutputText(payload: any): string {
  return extractOpenAIOutputText(payload)
}

export async function createOpenAIResponse(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<OpenAIResponsePayload> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs))

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(`OpenAI request failed with ${response.status}: ${details.slice(0, 500)}`)
    }

    return (await response.json()) as OpenAIResponsePayload
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export type OpenAIToolDefinition = {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
  strict?: boolean
}

export async function runOpenAIToolLoop(options: {
  instructions: string
  input: unknown[]
  tools: OpenAIToolDefinition[]
  model: string
  timeoutMs: number
  maxRounds?: number
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>
}): Promise<{ text: string; toolsUsed: string[]; toolResults: unknown[] }> {
  const maxRounds = options.maxRounds && options.maxRounds > 0 ? options.maxRounds : 3
  const startedAt = Date.now()
  const remainingMs = () => Math.max(1_000, options.timeoutMs - (Date.now() - startedAt))

  const input: unknown[] = [...options.input]
  const toolsUsed: string[] = []
  const toolResults: unknown[] = []

  const requestBody = (toolChoice: 'auto' | 'none') => ({
    model: options.model,
    instructions: options.instructions,
    tools: options.tools,
    tool_choice: toolChoice,
    input,
  })

  for (let round = 0; round < maxRounds; round++) {
    const payload = await createOpenAIResponse(requestBody('auto'), remainingMs())
    const calls = (payload.output ?? []).filter((item) => item.type === 'function_call' && item.call_id && item.name)

    if (!calls.length) {
      return {
        text: extractOpenAIOutputText(payload),
        toolsUsed,
        toolResults,
      }
    }

    input.push(...(payload.output ?? []))

    const outputs = await Promise.all(
      calls.map(async (call) => {
        toolsUsed.push(String(call.name))
        let args: Record<string, unknown> = {}
        try {
          const parsed = JSON.parse(call.arguments || '{}')
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            args = parsed as Record<string, unknown>
          }
        } catch {
          args = {}
        }

        let result: unknown
        try {
          result = await options.execute(String(call.name), args)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          result = { error: message }
        }
        toolResults.push(result)

        return {
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(result),
        }
      }),
    )

    input.push(...outputs)
  }

  const finalPayload = await createOpenAIResponse(requestBody('none'), remainingMs())
  return {
    text: extractOpenAIOutputText(finalPayload),
    toolsUsed,
    toolResults,
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
