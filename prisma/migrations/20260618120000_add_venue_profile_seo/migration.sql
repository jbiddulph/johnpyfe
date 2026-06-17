-- Owner-editable SEO fields for claimed pub pages
ALTER TABLE "venue_profiles" ADD COLUMN "seo_keywords" VARCHAR(500);
ALTER TABLE "venue_profiles" ADD COLUMN "meta_description" VARCHAR(500);
