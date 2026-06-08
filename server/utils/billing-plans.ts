export type BillingPlanId = 'solo' | 'group' | 'regional' | 'enterprise'

export type BillingPlan = {
  id: BillingPlanId
  label: string
  monthlyGbp: number
  pubLimit: number
  priceEnvKey: keyof {
    stripePriceSolo: string
    stripePriceGroup: string
    stripePriceRegional: string
    stripePriceEnterprise: string
  }
}

export const BILLING_PLANS: BillingPlan[] = [
  { id: 'solo', label: 'Solo', monthlyGbp: 4.99, pubLimit: 1, priceEnvKey: 'stripePriceSolo' },
  { id: 'group', label: 'Small group', monthlyGbp: 19.99, pubLimit: 5, priceEnvKey: 'stripePriceGroup' },
  { id: 'regional', label: 'Regional', monthlyGbp: 79, pubLimit: 25, priceEnvKey: 'stripePriceRegional' },
  { id: 'enterprise', label: 'Enterprise', monthlyGbp: 99, pubLimit: 100, priceEnvKey: 'stripePriceEnterprise' },
]

const planById = new Map(BILLING_PLANS.map((plan) => [plan.id, plan]))

export function getBillingPlan(planId: string): BillingPlan | null {
  return planById.get(planId as BillingPlanId) ?? null
}

export function getStripePriceId(planId: BillingPlanId): string {
  const config = useRuntimeConfig()
  const plan = getBillingPlan(planId)
  if (!plan) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan' })
  }
  const priceId = String(config[plan.priceEnvKey] || '').trim()
  if (!priceId) {
    throw createError({ statusCode: 503, statusMessage: `Stripe price not configured for ${planId}` })
  }
  return priceId
}

/** Unix timestamp for the next 1st of the month strictly in the future (UTC midnight). */
export function nextBillingAnchorUnix(): number {
  const now = new Date()
  let anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  if (anchor <= now.getTime()) {
    anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  }
  return Math.floor(anchor / 1000)
}

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(String(status || '').toLowerCase())
}

export function planIdFromStripePriceId(priceId: string): BillingPlanId | null {
  const config = useRuntimeConfig()
  const entries: Array<[BillingPlanId, string]> = [
    ['solo', config.stripePriceSolo],
    ['group', config.stripePriceGroup],
    ['regional', config.stripePriceRegional],
    ['enterprise', config.stripePriceEnterprise],
  ]
  const match = entries.find(([, id]) => String(id || '').trim() === priceId)
  return match?.[0] ?? null
}
