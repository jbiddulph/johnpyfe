import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Comedy" }, 
    { name: "Film" },
    { name: "Live Music" }, 
    { name: "Festival" },
    { name: "Quiz" }, 
  ];

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });