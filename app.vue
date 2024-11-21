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
      content: 'B3V3n6Nt0V1vu0qZJJzBRb_1B9ZdCMZgTkST-Ug3sLw',
    },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: 'public/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '96x96', href: 'public/favicon-96x96.png' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: 'public/favicon-192x192.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: 'public/apple-touch-icon.png' },
  ],
});
</script>