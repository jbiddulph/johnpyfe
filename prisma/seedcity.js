import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cities = [
    { name: "Aberdeen" }, 
    { name: "Bath" },
    { name: "Birmingham" }, 
    { name: "Bradford" },
    { name: "Brighton & Hove" }, 
    { name: "Bristol" }, 
    { name: "Cambridge" }, 
    { name: "Canterbury" }, 
    { name: "Cardiff" }, 
    { name: "Carlisle" },
    { name: "Chelmsford" }, 
    { name: "Chester" }, 
    { name: "Chichester" }, 
    { name: "Coventry" }, 
    { name: "Derby" }, 
    { name: "Dundee" },
    { name: "Durham" }, 
    { name: "Edinburgh" }, 
    { name: "Exeter" }, 
    { name: "Glasgow" }, 
    { name: "Gloucester" }, 
    { name: "Hereford" },
    { name: "Inverness" }, 
    { name: "Kingston upon Hull" }, 
    { name: "Lancaster uk" }, 
    { name: "Leeds" }, 
    { name: "Leicester" },
    { name: "Lichfield" }, 
    { name: "Lincoln" }, 
    { name: "Liverpool" }, 
    { name: "London" }, 
    { name: "Manchester" }, 
    { name: "Newcastle upon Tyne" },
    { name: "Newport" }, 
    { name: "Norwich" },
    { name: "Nottingham" },
    { name: "Oxford" },
    { name: "Perth uk" }, 
    { name: "Peterborough" }, 
    { name: "Plymouth" },
    { name: "Portsmouth" }, 
    { name: "Preston" },
    { name: "Ripon" },
    { name: "Salford" }, 
    { name: "Salisbury uk" }, 
    { name: "Sheffield" }, 
    { name: "Southampton" }, 
    { name: "St Albans" }, 
    { name: "Stirling" },
    { name: "Stoke-on-Trent" },
    { name: "Sunderland" }, 
    { name: "Swansea" }, 
    { name: "Truro" },
    { name: "Wakefield" }, 
    { name: "Wells uk" },
    { name: "Westminster" }, 
    { name: "Winchester uk" }, 
    { name: "Wolverhampton" },
    { name: "Worcester" }, 
    { name: "York" }
  ];

  for (const city of cities) {
    await prisma.city.create({
      data: city,
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