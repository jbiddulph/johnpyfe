-- CreateTable
CREATE TABLE "ukpubs_news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "author_name" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ukpubs_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ukpubs_news_slug_key" ON "ukpubs_news"("slug");

-- CreateIndex
CREATE INDEX "ukpubs_news_is_featured_published_at_idx" ON "ukpubs_news"("is_featured", "published_at" DESC);

-- CreateIndex
CREATE INDEX "ukpubs_news_published_at_idx" ON "ukpubs_news"("published_at" DESC);
