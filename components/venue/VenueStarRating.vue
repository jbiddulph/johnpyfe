<template>
  <div
    class="inline-flex items-center"
    :class="gapClass"
    :role="readonly ? 'img' : 'radiogroup'"
    :aria-label="ariaLabel"
  >
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="n in 5"
      :key="n"
      v-bind="readonly ? {} : { type: 'button', 'aria-checked': n === current, role: 'radio' }"
      :class="starWrapClass"
      :aria-label="readonly ? undefined : `Rate ${n} star${n === 1 ? '' : 's'}`"
      @click="onSelect(n)"
    >
      <UIcon
        name="i-heroicons-star-solid"
        :class="[iconClass, n <= filled ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600']"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: number | null
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  modelValue: 0,
  readonly: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const current = computed(() => Number(props.modelValue) || 0)
const filled = computed(() => Math.round(current.value))

const ariaLabel = computed(() => {
  if (!current.value) return props.readonly ? 'No rating yet' : 'Choose a star rating'
  return `${current.value} out of 5 stars`
})

const iconClass = computed(() => {
  if (props.size === 'sm') return 'h-4 w-4'
  if (props.size === 'lg') return 'h-8 w-8'
  return 'h-6 w-6'
})

const gapClass = computed(() => (props.size === 'sm' ? 'gap-0' : 'gap-0.5'))

const starWrapClass = computed(() => {
  const base = 'inline-flex items-center justify-center p-0.5'
  return props.readonly
    ? base
    : `${base} rounded-md hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400`
})

function onSelect(n: number) {
  if (props.readonly) return
  emit('update:modelValue', n)
}
</script>
