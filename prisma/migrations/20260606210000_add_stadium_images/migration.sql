-- CreateTable
CREATE TABLE "stadium_images" (
    "slug" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "attribution" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stadium_images_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "town_images" (
    "slug" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "attribution" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_images_pkey" PRIMARY KEY ("slug")
);
