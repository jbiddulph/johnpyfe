-- Multiple owner header images for venue profile carousel
ALTER TABLE "venue_profiles" ADD COLUMN "header_image_urls" JSONB;
