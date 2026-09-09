<template>
  <section
    id="pub-crawl-builder"
    class="home-crawl-demo relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-blue-950 text-white"
    aria-labelledby="pub-crawl-demo-heading"
  >
    <div class="home-crawl-demo__glow home-crawl-demo__glow--left" aria-hidden="true" />
    <div class="home-crawl-demo__glow home-crawl-demo__glow--right" aria-hidden="true" />

    <div class="container relative mx-auto px-4 py-16 lg:py-20">
      <div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-100 ring-1 ring-white/20">
            <UIcon name="i-heroicons-sparkles-20-solid" class="h-4 w-4" aria-hidden="true" />
            New on the map
          </span>
          <h2 id="pub-crawl-demo-heading" class="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Build a pub crawl in minutes
          </h2>
          <p class="mt-4 max-w-xl text-lg text-blue-100/90">
            Pick your pubs, see the route with walking times, invite your mates and check in as you go.
            Here's how it works.
          </p>

          <ol class="mt-8 space-y-2" aria-label="How the pub crawl builder works">
            <li v-for="(step, index) in steps" :key="step.title">
              <button
                type="button"
                class="group flex w-full items-start gap-4 rounded-xl px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                :class="index === activeStep ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'"
                :aria-current="index === activeStep ? 'step' : undefined"
                @click="selectStep(index)"
              >
                <span
                  class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
                  :class="index === activeStep ? 'bg-white text-primary-800' : 'bg-white/15 text-white group-hover:bg-white/25'"
                >
                  {{ index + 1 }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">{{ step.title }}</span>
                  <span class="mt-0.5 block text-sm text-blue-100/80">{{ step.description }}</span>
                  <span
                    v-if="index === activeStep && autoplay"
                    class="mt-2 block h-0.5 w-full overflow-hidden rounded-full bg-white/15"
                    aria-hidden="true"
                  >
                    <span
                      :key="progressKey"
                      class="home-crawl-demo__progress block h-full rounded-full bg-white/80"
                      :style="{ animationDuration: `${STEP_DURATION_MS}ms` }"
                    />
                  </span>
                </span>
              </button>
            </li>
          </ol>

          <div class="mt-8 flex flex-wrap gap-3">
            <UButton to="/map" size="lg" color="white" icon="i-heroicons-map-20-solid">
              Open the map builder
            </UButton>
            <NuxtLink
              to="/pub-crawls"
              class="inline-flex items-center gap-2 rounded-md px-3.5 py-2.5 text-base font-medium text-white ring-1 ring-inset ring-white/40 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              My pub crawls
            </NuxtLink>
          </div>
        </div>

        <div
          class="home-crawl-demo__frame overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl ring-1 ring-white/20"
          role="img"
          :aria-label="`Illustration of the pub crawl builder: ${steps[activeStep].title}`"
          @mouseenter="pause"
          @mouseleave="resume"
          @focusin="pause"
          @focusout="resume"
        >
          <div class="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
            <span class="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span class="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-gray-500 ring-1 ring-gray-200">
              ukpubs.co.uk/map
            </span>
          </div>

          <div class="grid sm:grid-cols-[minmax(0,1fr)_220px]">
            <div class="relative min-h-[260px] bg-[#e8eef5]">
              <svg viewBox="0 0 400 260" class="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <pattern id="crawl-demo-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M20 0H0V20" fill="none" stroke="#d3dce8" stroke-width="1" />
                  </pattern>
                </defs>
                <rect width="400" height="260" fill="url(#crawl-demo-grid)" />
                <path
                  d="M-10 215 C 60 190, 110 240, 190 220 S 320 200, 420 235 L 420 270 L -10 270 Z"
                  fill="#c7dbf0"
                />
                <g fill="#f5f8fb" stroke="#d3dce8">
                  <rect x="24" y="30" width="70" height="44" rx="4" />
                  <rect x="110" y="24" width="56" height="60" rx="4" />
                  <rect x="190" y="40" width="80" height="40" rx="4" />
                  <rect x="24" y="100" width="46" height="70" rx="4" />
                  <rect x="180" y="100" width="46" height="50" rx="4" />
                  <rect x="280" y="100" width="90" height="60" rx="4" />
                  <rect x="110" y="140" width="50" height="50" rx="4" />
                  <rect x="300" y="24" width="70" height="40" rx="4" />
                </g>
                <text x="16" y="20" class="home-crawl-demo__map-label" fill="#64748b">Liverpool</text>

                <template v-if="activeStep >= 1">
                  <path
                    :d="routePath"
                    fill="none"
                    stroke="#2563eb"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-dasharray="6 6"
                    class="home-crawl-demo__route"
                  />
                  <g v-for="leg in legs" :key="leg.label" class="home-crawl-demo__leg">
                    <rect :x="leg.x - 22" :y="leg.y - 9" width="44" height="18" rx="9" fill="#ffffff" stroke="#bfdbfe" />
                    <text :x="leg.x" :y="leg.y + 4" text-anchor="middle" class="home-crawl-demo__leg-text" fill="#1d4ed8">
                      {{ leg.label }}
                    </text>
                  </g>
                </template>

                <g
                  v-for="(stop, index) in visibleStops"
                  :key="stop.name"
                  class="home-crawl-demo__pin"
                  :style="{ animationDelay: `${index * 120}ms` }"
                >
                  <circle
                    v-if="activeStep === 3 && index === currentStopIndex"
                    :cx="stop.x"
                    :cy="stop.y"
                    r="18"
                    fill="#2563eb"
                    class="home-crawl-demo__pulse"
                  />
                  <circle
                    :cx="stop.x"
                    :cy="stop.y"
                    r="12"
                    :fill="pinFill(index)"
                    stroke="#ffffff"
                    stroke-width="3"
                  />
                  <path
                    v-if="activeStep === 3 && index < currentStopIndex"
                    :d="`M${stop.x - 5} ${stop.y} l3.5 3.5 l6.5 -7`"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <text
                    v-else
                    :x="stop.x"
                    :y="stop.y + 4"
                    text-anchor="middle"
                    class="home-crawl-demo__pin-text"
                    fill="#ffffff"
                  >
                    {{ index + 1 }}
                  </text>
                </g>

                <g v-if="activeStep === 2" class="home-crawl-demo__avatars">
                  <g v-for="(friend, index) in friends" :key="friend.handle" :transform="`translate(${300 + index * 22} 214)`">
                    <circle r="12" :fill="friend.color" stroke="#ffffff" stroke-width="2.5" />
                    <text y="4" text-anchor="middle" class="home-crawl-demo__avatar-text" fill="#ffffff">
                      {{ friend.initial }}
                    </text>
                  </g>
                </g>
              </svg>

              <div
                v-if="activeStep === 0"
                class="absolute inset-x-6 bottom-6 rounded-lg bg-white/95 px-3 py-2 text-xs text-gray-600 shadow ring-1 ring-gray-200"
              >
                Your route appears here as you add pubs.
              </div>
              <div
                v-else-if="activeStep === 3"
                class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow"
              >
                <UIcon name="i-heroicons-map-pin-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
                Checked in at {{ stops[currentStopIndex].name }}
              </div>
            </div>

            <div class="border-t border-gray-200 bg-white p-4 text-sm sm:border-l sm:border-t-0">
              <Transition name="home-crawl-demo-panel" mode="out-in">
                <div v-if="activeStep === 0" key="details" class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">New crawl</p>
                  <div>
                    <p class="mb-1 text-xs text-gray-500">Name</p>
                    <p class="rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-900">Friday night in Liverpool</p>
                  </div>
                  <div>
                    <p class="mb-1 text-xs text-gray-500">Start time</p>
                    <p class="rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-900">Fri 19:00</p>
                  </div>
                  <div>
                    <p class="mb-1 text-xs text-gray-500">Notes for guests</p>
                    <p class="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs leading-snug text-gray-700">
                      Meet outside The Crown at 7pm. Bring ID.
                    </p>
                  </div>
                  <span class="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-3 py-1.5 font-semibold text-white">
                    Create
                  </span>
                </div>

                <div v-else-if="activeStep === 1" key="stops" class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Add a pub</p>
                  <div class="flex items-center gap-2 rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-500">
                    <UIcon name="i-heroicons-magnifying-glass-20-solid" class="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span class="truncate">Liverpool pubs…</span>
                  </div>
                  <ol class="space-y-1.5">
                    <li
                      v-for="(stop, index) in stops"
                      :key="stop.name"
                      class="home-crawl-demo__stop flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 ring-1 ring-gray-200"
                      :style="{ animationDelay: `${index * 120}ms` }"
                    >
                      <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
                        {{ index + 1 }}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium text-gray-900">{{ stop.name }}</span>
                        <span v-if="index > 0" class="block text-[11px] text-gray-500">{{ legs[index - 1].label }} walk</span>
                      </span>
                      <UIcon name="i-heroicons-bars-3-20-solid" class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    </li>
                  </ol>
                  <p class="text-[11px] text-gray-500">Drag to reorder — the route updates as you go.</p>
                </div>

                <div v-else-if="activeStep === 2" key="invite" class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Invite friends</p>
                  <div class="flex items-center gap-2">
                    <span class="flex-1 truncate rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-500">@username</span>
                    <span class="rounded-md bg-primary-600 px-2.5 py-1.5 font-semibold text-white">Invite</span>
                  </div>
                  <ul class="flex flex-wrap gap-1.5">
                    <li
                      v-for="friend in friends"
                      :key="friend.handle"
                      class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
                    >
                      <UIcon name="i-heroicons-check-20-solid" class="h-3 w-3" aria-hidden="true" />
                      {{ friend.handle }}
                    </li>
                  </ul>
                  <div class="space-y-1.5 rounded-lg bg-gray-50 p-2 ring-1 ring-gray-200">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Crawl chat</p>
                    <p class="w-fit max-w-full rounded-2xl rounded-bl-sm bg-white px-2.5 py-1.5 text-xs text-gray-800 ring-1 ring-gray-200">
                      <strong>@sam</strong> Running 10 mins late, start without me!
                    </p>
                    <p class="ml-auto w-fit max-w-full rounded-2xl rounded-br-sm bg-primary-600 px-2.5 py-1.5 text-xs text-white">
                      No worries — we're at The Crown
                    </p>
                  </div>
                </div>

                <div v-else key="progress" class="space-y-3">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Crawl night</p>
                  <ol class="space-y-1.5">
                    <li
                      v-for="(stop, index) in stops"
                      :key="stop.name"
                      class="flex items-center gap-2 rounded-md px-2 py-1.5 ring-1"
                      :class="progressRowClass(index)"
                    >
                      <span
                        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        :class="index < currentStopIndex ? 'bg-emerald-500' : index === currentStopIndex ? 'bg-primary-600' : 'bg-gray-300'"
                      >
                        <UIcon v-if="index < currentStopIndex" name="i-heroicons-check-20-solid" class="h-3 w-3" aria-hidden="true" />
                        <template v-else>{{ index + 1 }}</template>
                      </span>
                      <span class="min-w-0 flex-1 truncate" :class="index === currentStopIndex ? 'font-semibold text-gray-900' : 'text-gray-700'">
                        {{ stop.name }}
                      </span>
                      <span v-if="index === currentStopIndex" class="text-[11px] font-semibold text-primary-700">You're here</span>
                    </li>
                  </ol>
                  <div class="flex gap-2">
                    <span class="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-center text-gray-600">Previous</span>
                    <span class="flex-1 rounded-md bg-primary-600 px-2.5 py-1.5 text-center font-semibold text-white">Next pub</span>
                  </div>
                  <p class="text-[11px] text-gray-500">Auto check-in when you're within 50 m of a stop.</p>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <ul class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Pub crawl builder features">
        <li
          v-for="feature in features"
          :key="feature.title"
          class="flex gap-4 rounded-xl bg-white/5 p-5 ring-1 ring-white/10 transition-colors hover:bg-white/10"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100">
            <UIcon :name="feature.icon" class="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span class="block font-semibold">{{ feature.title }}</span>
            <span class="mt-1 block text-sm text-blue-100/80">{{ feature.description }}</span>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
const STEP_DURATION_MS = 5000

const steps = [
  {
    title: 'Name your crawl',
    description: 'Give it a name, set a start time and add notes for your guests.',
  },
  {
    title: 'Add pubs from the map',
    description: 'Search by pub, town or county. Each stop is plotted with walking times between legs.',
  },
  {
    title: 'Invite friends & chat',
    description: 'Invite by username — everyone sees the route and can chat in the crawl.',
  },
  {
    title: 'Check in as you go',
    description: 'Track progress stop by stop, or let auto check-in do it when you arrive.',
  },
]

const stops = [
  { name: 'The Crown', x: 70, y: 190 },
  { name: 'Ye Hole in Ye Wall', x: 150, y: 110 },
  { name: 'The Philharmonic', x: 250, y: 140 },
  { name: 'Peter Kavanagh’s', x: 330, y: 60 },
]

const legs = [
  { label: '6 min', x: 96, y: 138 },
  { label: '9 min', x: 200, y: 140 },
  { label: '7 min', x: 302, y: 90 },
]

const friends = [
  { handle: '@sam', initial: 'S', color: '#f59e0b' },
  { handle: '@priya', initial: 'P', color: '#10b981' },
  { handle: '@jordan', initial: 'J', color: '#8b5cf6' },
]

const features = [
  {
    icon: 'i-heroicons-magnifying-glass-20-solid',
    title: 'Search and add pubs',
    description: 'Find pubs by name, town or county and add them straight from the map or the search box.',
  },
  {
    icon: 'i-heroicons-map-20-solid',
    title: 'Route with walking times',
    description: 'Every stop is plotted on the map with the walking time for each leg of the crawl.',
  },
  {
    icon: 'i-heroicons-arrows-up-down-20-solid',
    title: 'Drag to reorder',
    description: 'Shuffle the order of your stops and the route redraws instantly.',
  },
  {
    icon: 'i-heroicons-user-group-20-solid',
    title: 'Invite friends',
    description: 'Invite by username. Friends accept the invite and follow along on their own map.',
  },
  {
    icon: 'i-heroicons-chat-bubble-left-right-20-solid',
    title: 'Crawl chat',
    description: 'Keep the group together with a chat built into every crawl.',
  },
  {
    icon: 'i-heroicons-check-badge-20-solid',
    title: 'Auto check-in',
    description: 'Allow location access and you’ll check in automatically within 50 metres of each pub.',
  },
]

const currentStopIndex = 2

const activeStep = ref(0)
const autoplay = ref(false)
const progressKey = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const visibleStops = computed(() => (activeStep.value >= 1 ? stops : []))

const routePath = computed(() =>
  stops.map((stop, index) => `${index === 0 ? 'M' : 'L'}${stop.x} ${stop.y}`).join(' '),
)

function pinFill(index: number) {
  if (activeStep.value !== 3) return '#2563eb'
  if (index < currentStopIndex) return '#10b981'
  if (index === currentStopIndex) return '#2563eb'
  return '#94a3b8'
}

function progressRowClass(index: number) {
  if (index < currentStopIndex) return 'bg-emerald-50 ring-emerald-200'
  if (index === currentStopIndex) return 'bg-primary-50 ring-primary-200'
  return 'bg-gray-50 ring-gray-200'
}

function advance() {
  activeStep.value = (activeStep.value + 1) % steps.length
  progressKey.value += 1
}

function startTimer() {
  if (!autoplay.value || timer) return
  timer = setInterval(advance, STEP_DURATION_MS)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function selectStep(index: number) {
  activeStep.value = index
  progressKey.value += 1
  stopTimer()
  startTimer()
}

function pause() {
  stopTimer()
}

function resume() {
  progressKey.value += 1
  startTimer()
}

onMounted(() => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  autoplay.value = !reducedMotion
  startTimer()
})

onUnmounted(stopTimer)
</script>

<style scoped>
.home-crawl-demo__glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
}

.home-crawl-demo__glow--left {
  width: 28rem;
  height: 28rem;
  top: -10rem;
  left: -8rem;
  background: #60a5fa;
}

.home-crawl-demo__glow--right {
  width: 24rem;
  height: 24rem;
  right: -6rem;
  bottom: -8rem;
  background: #38bdf8;
}

.home-crawl-demo__map-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-crawl-demo__pin-text,
.home-crawl-demo__avatar-text {
  font-size: 11px;
  font-weight: 700;
}

.home-crawl-demo__leg-text {
  font-size: 10px;
  font-weight: 600;
}

.home-crawl-demo__route {
  animation: home-crawl-demo-dash 1.2s linear infinite;
}

.home-crawl-demo__pin,
.home-crawl-demo__leg,
.home-crawl-demo__avatars {
  animation: home-crawl-demo-pop 0.4s ease-out both;
  transform-box: fill-box;
  transform-origin: center;
}

.home-crawl-demo__stop {
  animation: home-crawl-demo-slide 0.35s ease-out both;
}

.home-crawl-demo__pulse {
  animation: home-crawl-demo-pulse 1.6s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

.home-crawl-demo__progress {
  animation-name: home-crawl-demo-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

.home-crawl-demo-panel-enter-active,
.home-crawl-demo-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.home-crawl-demo-panel-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.home-crawl-demo-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes home-crawl-demo-dash {
  to {
    stroke-dashoffset: -12;
  }
}

@keyframes home-crawl-demo-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes home-crawl-demo-slide {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes home-crawl-demo-pulse {
  0% {
    opacity: 0.6;
    transform: scale(0.7);
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes home-crawl-demo-progress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-crawl-demo__route,
  .home-crawl-demo__pin,
  .home-crawl-demo__leg,
  .home-crawl-demo__avatars,
  .home-crawl-demo__stop,
  .home-crawl-demo__pulse,
  .home-crawl-demo__progress {
    animation: none;
  }

  .home-crawl-demo__pulse {
    opacity: 0.25;
  }
}
</style>
