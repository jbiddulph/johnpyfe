import Joi from "joi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schema = Joi.object({
  event_title: Joi.string().required().min(2),
  description: Joi.string().required().min(20),
  cost: Joi.string().required(),
  duration: Joi.string().required(),
  event_start: Joi.date().required(),
  category: Joi.string().required(),
  photo: Joi.string().required(),
  website: Joi.string().required(),
  created_at: Joi.date().required(),
  user_id: Joi.string().required(),
  venue_id: Joi.number().required().min(0),
  listingId: Joi.number().required().min(0),
});

export default defineEventHandler(async(event) => {
    const body = await readBody(event); // Access the request body directly
    const { error, value } = await schema.validate(body);
    if (error) {
      throw createError({
        statusCode: 412,
        statusMessage: error.message
      });
    }
    const {
      event_title,
      description,
      cost,
      duration,
      event_start,
      category,
      photo,
      website,
      created_at,
      user_id,
      venue_id,
      listingId,
    } = body;
    const eventdetails = await prisma.event.create({
      data: {
        event_title,
        description,
        cost,
        duration,
        event_start,
        category,
        photo,
        website,
        created_at,
        user_id,
        venue_id,
        listingId,
      },
    });
    return eventdetails;
});
