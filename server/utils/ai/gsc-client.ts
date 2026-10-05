import { createSign } from 'node:crypto'
import { resolveSiteUrl } from '../../../utils/site-url'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEARCH_ANALYTICS_URL = 'https://www.googleapis.com/webmasters/v3/sites'

export type GscServiceAccount = {
  clientEmail: string
  privateKey: string
}

export type GscSearchRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type TokenCache = { accessToken: string; expiresAt: number }
let tokenCache: TokenCache | null = null

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function normalisePrivateKey(raw: string) {
  let key = raw.trim()
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1)
  }
  return key.replace(/\\n/g, '\n')
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

/** Read service-account credentials from env (JSON blob or email+key). */
export function loadGscServiceAccount(): GscServiceAccount | null {
  const jsonRaw = String(process.env.GSC_SERVICE_ACCOUNT_JSON || '').trim()
  if (jsonRaw) {
    const parsed = tryParseJson(jsonRaw)
    const clientEmail = String(parsed?.client_email || '').trim()
    const privateKey = String(parsed?.private_key || '').trim()
    if (clientEmail && privateKey) {
      return { clientEmail, privateKey: normalisePrivateKey(privateKey) }
    }
  }

  const clientEmail = String(process.env.GSC_CLIENT_EMAIL || '').trim()
  const privateKey = String(process.env.GSC_PRIVATE_KEY || '').trim()
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey: normalisePrivateKey(privateKey) }
  }

  return null
}

/**
 * Search Console property identifier.
 * URL-prefix: https://ukpubs.co.uk/
 * Domain property: sc-domain:ukpubs.co.uk
 */
export function resolveGscSiteUrl() {
  const configured = String(process.env.GSC_SITE_URL || process.env.GSC_PROPERTY || '').trim()
  if (configured) return configured
  return `${resolveSiteUrl()}/`
}

export function isGscConfigured() {
  return Boolean(loadGscServiceAccount() && resolveGscSiteUrl())
}

export function isGscPrioritiserEnabled() {
  if (String(process.env.AI_SEO_GSC_ENABLED || '').trim().toLowerCase() === 'false') return false
  return isGscConfigured()
}

async function getAccessToken(account: GscServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.accessToken
  }

  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = toBase64Url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: GSC_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer
    .sign(account.privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  const assertion = `${unsigned}.${signature}`

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`GSC token exchange failed (${response.status}): ${details.slice(0, 400)}`)
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) throw new Error('GSC token exchange returned no access_token')

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: now + Math.max(60, Number(payload.expires_in || 3600) - 30),
  }
  return payload.access_token
}

function isoDate(daysAgo: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

export type GscQueryOptions = {
  startDate?: string
  endDate?: string
  dimensions?: string[]
  rowLimit?: number
  startRow?: number
  dimensionFilterGroups?: Array<{
    filters: Array<{ dimension: string; operator?: string; expression: string }>
  }>
}

/** Query Search Analytics for the configured property. */
export async function queryGscSearchAnalytics(options: GscQueryOptions = {}): Promise<GscSearchRow[]> {
  const account = loadGscServiceAccount()
  if (!account) throw new Error('GSC service account is not configured')

  const siteUrl = resolveGscSiteUrl()
  const lookback = Math.min(
    90,
    Math.max(7, Number.parseInt(process.env.AI_SEO_GSC_LOOKBACK_DAYS || '28', 10) || 28),
  )
  const endDate = options.endDate || isoDate(3) // GSC data lags a few days
  const startDate = options.startDate || isoDate(3 + lookback)
  const token = await getAccessToken(account)
  const endpoint = `${SEARCH_ANALYTICS_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: options.dimensions || ['page'],
      rowLimit: options.rowLimit ?? 5000,
      startRow: options.startRow ?? 0,
      dimensionFilterGroups: options.dimensionFilterGroups,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`GSC searchAnalytics.query failed (${response.status}): ${details.slice(0, 500)}`)
  }

  const payload = (await response.json()) as { rows?: GscSearchRow[] }
  return payload.rows || []
}
