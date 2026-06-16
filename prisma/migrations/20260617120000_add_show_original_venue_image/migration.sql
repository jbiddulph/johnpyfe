-- Option to include the venue's original listing photo in the owner header carousel
ALTER TABLE "venue_profiles" ADD COLUMN "show_original_venue_image" BOOLEAN NOT NULL DEFAULT false;
