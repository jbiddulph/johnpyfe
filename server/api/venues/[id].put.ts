import Joi from "joi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schema = Joi.object({
  venuename: Joi.string(),
  slug: Joi.string(),
  venuetype: Joi.string(),
  address: Joi.string(),
  town: Joi.string(),
  county: Joi.string(),
  postcode: Joi.string(),
  latitude: Joi.string(),
  longitude: Joi.string(),
  local_authority: Joi.string(),
  website: Joi.string(),
  photo: Joi.string(),
  is_live: Joi.string(),
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