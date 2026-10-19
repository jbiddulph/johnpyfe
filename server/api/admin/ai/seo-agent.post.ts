import { requireAdmin } from '../../../utils/require-admin'
import { getLiveSeoRun, nextSeoRunLimit, runDailySeoAgent, stopSeoRuns } from '../../../utils/ai/seo-agent'

/**
 * Start or stop a manual SEO agent batch. Work runs in-process (no Netlify
 * scheduled/background SEO functions).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  if (String(body?.action || '') === 'stop') {
    return stopSeoRuns('Stopped by admin')
  }

  const live = await getLiveSeoRun()
  if (live) {
    return {
      started: false,
      alreadyRunning: true,
      run: live,
    }
  }

  const limit = await nextSeoRunLimit(body?.limit)
  if (limit <= 0) {
    return {
      started: false,
      dailyLimitReached: true,
      limit: 0,
    }
  }

  void (async () => {
    let runId: string | undefined
    let remaining = limit
    for (;;) {
      const result = await runDailySeoAgent(remaining, { runId })
      if ('skipped' in result && result.skipped) break
      if (!result.shouldContinue || result.status !== 'running') break
      runId = result.id
      remaining = result.requestedLimit
    }
  })().catch((error) => {
    console.error('[seo-agent] manual run failed', (error as Error).message)
  })

  return {
    started: true,
    limit,
  }
})
