<template>
  <div class="container mx-auto p-4 my-8">
    <Breadcrumbs :items="breadcrumbItems" />
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold">Add venue</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Create a new pub or venue listing. You can add photos, fix the map pin and add events once it's saved.
        </p>
      </div>
      <UButton to="/venues" color="gray" variant="soft" icon="i-heroicons-arrow-left-20-solid" label="Back to venues" />
    </div>

    <UCard v-if="isAdmin" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
      <VenueAddEditVenue :editing="false" @closeModal="onSaved" />
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
  { label: 'Add venue' },
]

function onSaved() {
  toast.add({ title: 'Venue added', description: 'The new venue has been saved.' })
  navigateTo('/venues')
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
  title: 'Admin — add venue',
  description: 'Add a new pub or venue listing.',
  path: '/admin/venues/new',
})
</script>
