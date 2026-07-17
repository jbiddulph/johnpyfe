<template>
  <UModal v-model="isOpen" :prevent-close="false">
    <UCard
      :ui="{
        ring: '',
        divide: 'divide-y divide-gray-100 dark:divide-gray-800',
      }"
    >
      <template #header>
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <UIcon name="i-heroicons-map-20-solid" class="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                New Feature: Pub Crawl Builder
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Plan your perfect pub crawl
              </p>
            </div>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Close"
            @click="handleClose"
          />
        </div>
      </template>

      <div class="space-y-4 py-4">
        <p class="text-base text-gray-700 dark:text-gray-300">
          We're excited to announce our brand new <strong>Pub Crawl Builder</strong> feature! 
          Now you can easily plan and organize your perfect pub crawl across the UK.
        </p>

        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
              <UIcon name="i-heroicons-map-pin-20-solid" class="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">Add Venues</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Search and add pubs to your crawl. See the route plotted on an interactive map with walking distances.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
              <UIcon name="i-heroicons-user-group-20-solid" class="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">Invite Friends</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Share your pub crawl with friends and let them view the route. Set start times and add helpful notes.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
              <UIcon name="i-heroicons-chat-bubble-left-right-20-solid" class="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">Chat & Coordinate</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Use the built-in chat feature to coordinate with your group. Track progress as you go from pub to pub.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p class="text-sm text-amber-900 dark:text-amber-100">
            <strong>Pro tip:</strong> Allow location access to automatically check in when you arrive within 50 meters of each venue!
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <UButton
            color="gray"
            variant="ghost"
            label="Maybe later"
            @click="handleClose"
          />
          <UButton
            color="amber"
            label="Try Pub Crawl Builder"
            to="/map"
            @click="handleClose"
          />
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const STORAGE_KEY = 'ukpubs-crawl-announcement-seen'

const isOpen = ref(false)

const hasSeenAnnouncement = () => {
  if (import.meta.client) {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  }
  return false
}

const markAnnouncementSeen = () => {
  if (import.meta.client) {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch (err) {
      console.warn('Failed to save announcement state:', err)
    }
  }
}

const handleClose = () => {
  isOpen.value = false
  markAnnouncementSeen()
}

onMounted(() => {
  if (!hasSeenAnnouncement()) {
    setTimeout(() => {
      isOpen.value = true
    }, 800)
  }
})
</script>
