import Joi from "joi";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const schema = Joi.object({
  text: Joi.string().required().min(20),
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
    text,
    created_at,
    user_id,
    venue_id,
    listingId,
  } = body;
  const notedetails = await prisma.note.create({
    data: {
      text,
      created_at,
      user_id,
      venue_id,
      listingId,
    },
  });
  return notedetails;
});
