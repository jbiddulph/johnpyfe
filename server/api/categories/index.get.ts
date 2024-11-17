import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

export default defineEventHandler(async () => {
    const categoryList = await prisma.category.findMany();

    return categoryList;
  
});

