import { prisma } from '../utils/prisma'

/**
 * Release DB connections after each serverless invocation (Netlify).
 * Pair with Supabase transaction pooler :6543?pgbouncer=true&connection_limit=1
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', async () => {
    await prisma.$disconnect()
  })
})
