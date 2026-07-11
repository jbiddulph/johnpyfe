-- Pub claim organisations, memberships, claims, and owner profiles

CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'none',
    "subscription_status" TEXT,
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organisations_stripe_customer_id_key" ON "organisations"("stripe_customer_id");
CREATE UNIQUE INDEX "organisations_stripe_subscription_id_key" ON "organisations"("stripe_subscription_id");

CREATE TABLE "organisation_members" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organisation_members_organisation_id_user_id_key" ON "organisation_members"("organisation_id", "user_id");
CREATE INDEX "organisation_members_user_id_idx" ON "organisation_members"("user_id");

ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "venue_claims" (
    "id" TEXT NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,

    CONSTRAINT "venue_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "venue_claims_venue_id_key" ON "venue_claims"("venue_id");
CREATE INDEX "venue_claims_organisation_id_idx" ON "venue_claims"("organisation_id");
CREATE INDEX "venue_claims_status_idx" ON "venue_claims"("status");

ALTER TABLE "venue_claims" ADD CONSTRAINT "venue_claims_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_claims" ADD CONSTRAINT "venue_claims_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "venue_profiles" (
    "venue_id" INTEGER NOT NULL,
    "logo_url" TEXT,
    "header_image_url" TEXT,
    "menu_food_url" TEXT,
    "menu_drinks_url" TEXT,
    "social_links" JSONB,
    "custom_description" VARCHAR(5000),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_profiles_pkey" PRIMARY KEY ("venue_id")
);

ALTER TABLE "venue_profiles" ADD CONSTRAINT "venue_profiles_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
