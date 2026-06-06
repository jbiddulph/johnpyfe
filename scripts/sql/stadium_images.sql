-- Premier League stadium hub card / page hero images (Google Places photos cached by club slug)
CREATE TABLE IF NOT EXISTS "stadium_images" (
    "slug" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "attribution" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stadium_images_pkey" PRIMARY KEY ("slug")
);
