import { prisma } from '../../utils/prisma'
import Joi from 'joi'

const optionalString = Joi.string().allow('', null).optional()

const schema = Joi.object({
  venuename: Joi.string().trim().min(1).required(),
  slug: optionalString,
  venuetype: optionalString,
  address: optionalString,
  address2: optionalString,
  town: optionalString,
  county: optionalString,
  postcode: optionalString,
  postalsearch: optionalString,
  telephone: optionalString,
  easting: optionalString,
  northing: optionalString,
  latitude: optionalString,
  longitude: optionalString,
  local_authority: optionalString,
  website: optionalString,
  photo: optionalString,
  is_live: optionalString,
  created_at: optionalString,
  updated_at: optionalString,
})

export default defineEventHandler(async (event) => {
  const { id } = event.context.params
  const body = await readBody(event)
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true })
  if (error) {
    throw createError({
      statusCode: 412,
      statusMessage: error.message,
    })
  }

  const venue = await prisma.venue.update({
    where: {
      id: parseInt(id),
    },
    data: {
      venuename: value.venuename,
      slug: value.slug ?? '',
      venuetype: value.venuetype ?? 'pub',
      address: value.address ?? '',
      address2: value.address2 ?? '',
      town: value.town ?? '',
      county: value.county ?? '',
      postcode: value.postcode ?? '',
      postalsearch: value.postalsearch ?? '',
      telephone: value.telephone ?? '',
      easting: value.easting ?? '',
      northing: value.northing ?? '',
      latitude: value.latitude ?? '',
      longitude: value.longitude ?? '',
      local_authority: value.local_authority ?? '',
      website: value.website ?? '',
      photo: value.photo ?? '',
      is_live: value.is_live ?? '1',
      created_at: value.created_at,
      updated_at: value.updated_at,
    },
  })

  return venue
})
