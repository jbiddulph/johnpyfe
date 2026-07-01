<template>
  <section
    v-if="showBanner"
    class="world-cup-banner border-b border-amber-700/30 bg-gradient-to-r from-green-900 via-gray-900 to-red-900"
    aria-label="Mexico vs England World Cup match"
  >
    <div class="container mx-auto px-4 py-8 md:py-10">
      <div class="text-center">
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          FIFA World Cup 2026 · Round of 16
        </p>

        <div class="mb-4 flex items-center justify-center gap-4 md:gap-8">
          <div class="flex flex-col items-center gap-2">
            <img
              src="https://flagcdn.com/w80/mx.png"
              srcset="https://flagcdn.com/w160/mx.png 2x"
              width="64"
              height="43"
              alt="Mexico flag"
              class="h-12 w-auto rounded shadow-md md:h-16"
              loading="eager"
            />
            <span class="text-lg font-bold text-white md:text-xl">Mexico</span>
          </div>

          <div class="flex flex-col items-center">
            <span class="text-2xl font-light text-white/60 md:text-3xl">vs</span>
            <time
              datetime="2026-07-06T01:00:00+01:00"
              class="mt-1 text-sm font-medium text-amber-200 md:text-base"
            >
              Mon 6 Jul · 1:00am BST
            </time>
          </div>

          <div class="flex flex-col items-center gap-2">
            <img
              src="https://flagcdn.com/w80/gb-eng.png"
              srcset="https://flagcdn.com/w160/gb-eng.png 2x"
              width="64"
              height="43"
              alt="England flag"
              class="h-12 w-auto rounded shadow-md md:h-16"
              loading="eager"
            />
            <span class="text-lg font-bold text-white md:text-xl">England</span>
          </div>
        </div>

        <p class="mx-auto mb-6 max-w-2xl text-sm text-white/80 md:text-base">
          Live on <strong class="text-white">BBC One</strong> from Estadio Azteca, Mexico City.
          Find a sports pub near you — many venues are applying for late licences for this 1am kick-off.
        </p>

        <div class="flex flex-wrap justify-center gap-3">
          <UButton
            to="/search?q=sports+bar"
            size="lg"
            color="amber"
          >
            Find sports pubs near you
          </UButton>
          <UButton
            to="https://www.fanzo.com/en/bars-pubs/football/fifa-world-cup/9958"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="outline"
            class="!border-white/40 !text-white hover:!bg-white/10"
          >
            Check FANZO listings
          </UButton>
        </div>
      </div>

      <details class="mt-8 rounded-lg border border-white/10 bg-black/20">
        <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-200 md:text-base">
          Top sports pubs likely showing the match (by city)
        </summary>
        <div class="grid grid-cols-1 gap-6 border-t border-white/10 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="group in sportsPubsByCity" :key="group.city">
            <h3 class="mb-2 text-sm font-bold uppercase tracking-wide text-white/90">{{ group.city }}</h3>
            <ul class="space-y-1 text-sm text-white/75">
              <li v-for="pub in group.pubs" :key="pub">{{ pub }}</li>
            </ul>
          </div>
        </div>
        <p class="border-t border-white/10 px-4 py-3 text-xs text-white/50">
          Confirm with venues before travelling — the 1am kick-off falls outside standard World Cup licensing
          extensions, so pubs need a late licence or Temporary Event Notice. Listings sourced from FANZO and
          major UK sports bar chains.
        </p>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
/** Banner hides at kick-off: Monday 6 July 2026, 1:00am BST */
const MATCH_EXPIRY = new Date('2026-07-06T01:00:00+01:00')

const showBanner = computed(() => new Date() < MATCH_EXPIRY)

const sportsPubsByCity = [
  {
    city: 'London',
    pubs: [
      'The Kings Sports Bar (Leicester Square)',
      'Beechwood Sports Pub (Shoreditch)',
      'The Volley (Old Street)',
      'Phoenix (Bloomsbury)',
      'De Hems Dutch Cafe (Soho)',
      'O\'Neill\'s Wardour Street',
      'BrewDog Waterloo',
      'BloodSports by MEATLiquor (Covent Garden)',
      'Bat and Ball Covent Garden',
      'Green Man (Soho)',
    ],
  },
  {
    city: 'Manchester',
    pubs: [
      'Seven Oaks (China Town)',
      'O\'Neill\'s Printworks',
      'Walkabout Printworks',
      'BOX Deansgate',
      'Courts Club (Spinningfields)',
      'Piccadilly Tavern',
      'Manchester235',
      'Sawyers Arms',
      'Matchstick Man (Salford)',
    ],
  },
  {
    city: 'Birmingham',
    pubs: [
      'The Shakespeare Inn',
      'O\'Neill\'s (city centre)',
      'Box Brindleyplace',
      'The Bierkeller',
      'Trocadero',
      'Nortons',
      'Old Royal',
      'Grosvenor Casino Hill Street',
    ],
  },
  {
    city: 'Liverpool',
    pubs: [
      'The Saddle Inn',
      'The Monro',
      'The Liverpool (city centre)',
    ],
  },
  {
    city: 'Leeds',
    pubs: [
      'BOX Leeds (city centre)',
      'BOX Headingley',
      'The Canary (Leeds Dock)',
      '147 Sports Bar (Pudsey)',
    ],
  },
  {
    city: 'Bristol',
    pubs: [
      'Famous Royal Naval Volunteer',
      'King Street Brew House',
      'Prince Street Social',
      'Kongs of King Street',
    ],
  },
  {
    city: 'Brighton',
    pubs: [
      'Bear Inn',
      'Caxton Arms',
      'Bugle Inn',
      'Cobden Arms',
    ],
  },
  {
    city: 'Glasgow & Edinburgh',
    pubs: [
      'Check FANZO for confirmed Scottish venues',
      'O\'Neill\'s and Walkabout chains often screen late fixtures',
    ],
  },
] as const
</script>
