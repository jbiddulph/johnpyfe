import { defineEventHandler, createError, readBody } from 'h3';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const prisma = new PrismaClient();

const eventSchema = Joi.object({
  event_title: Joi.string().required().max(200),
  description: Joi.string().optional().allow('').max(5000),
  cost: Joi.string().optional().allow('').max(100),
  duration: Joi.string().optional().allow('').max(50),
  event_start: Joi.date().required(),
  photo: Joi.string().optional().allow('').max(500),
  website: Joi.string().optional().allow('').max(500),
  created_at: Joi.date().required(),
  user_id: Joi.string().required(),
  venue_id: Joi.number().required(),
  listingId: Joi.number().required(),
  cityId: Joi.number().required(),
  categoryId: Joi.number().required(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  console.log("Received event data:", body);

  const { error } = eventSchema.validate(body);
  if (error) {
    console.error("Validation error:", error.message);
    throw createError({
      statusCode: 412,
      statusMessage: error.message,
    });
  }

  try {
    const eventData = {
      event_title: body.event_title,
      description: body.description || "",
      cost: body.cost || "",
      duration: body.duration || "",
      event_start: new Date(body.event_start),
      photo: body.photo || "",
      website: body.website || "",
      created_at: new Date(),
      user_id: body.user_id,
      listingId: parseInt(body.venue_id),
      cityId: parseInt(body.cityId),
      categoryId: parseInt(body.categoryId),
    };

    console.log("Creating event with data:", eventData);

    const eventdetails = await prisma.event.create({
      data: eventData,
    });

    console.log("Event created successfully:", eventdetails);
    return eventdetails;
  } catch (error) {
    console.error("Database error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    });
  }
});