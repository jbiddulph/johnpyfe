-- CreateTable
CREATE TABLE "Venue" (
    "id" SERIAL NOT NULL,
    "fsa_id" INTEGER NOT NULL,
    "venuename" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "venuetype" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address2" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "postalsearch" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "easting" TEXT NOT NULL,
    "northing" TEXT NOT NULL,
    "latitude" TEXT NOT NULL,
    "longitude" TEXT NOT NULL,
    "local_authority" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "is_live" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "event_title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "event_start" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
