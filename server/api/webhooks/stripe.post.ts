import type Stripe from 'stripe'
import { prisma } from '../../utils/prisma'
import { clearOrganisationSubscription, syncOrganisationFromSubscription } from '../../utils/sync-stripe-subscription'
import { getStripe } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = String(config.stripeWebhookSecret || '').trim()
  if (!webhookSecret || webhookSecret === 'whsec_...') {
    throw createError({ statusCode: 503, statusMessage: 'Stripe webhook secret is not configured' })
  }

  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing Stripe signature' })
  }

  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty webhook body' })
  }

  const stripe = getStripe()
  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature'
    throw createError({ statusCode: 400, statusMessage: message })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      const organisationId = session.metadata?.organisationId || session.client_reference_id
      if (!organisationId) break

      if (session.customer) {
        await prisma.organisation.update({
          where: { id: organisationId },
          data: { stripeCustomerId: String(session.customer) },
        })
      }

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
        await syncOrganisationFromSubscription(organisationId, subscription)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const organisationId = subscription.metadata?.organisationId
      if (!organisationId) break
      await syncOrganisationFromSubscription(organisationId, subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      const organisationId = subscription.metadata?.organisationId
      if (!organisationId) break
      await clearOrganisationSubscription(organisationId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription
      if (!subscriptionId) break

      const subscription = await stripe.subscriptions.retrieve(String(subscriptionId))
      const organisationId = subscription.metadata?.organisationId
      if (!organisationId) break

      await prisma.organisation.update({
        where: { id: organisationId },
        data: { subscriptionStatus: subscription.status },
      })
      break
    }

    default:
      break
  }

  return { received: true }
})
