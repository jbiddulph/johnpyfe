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

export type OpenAIFunctionTool = {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

type FunctionCallItem = {
  call_id: string
  name: string
  arguments: string
}

function extractFunctionCalls(payload: any): FunctionCallItem[] {
  const calls: FunctionCallItem[] = []
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'function_call') continue
    const callId = String(item.call_id || item.id || '')
    const name = String(item.name || '')
    if (!callId || !name) continue
    calls.push({
      call_id: callId,
      name,
      arguments: typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {}),
    })
  }
  return calls
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function postOpenAIResponses(body: Record<string, unknown>, timeoutMs: number) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

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

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Run a Responses API loop: the model may request private function tools,
 * this executes them server-side, then continues until a text answer.
 */
export async function runOpenAIToolLoop(options: {
  system: string
  user: string
  tools: OpenAIFunctionTool[]
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>
  maxRounds?: number
  timeoutMs?: number
  model?: string
}): Promise<{ text: string; usedTools: string[] }> {
  const usedTools: string[] = []
  const maxRounds = Math.max(1, options.maxRounds ?? 4)
  const deadline = Date.now() + (options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 20_000)
  const model = options.model || defaultOpenAiModel()

  const remainingMs = () => Math.max(1_000, deadline - Date.now())

  let payload = await postOpenAIResponses(
    {
      model,
      tool_choice: 'auto',
      tools: options.tools,
      input: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    },
    remainingMs(),
  )

  for (let round = 0; round < maxRounds; round += 1) {
    if (Date.now() >= deadline) break

    const calls = extractFunctionCalls(payload)
    if (!calls.length) {
      return { text: extractOutputText(payload), usedTools }
    }

    const outputs = await Promise.all(
      calls.map(async (call) => {
        usedTools.push(call.name)
        let output: unknown
        try {
          output = await options.execute(call.name, parseToolArguments(call.arguments))
        } catch (error) {
          output = {
            error: error instanceof Error ? error.message : 'Tool failed',
          }
        }
        let serialized = JSON.stringify(output ?? {})
        if (serialized.length > 8_000) serialized = `${serialized.slice(0, 8_000)}…`
        return {
          type: 'function_call_output',
          call_id: call.call_id,
          output: serialized,
        }
      }),
    )

    payload = await postOpenAIResponses(
      {
        model,
        previous_response_id: payload.id,
        tool_choice: 'auto',
        tools: options.tools,
        input: outputs,
      },
      remainingMs(),
    )
  }

  return { text: extractOutputText(payload), usedTools }
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
