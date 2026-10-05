/**
 * Make the large shared Nuxt entry stylesheet non-blocking so the homepage LCP
 * hero can paint without waiting for ~500KB of Tailwind/Nuxt UI CSS.
 *
 * Only `entry.*.css` is deferred — small route CSS stays render-blocking to
 * limit layout shift. Critical hero layout is inlined on <HomeHeroSearch>.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    const transformStylesheets = (chunk: string) =>
      chunk.replace(/<link\b[^>]*>/gi, (link) => {
        if (
          !link.includes('rel="stylesheet"') ||
          !/\/_nuxt\/entry\.[^"']+\.css/.test(link) ||
          link.includes('onload=')
        ) {
          return link
        }

        const preloaded = link.replace(
          'rel="stylesheet"',
          'rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"',
        )
        return `${preloaded}<noscript>${link}</noscript>`
      })

    html.head = html.head.map((item) =>
      typeof item === 'string' ? transformStylesheets(item) : item,
    )
  })
})
