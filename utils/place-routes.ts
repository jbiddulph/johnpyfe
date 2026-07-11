/** County hub, town hub, and venue detail routes that show a loading spinner on navigation. */
export function isPlaceRoute(path: string) {
  return (
    /^\/county\/[^/]+/.test(path) ||
    /^\/town\/[^/]+/.test(path) ||
    /^\/venues\/\d+/.test(path)
  )
}
