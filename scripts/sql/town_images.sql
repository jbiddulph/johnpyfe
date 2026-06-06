-- Town hub card / page hero images (Google Places photos cached by town slug)
CREATE TABLE IF NOT EXISTS "town_images" (
    "slug" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "attribution" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "town_images_pkey" PRIMARY KEY ("slug")
);
