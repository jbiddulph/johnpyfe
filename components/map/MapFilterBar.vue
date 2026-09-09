<template>
  <div class="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="container mx-auto flex flex-wrap items-center gap-2 px-4 py-2">
      <span class="mr-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <UIcon name="i-heroicons-funnel-20-solid" class="h-4 w-4" />
        Filter
      </span>

      <USelectMenu
        v-model="typeModel"
        size="sm"
        color="white"
        class="min-w-[9rem]"
        :options="typeOptions"
        option-attribute="label"
        value-attribute="value"
        placeholder="Venue type"
        searchable
        searchable-placeholder="Search types…"
      />

      <USelectMenu
        v-model="featuresModel"
        size="sm"
        color="white"
        class="min-w-[10rem]"
        :options="featureOptions"
        option-attribute="label"
        value-attribute="key"
        multiple
        placeholder="Features"
      >
        <template #label>
          <span v-if="featuresModel.length" class="truncate">
            {{ featuresModel.length === 1 ? featureLabel(featuresModel[0]) : `${featuresModel.length} features` }}
          </span>
          <span v-else class="text-gray-500">Features</span>
        </template>
      </USelectMenu>

      <UButton
        size="sm"
        :color="modelValue.hasEvents ? 'primary' : 'gray'"
        :variant="modelValue.hasEvents ? 'solid' : 'soft'"
        icon="i-heroicons-calendar-days-20-solid"
        label="Upcoming events"
        :aria-pressed="modelValue.hasEvents"
        @click="update({ hasEvents: !modelValue.hasEvents })"
      />
      <UButton
        size="sm"
        :color="modelValue.hasPhoto ? 'primary' : 'gray'"
        :variant="modelValue.hasPhoto ? 'solid' : 'soft'"
        icon="i-heroicons-photo-20-solid"
        label="Has photo"
        :aria-pressed="modelValue.hasPhoto"
        @click="update({ hasPhoto: !modelValue.hasPhoto })"
      />

      <USelectMenu
        v-model="nearMeModel"
        size="sm"
        color="white"
        class="min-w-[10rem]"
        :options="nearMeOptions"
        option-attribute="label"
        value-attribute="value"
        :disabled="!hasLocation"
        :title="hasLocation ? 'Only show pubs within this distance of you' : 'Share your location to filter by distance'"
      >
        <template #leading>
          <UIcon name="i-heroicons-map-pin-20-solid" class="h-4 w-4" :class="hasLocation ? 'text-primary-600' : 'text-gray-400'" />
        </template>
      </USelectMenu>

      <UButton
        v-if="!hasLocation"
        size="sm"
        color="primary"
        variant="soft"
        icon="i-heroicons-viewfinder-circle-20-solid"
        :label="locating ? 'Finding you…' : 'Use my location'"
        :loading="locating"
        @click="$emit('locate')"
      />
      <span v-else class="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <span class="h-2 w-2 rounded-full bg-emerald-500" />
        Location on
      </span>

      <div class="ml-auto flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>
          <strong class="text-gray-900 dark:text-white">{{ shown.toLocaleString() }}</strong>
          <span v-if="shown !== total"> of {{ total.toLocaleString() }}</span>
          {{ shown === 1 ? 'pub' : 'pubs' }}
        </span>
        <UButton
          v-if="activeCount"
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-x-mark-20-solid"
          :label="`Clear ${activeCount}`"
          @click="$emit('clear')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  MAP_FEATURE_FLAGS,
  MAP_NEAR_ME_RADII,
  countActiveMapFilters,
  type MapVenueFilters,
} from '@/utils/map-filters'

const props = defineProps<{
  modelValue: MapVenueFilters
  types: string[]
  hasLocation: boolean
  locating?: boolean
  shown: number
  total: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MapVenueFilters]
  locate: []
  clear: []
}>()

const typeOptions = computed(() => [
  { label: 'All venue types', value: '' },
  ...[...props.types].sort((a, b) => a.localeCompare(b)).map((type) => ({ label: type, value: type })),
])

const featureOptions = MAP_FEATURE_FLAGS.map((flag) => ({ key: flag.key, label: flag.label, icon: flag.icon }))
const nearMeOptions = MAP_NEAR_ME_RADII

function featureLabel(key: string) {
  return MAP_FEATURE_FLAGS.find((flag) => flag.key === key)?.label ?? key
}

function update(patch: Partial<MapVenueFilters>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const typeModel = computed({
  get: () => props.modelValue.venueType,
  set: (value: string) => update({ venueType: value || '' }),
})

const featuresModel = computed({
  get: () => props.modelValue.features,
  set: (value: string[]) => update({ features: Array.isArray(value) ? value : [] }),
})

const nearMeModel = computed({
  get: () => props.modelValue.nearMeMiles,
  set: (value: number) => update({ nearMeMiles: Number(value) || 0 }),
})

const activeCount = computed(() => countActiveMapFilters(props.modelValue))
</script>
