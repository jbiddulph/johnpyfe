import { getMembershipForUser } from '../../utils/organisation-access'
import { requireAuth } from '../../utils/require-auth'
import {
  syncOrganisationFromStripeCustomer,
  syncOrganisationFromStripeSearch,
} from '../../utils/sync-stripe-billing'
import { syncOrganisationFromSubscription } from '../../utils/sync-stripe-subscription'
import { getStripe } from '../../utils/stripe'

/** Pull the latest subscription state from Stripe into the database. */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const membership = await getMembershipForUser(user.id)
  if (!membership) {
    throw createError({ statusCode: 400, statusMessage: 'No organisation found' })
  }

  const org = membership.organisation
  const stripe = getStripe()

  if (org.stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
    await syncOrganisationFromSubscription(org.id, subscription)
    return { synced: true, status: subscription.status }
  }

  if (org.stripeCustomerId) {
    const fromCustomer = await syncOrganisationFromStripeCustomer(org.id, org.stripeCustomerId)
    if (fromCustomer.synced) return fromCustomer
  }

  return syncOrganisationFromStripeSearch(org.id)
})
