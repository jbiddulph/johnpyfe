import { prisma } from '../../utils/prisma'
import Joi from "joi";
;
const schema = Joi.object({
  venuename: Joi.string(),
  slug: Joi.string(),
  venuetype: Joi.string(),
  address: Joi.string().allow(''),
  address2: Joi.string().allow(''),
  town: Joi.string().allow(''),
  county: Joi.string().allow(''),
  postcode: Joi.string().allow(''),
  postalsearch: Joi.string().allow(''),
  telephone: Joi.string().allow(''),
  easting: Joi.string().allow(''),
  northing: Joi.string().allow(''),
  latitude: Joi.string().allow(''),
  longitude: Joi.string().allow(''),
  local_authority: Joi.string().allow(''),
  website: Joi.string().allow(''),
  photo: Joi.string().allow(''),
  is_live: Joi.string().allow(''),
  created_at: Joi.string(),
  updated_at: Joi.string(),
});

export default defineEventHandler(async(event) => {
    const { id } = event.context.params;
    const body = await readBody(event); // Access the request body directly
    const { error, value } = await schema.validate(body);
    if (error) {
      throw createError({
        statusCode: 412,
        statusMessage: error.message
      });
    }
    const {
      venuename,
      slug,
      venuetype,
      address,
      address2,
      town,
      county,
      postcode,
      northing,
      postalsearch,
      telephone,
      easting,
      latitude,
      longitude,
      local_authority,
      website,
      photo,
      is_live,
      created_at,
      updated_at,
    } = body;
  const venue = await prisma.venue.update({
    where: {
      id: parseInt(id)
    },
    data: {
      venuename,
      slug,
      venuetype,
      address,
      address2,
      town,
      county,
      postcode,
      postalsearch,
      telephone,
      easting,
      northing,
      latitude,
      longitude,
      local_authority,
      website,
      photo,
      is_live,
      created_at,
      updated_at,
    },
  })
  
  return venue;
});