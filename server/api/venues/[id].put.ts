import Joi from "joi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schema = Joi.object({
  venuename: Joi.string().required(),
  slug: Joi.string().required(),
  venuetype: Joi.string().required(),
  address: Joi.string().required(),
  town: Joi.string().required(),
  county: Joi.string().required(),
  postcode: Joi.string().required(),
  latitude: Joi.string().required(),
  longitude: Joi.string().required(),
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