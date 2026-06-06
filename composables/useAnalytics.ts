type TrackPayload = {
  eventType: 'pageview' | 'share' | 'outbound'
  path: string
  label?: string
}

export function useAnalytics() {
  const route = useRoute()

  function track(payload: TrackPayload) {
    if (!import.meta.client) return

    const body = {
      ...payload,
      path: payload.path || route.path,
      referrer: document.referrer || undefined,
    }

    $fetch('/api/analytics/track', {
      method: 'POST',
      body,
    }).catch(() => {
      /* non-blocking analytics */
    })
  }

  function trackPageView(path = route.path, label?: string) {
    track({
      eventType: 'pageview',
      path,
      label: label || (import.meta.client ? document.title : undefined),
    })
  }

  function trackShare(platform: string, path = route.path) {
    track({
      eventType: 'share',
      path,
      label: platform,
    })
  }

  function trackOutbound(label: string, path = route.path) {
    track({
      eventType: 'outbound',
      path,
      label,
    })
  }

  return {
    track,
    trackPageView,
    trackShare,
    trackOutbound,
  }
}
