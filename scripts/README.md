# Scripts Directory

This directory contains utility scripts for the UK Pubs application.

## News System Setup

### `setup-news-system.sh`
Automated setup script for the news article system.

**What it does:**
1. Creates the `ukpubs_news` database table
2. Seeds the initial article about vertical drinking
3. Generates the Prisma client

**Usage:**
```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://..."

# Run the setup script
./scripts/setup-news-system.sh
```

## SQL Scripts

### `sql/seed_news_vertical_drinking.sql`
Seeds the initial featured article about vertical drinking at pubs.

**Manual usage:**
```bash
psql $DATABASE_URL -f scripts/sql/seed_news_vertical_drinking.sql
```

### Other SQL Scripts
- `ukpubs_pub_crawls.sql` - Pub crawl related schema/data
- `ukpubs_crawl_schedule.sql` - Crawl scheduling data
- `ukpubs_profiles_on_signup.sql` - User profile initialization

## Other Scripts

### `enrich_county_images.ts`
Enriches county data with images.

### `build-production.js`
Production build script with optimizations.

### `analyze-bundle.js`
Analyzes the bundle size and generates reports.

## Development Tips

1. Always test scripts in a development environment first
2. Ensure environment variables are set before running scripts
3. Check script permissions: `chmod +x script-name.sh`
4. Review script contents before execution for safety
