<template>
  <UCard :ui="{ body: { padding: 'p-4' }, ring: accent === 'emerald' ? 'ring-1 ring-emerald-300' : '' }">
    <div class="space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ crawl.name }}</h3>
            <span
              class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              :class="isOwner
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                : 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100'"
            >
              {{ isOwner ? 'Creator' : 'Invited' }}
            </span>
            <span
              v-if="crawl.completedAt"
              class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              Completed
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">
            <template v-if="!isOwner && invitedByLabel">
              Invited by {{ invitedByLabel }}
              ·
            </template>
            {{ crawl.stopCount }} stop{{ crawl.stopCount === 1 ? '' : 's' }}
            <template v-if="crawl.stopCount">
              · progress {{ Math.min(crawl.currentStopIndex + 1, crawl.stopCount) }}/{{ crawl.stopCount }}
            </template>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton size="xs" color="amber" variant="soft" to="/map" label="View on map" />
          <UButton
            v-if="isOwner"
            size="xs"
            color="gray"
            variant="soft"
            label="Invite"
            @click="$emit('invite')"
          />
          <UButton
            v-if="isOwner && !crawl.completedAt"
            size="xs"
            color="emerald"
            variant="soft"
            label="Mark complete"
            @click="$emit('complete')"
          />
          <UButton
            v-if="isOwner && crawl.completedAt"
            size="xs"
            color="gray"
            variant="soft"
            label="Reopen"
            @click="$emit('reopen')"
          />
          <UButton
            v-if="isOwner"
            size="xs"
            color="red"
            variant="ghost"
            icon="i-heroicons-trash-20-solid"
            :loading="deleting"
            aria-label="Delete crawl"
            @click="deleteCrawl"
          />
        </div>
      </div>

      <div>
        <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Who’s on this crawl</h4>
        <ul v-if="crawl.members?.length" class="flex flex-wrap gap-2">
          <li
            v-for="member in crawl.members"
            :key="`${member.userId}-${member.status}`"
            class="rounded-full border px-2.5 py-1 text-xs"
            :class="member.status === 'pending'
              ? 'border-dashed border-amber-400 text-amber-800 dark:text-amber-200'
              : 'border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-200'"
          >
            @{{ member.username }}
            <span class="text-gray-500">
              · {{ member.role === 'owner' ? 'creator' : member.status }}
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-gray-500">Just you so far.</p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  crawl: {
    id: string
    name: string
    stopCount: number
    currentStopIndex: number
    completedAt: string | null
    canEdit: boolean
    role?: 'owner' | 'member'
    invitedBy?: { userId: string; username: string; displayName: string } | null
    owner?: { userId: string; username: string; displayName: string } | null
    members?: Array<{
      userId: string
      username: string
      displayName: string
      status: string
      role: string
    }>
  }
  accent?: 'emerald' | 'gray'
}>()

const emit = defineEmits<{
  invite: []
  complete: []
  reopen: []
  deleted: []
}>()

const isOwner = computed(() => props.crawl.role === 'owner' && props.crawl.canEdit === true)

const invitedByLabel = computed(() => {
  const inviter = props.crawl.invitedBy || props.crawl.owner
  if (!inviter) return ''
  if (inviter.displayName && inviter.username) {
    return `${inviter.displayName} (@${inviter.username})`
  }
  return inviter.displayName || (inviter.username ? `@${inviter.username}` : '')
})

const deleting = ref(false)

async function deleteCrawl() {
  if (!isOwner.value) return
  if (!confirm(`Delete “${props.crawl.name}”? This cannot be undone.`)) return
  deleting.value = true
  try {
    await useAuthFetch(`/api/crawls/${props.crawl.id}`, { method: 'DELETE' })
    emit('deleted')
  } catch (err: any) {
    alert(err?.data?.statusMessage || err?.message || 'Could not delete crawl')
  } finally {
    deleting.value = false
  }
}
</script>
