import Joi from "joi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schema = Joi.object({
  latitude: Joi.string().required(),
  longitude: Joi.string().required(),
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
      latitude,
      longitude,
      updated_at,
    } = body;
  const venue = await prisma.venue.update({
    where: {
      id: parseInt(id)
    },
    data: {
      latitude,
      longitude,
      updated_at,
    },
  })
  
  return venue;
});