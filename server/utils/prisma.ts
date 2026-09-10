import { PrismaClient } from '@prisma/client'

/**
 * Single Prisma instance per serverless isolate (required on Netlify).
 *
 * Prefer the Supabase Transaction pooler (port 6543) with `?pgbouncer=true`.
 * Each isolate must open at most one connection — concurrent Netlify functions
 * (SEO workers, map, admin) otherwise exhaust the pool and surface:
 *   "Timed out fetching a new connection from the connection pool"
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function withServerlessPoolParams(url: string | undefined) {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '1')
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      // Inventory + OpenAI can hold the isolate busy; wait a bit longer than the 10s default.
      parsed.searchParams.set('pool_timeout', '30')
    }
    if (!parsed.searchParams.has('pgbouncer') && /pooler\.supabase\.com|:6543\b/.test(url)) {
      parsed.searchParams.set('pgbouncer', 'true')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

const databaseUrl = withServerlessPoolParams(process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
  })

globalForPrisma.prisma = prisma
