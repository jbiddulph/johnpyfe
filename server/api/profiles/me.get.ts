import { requireAuth } from '../../utils/require-auth'
import { ensureUkpubsProfile } from '../../utils/crawl-profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const profile = await ensureUkpubsProfile(user)
  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
  }
})
