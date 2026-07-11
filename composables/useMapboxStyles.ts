let mapboxStylesLoaded = false

/** Load Mapbox GL CSS once (avoid bundling it globally on every route). */
export async function loadMapboxStyles() {
  if (import.meta.server || mapboxStylesLoaded) return
  mapboxStylesLoaded = true
  await import('mapbox-gl/dist/mapbox-gl.css')
}

/** Initialise a callback when the element enters (or nears) the viewport. */
export function whenVisible(
  element: Element | null | undefined,
  callback: () => void,
  rootMargin = '200px',
) {
  if (!element || import.meta.server) return () => {}

  if (typeof IntersectionObserver === 'undefined') {
    callback()
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        callback()
      }
    },
    { rootMargin },
  )

  observer.observe(element)
  return () => observer.disconnect()
}
