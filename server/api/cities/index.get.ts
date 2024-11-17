import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async () => {
    const cityList = await prisma.city.findMany();

    return cityList;
  
});

