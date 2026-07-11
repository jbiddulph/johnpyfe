import { PrismaClient } from '@prisma/client'

/**
 * Single Prisma instance per serverless isolate (required on Netlify).
 * Use Supabase Transaction pooler on port 6543 with ?pgbouncer=true in DATABASE_URL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

globalForPrisma.prisma = prisma
