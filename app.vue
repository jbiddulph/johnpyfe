<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
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
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Kanit:wght@100;300;400;700&display=swap' }, // Load specific font weights
  ],
});
</script>