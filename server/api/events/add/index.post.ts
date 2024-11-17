import { defineEventHandler, createError, readBody } from 'h3';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const prisma = new PrismaClient();

const eventSchema = Joi.object({
  event_title: Joi.string().required(),
  description: Joi.string().required(),
  cost: Joi.string().required(),
  duration: Joi.string().required(),
  event_start: Joi.date().required(),
  photo: Joi.string().required(),
  website: Joi.string().required(),
  created_at: Joi.date().required(),
  user_id: Joi.string().required(),
  venue_id: Joi.number().required(),
  listingId: Joi.number().required(),
  cityId: Joi.number().required(),
  categoryId: Joi.number().required(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const { error } = eventSchema.validate(body);
  if (error) {
    throw createError({
      statusCode: 412,
      statusMessage: error.message,
    });
  }

  try {
    const eventData = {
      event_title: body.event_title,
      description: body.description,
      cost: body.cost,
      duration: body.duration,
      event_start: new Date(body.event_start),
      photo: body.photo,
      website: body.website,
      created_at: new Date(),
      user_id: body.user_id,
      venue_id: body.venue_id,
      listingId: body.listingId,
      cityId: body.cityId,
      categoryId: body.categoryId,
    };

    const eventdetails = await prisma.event.create({
      data: eventData,
    });

    return eventdetails;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    });
  }
});