import { prisma } from '../../utils/prisma'
export default defineEventHandler(async () => {
    const categoryList = await prisma.category.findMany();

    return categoryList;
  
});

