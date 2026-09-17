import { isPubAssistantConfigured } from '../../utils/ai/pub-assistant'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return {
    configured: isPubAssistantConfigured(),
  }
})
