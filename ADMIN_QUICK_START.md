# Admin Quick Start Guide

This guide provides quick instructions for common admin tasks.

## Admin Panel Access

### Prerequisites
1. Set `ADMIN_EMAIL` in your `.env` file to your email address
2. Ensure you're logged in with that email address

### Admin Pages

#### Dashboard
- **URL**: `/admin/dashboard`
- **Features**:
  - Bulk event creation
  - View and manage untitled events
  - View site statistics

#### News Articles
- **URL**: `/admin/news`
- **Features**:
  - Create, edit, and delete news articles
  - Toggle featured status
  - Manage article content with HTML support
  - View published articles

**Navigation**: Use the navigation bar at the top of any admin page to switch between sections.

## County Image Scraper

The county image scraper fetches high-quality images from Wikipedia and Wikimedia Commons to populate county pages.

### Prerequisites
1. Ensure `DATABASE_URL` is set in your `.env` file
2. Run county images migration (if not already done):
   ```bash
   npx prisma migrate deploy
   ```

### Running the Scraper

#### Basic Usage
```bash
npx tsx scripts/scrape_county_images.ts
```

This will scrape images for all counties in the database.

#### Test with Limited Counties
```bash
npx tsx scripts/scrape_county_images.ts --limit 5
```

This scrapes only the first 5 counties (useful for testing).

#### Adjust Request Delay
```bash
npx tsx scripts/scrape_county_images.ts --delay 2000
```

This sets a 2-second delay between requests (default is 1000ms). Increase this if you encounter rate limiting.

#### Combined Options
```bash
npx tsx scripts/scrape_county_images.ts --limit 10 --delay 1500
```

### Expected Output

```
Scraping images for 5 counties from Wikipedia/Wikimedia Commons...

Fetching image for Aberdeenshire...
✓ Cached image for Aberdeenshire

Fetching image for Anglesey...
✓ Cached image for Anglesey

Fetching image for Angus...
✗ Failed for Angus: No suitable image found

✓ Done! Updated 4, skipped 1, total 5.
```

### Troubleshooting

**No images found for a county**:
- County name might not match Wikipedia exactly
- Try manually searching Wikipedia to verify the page exists

**Database connection errors**:
- Verify `DATABASE_URL` is set correctly in `.env`
- Check that the database is accessible
- Ensure migrations have been run

**Rate limiting**:
- Increase the delay between requests: `--delay 2000`

## Other Admin Tasks

### News System Setup
See [NEWS_SYSTEM.md](docs/NEWS_SYSTEM.md) for detailed documentation on:
- Database schema
- API endpoints
- Adding articles via SQL or Prisma
- Content formatting guidelines

### Admin News and Scraper Details
See [ADMIN_NEWS_AND_COUNTY_SCRAPER.md](docs/ADMIN_NEWS_AND_COUNTY_SCRAPER.md) for comprehensive documentation on:
- Complete admin features
- Technical implementation details
- API specifications
- Testing checklist

## Quick Reference

| Task | Command/URL |
|------|-------------|
| Access admin dashboard | `/admin/dashboard` |
| Manage news articles | `/admin/news` |
| Scrape all county images | `npx tsx scripts/scrape_county_images.ts` |
| Test scraper (5 counties) | `npx tsx scripts/scrape_county_images.ts --limit 5` |
| Run database migrations | `npx prisma migrate deploy` |

## Support

For detailed documentation, see:
- [NEWS_SYSTEM.md](docs/NEWS_SYSTEM.md) - News system overview
- [ADMIN_NEWS_AND_COUNTY_SCRAPER.md](docs/ADMIN_NEWS_AND_COUNTY_SCRAPER.md) - Complete admin documentation
