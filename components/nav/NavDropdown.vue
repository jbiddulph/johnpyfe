<template>
  <li ref="rootEl" class="relative">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-1 rounded py-2 px-3 md:w-auto md:justify-start md:p-0"
      :class="triggerClass"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="toggle"
    >
      <span>{{ label }}</span>
      <svg
        class="h-3 w-3 shrink-0 transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 10 6"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m1 1 4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <ul
      v-show="open"
      class="mt-1 space-y-1 rounded-lg border border-gray-100 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800 md:absolute md:top-full md:z-50 md:mt-2 md:min-w-[13rem] md:space-y-0"
      :class="align === 'right' ? 'md:right-0' : 'md:left-0'"
    >
      <li v-if="caption" class="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400">
        {{ caption }}
      </li>
      <li v-for="item in items" :key="item.label">
        <NuxtLink
          v-if="item.to"
          :to="item.to"
          class="block py-2 px-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="itemClass"
          @click="onNavigate"
        >
          {{ item.label }}
        </NuxtLink>
        <button
          v-else
          type="button"
          class="block w-full py-2 px-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="itemClass"
          @click="onAction(item)"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>
  </li>
</template>

<script lang="ts" setup>
export type NavDropdownItem = {
  label: string
  to?: string
  onClick?: () => void | Promise<void>
}

const props = withDefaults(defineProps<{
  label: string
  items: NavDropdownItem[]
  caption?: string
  variant?: 'default' | 'admin'
  align?: 'left' | 'right'
  modelValue?: string | null
  name: string
}>(), {
  caption: '',
  variant: 'default',
  align: 'left',
  modelValue: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  navigate: []
}>()

const route = useRoute()
const rootEl = ref<HTMLElement | null>(null)

const open = computed(() => props.modelValue === props.name)

const isChildActive = computed(() =>
  props.items.some((item) => {
    if (!item.to) return false
    if (item.to === '/') return route.path === '/'
    return route.path === item.to || route.path.startsWith(`${item.to}/`)
  }),
)

const triggerClass = computed(() => {
  if (props.variant === 'admin') {
    return [
      'text-primary-700 dark:text-primary-400 md:dark:hover:text-primary-300 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary-800',
      isChildActive.value ? 'text-primary-800 dark:text-primary-300' : '',
    ]
  }
  return [
    'text-gray-900 dark:text-white hover:bg-gray-100 md:hover:bg-transparent md:hover:text-primary-700 md:dark:hover:text-primary-500 dark:hover:bg-gray-700 dark:hover:text-white',
    isChildActive.value ? 'text-primary-500' : '',
  ]
})

const itemClass = computed(() =>
  props.variant === 'admin'
    ? 'text-primary-700 dark:text-primary-400'
    : 'text-gray-900 dark:text-gray-100',
)

function toggle() {
  emit('update:modelValue', open.value ? null : props.name)
}

function onNavigate() {
  emit('update:modelValue', null)
  emit('navigate')
}

function onAction(item: NavDropdownItem) {
  emit('update:modelValue', null)
  emit('navigate')
  item.onClick?.()
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const target = event.target as Node | null
  if (rootEl.value && target && !rootEl.value.contains(target)) {
    emit('update:modelValue', null)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    emit('update:modelValue', null)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>
