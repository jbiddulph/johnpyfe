import { requireAuth } from '../../utils/require-auth'
import { ensureUkpubsProfile, searchUkpubsProfiles } from '../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await ensureUkpubsProfile(user)

  const q = String(getQuery(event).q || '').trim()
  if (q.length < 3) return []

  const results = await searchUkpubsProfiles(q, user.id, 10)
  return results.map((row) => ({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
  }))
})
