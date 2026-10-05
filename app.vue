<template>
  <div>
    <NuxtLoadingIndicator color="#0E8579" :height="3" />
    <PlaceRouteSpinner />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Non-blocking: SEO overrides hydrate when ready. Awaiting this previously
// added ~1.5s to every SSR response on a cold Prisma connection (hurts LCP).
loadSiteSeoConfigIntoState()

useHead({
  meta: [
    {
      name: 'google-site-verification',
      content: 'nCu8tBxLkTVdLTsiS8ZXncoEdlueAMq6m5awdZ5fqCE',
    },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-192x192.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' },
  ],
  // Minimal paint styles before the deferred entry.css arrives (homepage LCP).
  style: [
    {
      key: 'critical-lcp',
      innerHTML:
        'html,body{margin:0;background:#F6F3EE;color:#1c1917}' +
        'body{font-family:Kanit,ui-sans-serif,system-ui,sans-serif}' +
        'img{max-width:100%;height:auto}',
    },
  ],
});
</script>