import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import { createError } from "h3";

const prisma = new PrismaClient();

// Define Joi schema for validation
const schema = Joi.object({
  id: Joi.number().required(),
  event_title: Joi.string().required().min(2),
  description: Joi.string().required(),
  cost: Joi.string().required(),
  duration: Joi.string().required(),
  event_start: Joi.date().iso().required(), // Strict ISO validation
  cityId: Joi.number().required(),
  categoryId: Joi.number().required(),
  photo: Joi.string().allow("").optional(),
  website: Joi.string().required(),
  created_at: Joi.date().optional(),
  user_id: Joi.string().required(),
  venue_id: Joi.number().required().min(0),
  listingId: Joi.number().required().min(0),
});


export default defineEventHandler(async (event) => {
  const body = await readBody(event); // Access the request body directly
  if (body.venue_id) {
    const venueIdNumber = Number(body.venue_id);
    if (isNaN(venueIdNumber)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid venue_id: Must be a valid number.",
      });
    }
    body.venue_id = venueIdNumber;
  }
  
  if (body.listingId) {
    const listingIdNumber = Number(body.listingId);
    if (isNaN(listingIdNumber)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid listingId: Must be a valid number.",
      });
    }
    body.listingId = listingIdNumber;
  }
  // Convert venue_id and listingId to numbers, if present
  if (body.venue_id) body.venue_id = Number(body.venue_id);
  if (body.listingId) body.listingId = Number(body.listingId);
  if (!body.event_start) {
    console.error("event_start is missing in the request body");
    throw createError({
      statusCode: 400,
      statusMessage: "event_start is required",
    });
  }

  console.log("event_start Received:", body.event_start);
  // Validate the request body
  const { error, value } = schema.validate(body);
  if (error) {
    throw createError({
      statusCode: 412,
      statusMessage: error.message,
    });
  }

  const {
    id, // Extract the event ID
    event_title,
    description,
    cost,
    duration,
    event_start,
    categoryId,
    cityId,
    photo,
    website,
    created_at,
    user_id,
    venue_id,
    listingId,
  } = value; // Use validated value instead of raw body

  // Check if the event exists before updating
  const existingEvent = await prisma.event.findUnique({
    where: { id },
  });

  if (!existingEvent) {
    throw createError({
      statusCode: 404,
      statusMessage: "Event not found.",
    });
  }

  // Update the event with the validated data
  try {
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        event_title,
        description,
        cost,
        duration,
        event_start,
        categoryId,
        cityId,
        photo,
        website,
        created_at,
        user_id,
        venue_id,
        listingId,
      },
    });
    return updatedEvent;
  } catch (error) {
    console.error("Error updating event:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update event.",
    });
  }
});
