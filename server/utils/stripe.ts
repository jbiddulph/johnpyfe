import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const config = useRuntimeConfig()
  const secretKey = String(config.stripeSecretKey || '').trim()
  if (!secretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe is not configured' })
  }

  stripeClient = new Stripe(secretKey)
  return stripeClient
}
