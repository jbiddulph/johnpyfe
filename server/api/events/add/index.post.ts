import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import { createError } from 'h3';

const prisma = new PrismaClient();
const schema = Joi.object({
  event_title: Joi.string().required().min(2),
  description: Joi.string().required(),
  cost: Joi.string().required(),
  duration: Joi.string().required(),
  event_start: Joi.date().required(),
  category: Joi.string().required(),
  photo: Joi.string().allow(''), // Allow photo to be an empty string if not uploaded
  website: Joi.string().required(),
  created_at: Joi.date().required(),
  user_id: Joi.string().required(),
  venue_id: Joi.number().required().min(0),
  listingId: Joi.number().required().min(0),
});

export default defineEventHandler(async(event) => {
    const body = await readBody(event); // Access the request body directly
    if (body.venue_id) body.venue_id = Number(body.venue_id);
    if (body.listingId) body.listingId = Number(body.listingId);
    const { error, value } = schema.validate(body);
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
    } = value; // Use validated value instead of raw body

    // Check if photo is provided, if not, log and skip photo upload
    if (!photo) {
      console.log("No photo provided, skipping photo upload.");
    }

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
