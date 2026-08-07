# Admin News Section and County Image Scraper

This document provides details on the new admin features added to manage news articles and scrape county images.

## Admin News Section

### Overview
A complete CRUD (Create, Read, Update, Delete) interface for managing news articles through an admin panel.

### Access
- URL: `/admin/news`
- Requires: Admin authentication (configured via `ADMIN_EMAIL` in environment)

### Features

#### 1. List Articles
- Grid view showing all articles with thumbnails
- Pagination support (10 articles per page)
- Shows: title, excerpt, author, publish date, featured status
- Quick action buttons: Edit, Delete, View

#### 2. Create Article
- Click "New Article" button
- Required fields:
  - Title
  - Excerpt (max 500 characters)
  - Content (supports HTML)
  - Author Name
  - Published Date
- Optional fields:
  - Image URL
  - Slug (auto-generated from title if empty)
  - Featured checkbox

#### 3. Edit Article
- Click "Edit" on any article
- Pre-fills form with existing data
- Slug uniqueness is maintained on update

#### 4. Delete Article
- Click "Delete" button
- Confirmation modal appears
- Permanent deletion from database

### API Endpoints

All endpoints require admin authentication via bearer token.

#### List Articles
```
GET /api/admin/news?page=1&limit=10
```
Returns paginated list of articles.

#### Get Single Article
```
GET /api/admin/news/[id]
```
Returns full article details including content.

#### Create Article
```
POST /api/admin/news
Content-Type: application/json

{
  "title": "Article Title",
  "excerpt": "Brief summary",
  "content": "<p>Full article content</p>",
  "authorName": "John Doe",
  "imageUrl": "https://example.com/image.jpg",
  "isFeatured": false,
  "publishedAt": "2024-01-01T12:00:00Z"
}
```

#### Update Article
```
PUT /api/admin/news/[id]
Content-Type: application/json

{
  "title": "Updated Title",
  "excerpt": "Updated summary",
  "content": "<p>Updated content</p>",
  "authorName": "John Doe",
  "imageUrl": "https://example.com/image.jpg",
  "isFeatured": true,
  "publishedAt": "2024-01-01T12:00:00Z"
}
```

#### Delete Article
```
DELETE /api/admin/news/[id]
```

---

## County Image Scraper

### Overview
A web scraping solution to fetch high-quality county images from Wikipedia and Wikimedia Commons, replacing the Google Places API dependency.

### Why Web Scraping?
- **No API costs**: Free to use
- **Better images**: Wikipedia has curated, high-quality county images
- **Proper attribution**: Automatic attribution from Wikipedia
- **No rate limits**: More generous than commercial APIs

### How It Works

The scraper:
1. Searches Wikipedia for the county page
2. Extracts the main infobox image
3. Falls back to Wikimedia Commons if no suitable image found
4. Stores image URL and attribution in database

### Usage

#### Basic Usage
```bash
# Scrape all counties
npx tsx scripts/scrape_county_images.ts

# Limit to first 10 counties (for testing)
npx tsx scripts/scrape_county_images.ts --limit 10

# Adjust delay between requests (default 1000ms)
npx tsx scripts/scrape_county_images.ts --delay 2000
```

#### Requirements
- `DATABASE_URL` must be set in environment variables
- Run county_images migration first:
  ```bash
  npx prisma migrate deploy
  ```

### Script Options

| Option | Default | Description |
|--------|---------|-------------|
| `--limit` | (none) | Limit number of counties to process |
| `--delay` | 1000 | Milliseconds to wait between requests |

### Technical Details

#### Files Created/Modified

**New Files:**
- `server/utils/county-scraper.ts` - Web scraping logic
- `scripts/scrape_county_images.ts` - CLI script

**Modified Files:**
- `server/utils/county-images.ts` - Added `refreshAllCountyImagesFromWeb()` function

#### Functions

##### `fetchCountyImageFromWeb(countyName: string)`
Main function that tries multiple sources:
1. Wikipedia page search
2. Wikipedia image extraction
3. Wikimedia Commons fallback

Returns:
```typescript
{
  photoUrl: string,
  attribution: string | null
}
```

##### `scrapeCountyImageFromWikipedia(countyName: string)`
Searches Wikipedia specifically for county pages.

##### `scrapeCountyImageFromCommons(countyName: string)`
Searches Wikimedia Commons for landscape images.

### Example Output

```
Scraping images for 5 counties from Wikipedia/Wikimedia Commons...

Fetching image for Aberdeenshire...
✓ Cached image for Aberdeenshire

Fetching image for Anglesey...
✓ Cached image for Anglesey

Fetching image for Angus...
✗ Failed for Angus: No suitable image found

Fetching image for Argyll and Bute...
✓ Cached image for Argyll and Bute

Fetching image for Ayrshire...
✓ Cached image for Ayrshire

✓ Done! Updated 4, skipped 1, total 5.
```

### Comparison: Google Places vs Web Scraping

| Feature | Google Places API | Web Scraping |
|---------|-------------------|--------------|
| Cost | $$$$ | Free |
| Image Quality | Variable | High |
| Attribution | Required | Included |
| Rate Limits | Strict | Generous |
| Setup | API Key needed | None |
| Coverage | Good | Excellent |

### Image Storage

Images are stored in the `county_images` table:

```sql
CREATE TABLE county_images (
  slug TEXT PRIMARY KEY,
  photo_url TEXT NOT NULL,
  attribution TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Troubleshooting

#### "No photo found for [County]"
- County name might not match Wikipedia exactly
- Try manual search on Wikipedia to verify page exists
- Some counties use historical names

#### "Failed for [County]"
- Check network connectivity
- Verify Wikipedia is accessible
- Increase delay between requests

#### Database connection errors
- Ensure `DATABASE_URL` is set correctly
- Check database is accessible
- Verify migrations have been run

---

## Testing

### Manual Testing Checklist

#### Admin News Section
- [ ] Access `/admin/news` as admin user
- [ ] Create a new article with all fields
- [ ] Create an article with auto-generated slug
- [ ] Edit an existing article
- [ ] Toggle featured status
- [ ] Delete an article
- [ ] View article on frontend at `/news/[slug]`
- [ ] Test pagination with 10+ articles

#### County Image Scraper
- [ ] Run script with `--limit 3` to test
- [ ] Verify images are stored in database
- [ ] Check county cards show images on `/counties`
- [ ] Verify attribution is displayed
- [ ] Test with missing county image
- [ ] Run full scrape for all counties

### Automated Testing

```bash
# Type checking
npx nuxi typecheck

# Build test
npm run build

# Run dev server
npm run dev
```

---

## Future Enhancements

### Admin News
- [ ] Rich text editor (WYSIWYG)
- [ ] Image upload functionality
- [ ] Draft/publish workflow
- [ ] Article categories/tags
- [ ] Search and filtering
- [ ] Bulk operations

### County Images
- [ ] Retry failed counties
- [ ] Image quality validation
- [ ] Alternative image sources
- [ ] Automatic image updates
- [ ] Image caching optimization

---

## Support

For issues or questions:
1. Check this documentation first
2. Review error messages in console
3. Check database connectivity
4. Verify environment variables are set correctly
