#!/bin/bash

# Setup script for UK Pubs News System
# This script creates the news table and seeds the initial article

set -e

echo "🗞️  Setting up UK Pubs News System..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL and try again"
    exit 1
fi

echo "✅ Database URL configured"
echo ""

# Run the migration
echo "📦 Creating ukpubs_news table..."
psql "$DATABASE_URL" -f prisma/migrations/20260807120000_add_ukpubs_news_table/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Table created successfully"
else
    echo "⚠️  Table may already exist (this is okay if re-running)"
fi
echo ""

# Seed the initial article
echo "📝 Seeding vertical drinking article..."
psql "$DATABASE_URL" -f scripts/sql/seed_news_vertical_drinking.sql

if [ $? -eq 0 ]; then
    echo "✅ Article seeded successfully"
else
    echo "⚠️  Article may already exist (this is okay if re-running)"
fi
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated"
else
    echo "⚠️  Warning: Prisma client generation had issues"
fi
echo ""

echo "✨ News system setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server to see changes"
echo "2. Visit the homepage to see the featured article"
echo "3. Read the docs at docs/NEWS_SYSTEM.md for more info"
echo ""
