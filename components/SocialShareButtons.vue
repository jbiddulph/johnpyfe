<template>
  <div class="social-share">
    <p class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
      Share
    </p>
    <ul class="flex flex-wrap gap-2 list-none p-0 m-0">
      <li v-for="item in shareLinks" :key="item.id">
        <a
          v-if="item.href"
          :href="item.href"
          class="social-share__btn"
          :title="item.label"
          :aria-label="`Share on ${item.label}`"
          target="_blank"
          rel="noopener noreferrer"
          @click="item.onClick?.($event)"
        >
          <span class="social-share__icon" v-html="item.icon" />
          <span class="sr-only">{{ item.label }}</span>
        </a>
        <button
          v-else
          type="button"
          class="social-share__btn"
          :title="item.label"
          :aria-label="item.label"
          @click="item.onClick?.($event)"
        >
          <span class="social-share__icon" v-html="item.icon" />
          <span class="sr-only">{{ item.label }}</span>
        </button>
      </li>
    </ul>
    <p v-if="copied" class="text-sm text-green-600 dark:text-green-400 mt-2">Link copied</p>
  </div>
</template>

<script setup lang="ts">
import { resolveShareUrl } from '@/utils/site-url'

const props = defineProps<{
  title: string
  url?: string
  path?: string
}>()

const route = useRoute()
const toast = useToast()
const copied = ref(false)
const { trackShare } = useAnalytics()

const sharePath = computed(() => {
  const rawPath = props.path || route.path
  if (props.url) {
    try {
      return new URL(resolveShareUrl(props.url, siteBaseUrl())).pathname
    } catch {
      return rawPath
    }
  }
  return rawPath
})

function recordShare(platform: string) {
  trackShare(platform, sharePath.value)
}

const shareUrl = computed(() =>
  resolveShareUrl(props.url || props.path || route.path, siteBaseUrl()),
)
const encodedUrl = computed(() => encodeURIComponent(shareUrl.value))
const encodedTitle = computed(() => encodeURIComponent(props.title))

async function copyLink(platform = 'copy') {
  recordShare(platform)
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    toast.add({ title: 'Link copied', timeout: 2000 })
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Could not copy link', color: 'red' })
  }
}

const shareLinks = computed(() => [
  {
    id: 'facebook',
    label: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl.value}`,
    onClick: () => recordShare('facebook'),
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>',
  },
  {
    id: 'x',
    label: 'X',
    href: `https://twitter.com/intent/tweet?url=${encodedUrl.value}&text=${encodedTitle.value}`,
    onClick: () => recordShare('x'),
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl.value}`,
    onClick: () => recordShare('linkedin'),
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: `https://wa.me/?text=${encodeURIComponent(`${props.title} ${shareUrl.value}`)}`,
    onClick: () => recordShare('whatsapp'),
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  },
  {
    id: 'instagram',
    label: 'Copy link for Instagram',
    href: undefined,
    onClick: (event: Event) => {
      event.preventDefault()
      copyLink('instagram')
    },
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  },
  {
    id: 'email',
    label: 'Email',
    href: `mailto:?subject=${encodedTitle.value}&body=${encodedUrl.value}`,
    onClick: () => recordShare('email'),
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  },
  {
    id: 'copy',
    label: 'Copy link',
    href: undefined,
    onClick: (event: Event) => {
      event.preventDefault()
      copyLink('copy')
    },
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z"/></svg>',
  },
])
</script>

<style scoped>
.social-share__btn {
  @apply inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-blue-400 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:text-blue-400;
}

.social-share__icon :deep(svg) {
  width: 1.125rem;
  height: 1.125rem;
}
</style>
