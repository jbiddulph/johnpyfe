type GenerateJsonOptions = {
  system: string
  user: unknown
  fallback?: unknown
  webSearch?: boolean
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

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

export async function generateJsonWithOpenAI<T>(options: GenerateJsonOptions): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    if (options.fallback !== undefined) return options.fallback as T
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
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

  try {
    return JSON.parse(outputText) as T
  } catch (error) {
    throw new Error(`OpenAI returned invalid JSON: ${(error as Error).message}`)
  }
}
