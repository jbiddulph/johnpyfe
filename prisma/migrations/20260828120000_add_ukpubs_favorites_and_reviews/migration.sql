-- CreateTable
CREATE TABLE "ukpubs_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ukpubs_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ukpubs_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "venue_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ukpubs_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ukpubs_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "ukpubs_favorites_user_id_venue_id_key" ON "ukpubs_favorites"("user_id", "venue_id");

-- CreateIndex
CREATE INDEX "ukpubs_favorites_user_id_created_at_idx" ON "ukpubs_favorites"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ukpubs_favorites_venue_id_idx" ON "ukpubs_favorites"("venue_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukpubs_reviews_user_id_venue_id_key" ON "ukpubs_reviews"("user_id", "venue_id");

-- CreateIndex
CREATE INDEX "ukpubs_reviews_venue_id_created_at_idx" ON "ukpubs_reviews"("venue_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ukpubs_reviews_user_id_idx" ON "ukpubs_reviews"("user_id");

-- AddForeignKey
ALTER TABLE "ukpubs_favorites" ADD CONSTRAINT "ukpubs_favorites_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ukpubs_reviews" ADD CONSTRAINT "ukpubs_reviews_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep updated_at in sync for SQL-side updates
CREATE OR REPLACE FUNCTION public.ukpubs_reviews_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ukpubs_reviews_updated_at ON public.ukpubs_reviews;
CREATE TRIGGER ukpubs_reviews_updated_at
    BEFORE UPDATE ON public.ukpubs_reviews
    FOR EACH ROW
    EXECUTE PROCEDURE public.ukpubs_reviews_set_updated_at();

-- RLS: Prisma (table owner) still bypasses these policies.
-- Policies/grants are skipped on databases without Supabase roles.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       AND EXISTS (
         SELECT 1
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'auth' AND p.proname = 'uid'
       )
    THEN
        EXECUTE 'ALTER TABLE public.ukpubs_favorites ENABLE ROW LEVEL SECURITY';
        EXECUTE 'ALTER TABLE public.ukpubs_reviews ENABLE ROW LEVEL SECURITY';

        EXECUTE 'DROP POLICY IF EXISTS ukpubs_favorites_select_own ON public.ukpubs_favorites';
        EXECUTE 'CREATE POLICY ukpubs_favorites_select_own ON public.ukpubs_favorites FOR SELECT TO authenticated USING (user_id = auth.uid()::text)';
        EXECUTE 'DROP POLICY IF EXISTS ukpubs_favorites_insert_own ON public.ukpubs_favorites';
        EXECUTE 'CREATE POLICY ukpubs_favorites_insert_own ON public.ukpubs_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text)';
        EXECUTE 'DROP POLICY IF EXISTS ukpubs_favorites_delete_own ON public.ukpubs_favorites';
        EXECUTE 'CREATE POLICY ukpubs_favorites_delete_own ON public.ukpubs_favorites FOR DELETE TO authenticated USING (user_id = auth.uid()::text)';

        EXECUTE 'DROP POLICY IF EXISTS ukpubs_reviews_select_all ON public.ukpubs_reviews';
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE 'CREATE POLICY ukpubs_reviews_select_all ON public.ukpubs_reviews FOR SELECT TO anon, authenticated USING (true)';
            EXECUTE 'GRANT SELECT ON public.ukpubs_reviews TO anon';
        ELSE
            EXECUTE 'CREATE POLICY ukpubs_reviews_select_all ON public.ukpubs_reviews FOR SELECT TO authenticated USING (true)';
        END IF;

        EXECUTE 'DROP POLICY IF EXISTS ukpubs_reviews_insert_own ON public.ukpubs_reviews';
        EXECUTE 'CREATE POLICY ukpubs_reviews_insert_own ON public.ukpubs_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text)';
        EXECUTE 'DROP POLICY IF EXISTS ukpubs_reviews_update_own ON public.ukpubs_reviews';
        EXECUTE 'CREATE POLICY ukpubs_reviews_update_own ON public.ukpubs_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text)';
        EXECUTE 'DROP POLICY IF EXISTS ukpubs_reviews_delete_own ON public.ukpubs_reviews';
        EXECUTE 'CREATE POLICY ukpubs_reviews_delete_own ON public.ukpubs_reviews FOR DELETE TO authenticated USING (user_id = auth.uid()::text)';

        EXECUTE 'GRANT SELECT, INSERT, DELETE ON public.ukpubs_favorites TO authenticated';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.ukpubs_reviews TO authenticated';
    END IF;
END $$;
