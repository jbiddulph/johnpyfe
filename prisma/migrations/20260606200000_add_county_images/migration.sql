-- CreateTable
CREATE TABLE "county_images" (
    "slug" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "attribution" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "county_images_pkey" PRIMARY KEY ("slug")
);
