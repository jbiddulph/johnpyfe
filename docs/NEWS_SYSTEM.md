# News System Documentation

## Overview
The UK Pubs site now includes a news article system that allows for featured articles to be displayed on the homepage.

## Database Setup

### 1. Run the Migration
To create the `ukpubs_news` table in your database:

```bash
# Using Prisma
npx prisma migrate deploy

# Or manually execute the migration SQL
psql $DATABASE_URL -f prisma/migrations/20260807120000_add_ukpubs_news_table/migration.sql
```

### 2. Seed the Initial Article
To add the featured article about vertical drinking:

```bash
psql $DATABASE_URL -f scripts/sql/seed_news_vertical_drinking.sql
```

## Database Schema

The `ukpubs_news` table includes:

- `id` (UUID) - Primary key
- `title` - Article title
- `slug` - URL-friendly identifier (unique)
- `excerpt` - Short summary (max 500 chars)
- `content` - Full article content (HTML supported)
- `image_url` - Optional header image
- `author_name` - Article author
- `is_featured` - Boolean flag for homepage feature
- `published_at` - Publication date/time
- `created_at` / `updated_at` - Timestamps

## API Endpoints

### Get Featured Article
```
GET /api/news/featured
```
Returns the most recently published featured article (cached 5 minutes).

**Response:**
```json
{
  "id": "uuid",
  "title": "Article Title",
  "slug": "article-slug",
  "excerpt": "Brief summary...",
  "content": "<p>Full content...</p>",
  "imageUrl": null,
  "authorName": "Author Name",
  "publishedAt": "2026-08-07T12:00:00.000Z"
}
```

### Get Article by Slug
```
GET /api/news/{slug}
```
Returns a specific article by its slug.

**Example:** `/api/news/defence-of-vertical-drinking`

## Components

### HomeFeaturedNews
Displays the featured article on the homepage with:
- Eye-catching amber/orange gradient design
- Article title, excerpt, author, and date
- Call-to-action button to read full article

**Usage:**
```vue
<HomeFeaturedNews :article="featuredNews" />
```

## Adding New Articles

### Via SQL
```sql
INSERT INTO ukpubs_news (
    id,
    title,
    slug,
    excerpt,
    content,
    author_name,
    is_featured,
    published_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Your Article Title',
    'your-article-slug',
    'Brief excerpt about the article...',
    '<p>Full article content with HTML...</p>',
    'Author Name',
    false,  -- Set to true to feature on homepage
    NOW(),
    NOW(),
    NOW()
);
```

### Via Prisma
```typescript
await prisma.ukpubsNews.create({
  data: {
    title: 'Your Article Title',
    slug: 'your-article-slug',
    excerpt: 'Brief excerpt...',
    content: '<p>Full content...</p>',
    authorName: 'Author Name',
    isFeatured: true,
  }
})
```

## Featured Article Guidelines

- Only **one** article should have `is_featured = true` at a time
- The system will display the most recently published featured article
- Excerpts should be concise (under 500 characters)
- Content can include HTML for rich formatting
- Use semantic HTML: `<h3>`, `<p>`, `<strong>`, etc.

## Content Formatting

The article detail page uses Tailwind Typography (`prose`) for styling. Supported HTML:

- Headings: `<h3>`, `<h4>`, `<h5>`
- Paragraphs: `<p>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Emphasis: `<strong>`, `<em>`
- Links: `<a href="...">`

## Routes

- Homepage: Featured article displayed below hero section
- Article detail: `/news/{slug}` - Full article view

## Caching

Both API endpoints use 5-minute caching:
- In-memory cache for featured article
- HTTP Cache-Control headers (`s-maxage=300, stale-while-revalidate=3600`)

To clear cache: Restart the server or wait 5 minutes.

## Future Enhancements

Potential improvements to consider:
- Admin interface for managing articles
- Categories/tags for articles
- Article archive/listing page
- RSS feed
- Social sharing metadata (Open Graph, Twitter Cards)
- Image upload functionality
- Draft/scheduled publishing
