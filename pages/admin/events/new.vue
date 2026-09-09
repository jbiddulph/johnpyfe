<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold">Add event</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Search for the venue, then fill in the event details. Photos are optional.
        </p>
      </div>
      <UButton to="/events" color="gray" variant="soft" icon="i-heroicons-arrow-left-20-solid" label="Back to events" />
    </div>

    <UCard v-if="isAdmin">
      <EventAddEvent @closeModal="onSaved" />
    </UCard>
    <p v-else class="text-gray-600 dark:text-gray-400">Checking permissions…</p>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
const { user, isAdmin, initializeAuth } = useAuth()

const breadcrumbItems = [
  { label: 'Home', to: '/' },
  { label: 'Admin', to: '/admin/dashboard' },
  { label: 'Add event' },
]

function onSaved() {
  toast.add({ title: 'Event added', description: 'The new event has been saved.' })
  navigateTo('/events')
}

watchEffect(() => {
  if (!isAdmin.value && user.value !== null) {
    navigateTo('/')
  }
})

onMounted(async () => {
  await initializeAuth()
})

useSiteSeo({
  title: 'Admin — add event',
  description: 'Add a new event to a pub or venue.',
  path: '/admin/events/new',
})
</script>
