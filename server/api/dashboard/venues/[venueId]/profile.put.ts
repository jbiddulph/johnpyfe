import Joi from 'joi'
import { requireVerifiedClaimAccess } from '../../../../utils/organisation-access'
import { requireAuth } from '../../../../utils/require-auth'
import { prisma } from '../../../../utils/prisma'
import { sanitizeSocialLinks } from '../../../../utils/venue-profile'

const schema = Joi.object({
  logoUrl: Joi.string().max(2000).allow('', null).optional(),
  headerImageUrl: Joi.string().max(2000).allow('', null).optional(),
  menuFoodUrl: Joi.string().max(2000).allow('', null).optional(),
  menuDrinksUrl: Joi.string().max(2000).allow('', null).optional(),
  customDescription: Joi.string().max(5000).allow('', null).optional(),
  socialLinks: Joi.object({
    facebook: Joi.string().max(2000).allow('', null).optional(),
    instagram: Joi.string().max(2000).allow('', null).optional(),
    twitter: Joi.string().max(2000).allow('', null).optional(),
    tiktok: Joi.string().max(2000).allow('', null).optional(),
  }).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const venueId = Number.parseInt(String(event.context.params?.venueId ?? ''), 10)
  if (!Number.isFinite(venueId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid venue id' })
  }

  await requireVerifiedClaimAccess(user.id, venueId)

  const body = await readBody(event)
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true })
  if (error) {
    throw createError({ statusCode: 412, statusMessage: error.message })
  }

  const socialLinks = sanitizeSocialLinks(value.socialLinks)

  const profile = await prisma.venueProfile.upsert({
    where: { venueId },
    create: {
      venueId,
      logoUrl: value.logoUrl || null,
      headerImageUrl: value.headerImageUrl || null,
      menuFoodUrl: value.menuFoodUrl || null,
      menuDrinksUrl: value.menuDrinksUrl || null,
      customDescription: value.customDescription || null,
      socialLinks,
    },
    update: {
      logoUrl: value.logoUrl || null,
      headerImageUrl: value.headerImageUrl || null,
      menuFoodUrl: value.menuFoodUrl || null,
      menuDrinksUrl: value.menuDrinksUrl || null,
      customDescription: value.customDescription || null,
      socialLinks,
    },
  })

  return profile
})
