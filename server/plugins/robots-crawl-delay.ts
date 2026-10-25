/**
 * @nuxtjs/robots drops `Crawl-delay` when it merges public/_robots.txt (its parser
 * only understands allow/disallow/sitemap/host/clean-param), so inject it into the
 * generated robots.txt here. Google ignores the directive; Bing, Yandex, Seznam and
 * most well-behaved third-party crawlers honour it, which caps how fast they can
 * walk the ~50k venue pages and is a direct bandwidth saving.
 */
const CRAWL_DELAY_SECONDS = 10

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('robots:robots-txt', (ctx) => {
    if (/^crawl-delay:/im.test(ctx.robotsTxt)) return
    ctx.robotsTxt = ctx.robotsTxt.replace(
      /^(user-agent:[ \t]*\*[ \t]*)$/gim,
      `$1\nCrawl-delay: ${CRAWL_DELAY_SECONDS}`,
    )
  })
})
