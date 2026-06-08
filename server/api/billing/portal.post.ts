import { getMembershipForUser } from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import { getStripe } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const membership = await getMembershipForUser(user.id)
  if (!membership?.organisation.stripeCustomerId) {
    throw createError({ statusCode: 400, statusMessage: 'No Stripe customer found — subscribe first' })
  }

  const config = useRuntimeConfig()
  const siteUrl = String(config.public.appURL || config.public.baseURL || '').replace(/\/$/, '')
  const stripe = getStripe()

  const portal = await stripe.billingPortal.sessions.create({
    customer: membership.organisation.stripeCustomerId,
    return_url: `${siteUrl}/dashboard/billing`,
  })

  return { url: portal.url }
})
