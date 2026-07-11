import { prisma } from '../../utils/prisma'
export default defineEventHandler(async () => {
    const cityList = await prisma.city.findMany();

    return cityList;
  
});

