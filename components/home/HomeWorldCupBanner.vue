<template>
  <section
    v-if="showBanner"
    class="world-cup-banner border-b border-amber-700/30 bg-gradient-to-r from-green-900 via-gray-900 to-red-900"
    aria-label="England vs Argentina World Cup match"
  >
    <div class="container mx-auto px-4 py-8 md:py-10">
      <div class="text-center">
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          FIFA World Cup 2026 · Semi-final
        </p>

        <h2 class="sr-only">
          England vs Argentina World Cup 2026 — pubs and sports bars showing the match across the UK
        </h2>

        <div class="mb-4 flex items-center justify-center gap-4 md:gap-8" role="group" aria-label="England vs Argentina">
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

          <div class="flex flex-col items-center">
            <span class="text-2xl font-light text-white/60 md:text-3xl">vs</span>
            <time
              datetime="2026-07-15T20:00:00+01:00"
              class="mt-1 text-sm font-medium text-amber-200 md:text-base"
            >
              Wed 15 Jul · 8:00pm BST
            </time>
          </div>

          <div class="flex flex-col items-center gap-2">
            <img
              src="https://flagcdn.com/w80/ar.png"
              srcset="https://flagcdn.com/w160/ar.png 2x"
              width="64"
              height="43"
              alt="Argentina flag"
              class="h-12 w-auto rounded shadow-md md:h-16"
              loading="eager"
            />
            <span class="text-lg font-bold text-white md:text-xl">Argentina</span>
          </div>
        </div>

        <p class="mx-auto mb-4 max-w-2xl text-sm text-white/80 md:text-base">
          Live on <strong class="text-white">BBC One</strong> from Mercedes-Benz Stadium, Atlanta.
          Find a <strong class="text-white">sports pub</strong> or <strong class="text-white">World Cup venue</strong> near you —
          watch this 8pm semi-final at your local sports bar.
        </p>

        <p class="mx-auto mb-6 max-w-3xl text-xs leading-relaxed text-white/60 md:text-sm">
          Looking for <strong class="font-medium text-white/75">pubs showing the World Cup 2026</strong>?
          UK Pubs lists sports bars, football pubs and late-night venues across
          <strong class="font-medium text-white/75">London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Brighton, Glasgow, Edinburgh, Newcastle, Sheffield, Nottingham and Cardiff</strong>.
          Whether you need a <strong class="font-medium text-white/75">sports bar with big screens</strong>,
          an <strong class="font-medium text-white/75">England World Cup pub</strong> for knockout football,
          or a <strong class="font-medium text-white/75">venue showing BBC One live sport</strong> —
          search by town, county or sports bar name to find your match-day spot.
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

      <section class="mt-8 rounded-lg border border-white/10 bg-black/20">
        <h3 class="px-4 py-3 text-sm font-semibold text-amber-200 md:text-base">
          Top World Cup pubs &amp; sports bars showing the match (by city)
        </h3>
        <p class="border-t border-white/10 px-4 pt-4 text-sm leading-relaxed text-white/70">
          These are among the best <strong class="text-white/90">UK sports pubs and World Cup venues</strong> likely
          screening England vs Argentina — popular <strong class="text-white/90">football pubs</strong> with multiple
          screens, late opening hours and strong match-day atmosphere. Search UK Pubs for
          <strong class="text-white/90">sports bars near you</strong>, or browse by city for
          <strong class="text-white/90">World Cup 2026 pub listings</strong> in your area.
        </p>
        <div class="grid grid-cols-1 gap-6 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="group in sportsPubsByCity" :key="group.city">
            <h4 class="mb-1 text-sm font-bold uppercase tracking-wide text-white/90">
              World Cup pubs in {{ group.city }}
            </h4>
            <p v-if="group.blurb" class="mb-2 text-xs leading-relaxed text-white/55">{{ group.blurb }}</p>
            <ul class="space-y-1 text-sm text-white/75">
              <li v-for="pub in group.pubs" :key="pub">{{ pub }}</li>
            </ul>
          </div>
        </div>
        <p class="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-white/50">
          Confirm with venues before travelling — many sports pubs and bars will be screening this
          <strong class="text-white/65">England World Cup semi-final</strong>.
          Listings sourced from FANZO and major UK sports bar chains. Also search UK Pubs for
          <strong class="text-white/65">sports TV pubs</strong>,
          <strong class="text-white/65">football bars</strong>,
          <strong class="text-white/65">World Cup venues</strong> and
          <strong class="text-white/65">pubs showing live sport</strong> in your town or county.
        </p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
/** Banner hides at kick-off: Wednesday 15 July 2026, 8:00pm BST */
const MATCH_EXPIRY = new Date('2026-07-15T20:00:00+01:00')

const showBanner = computed(() => new Date() < MATCH_EXPIRY)

const sportsPubsByCity = [
  {
    city: 'London',
    blurb: 'Soho, Shoreditch, Covent Garden and Leicester Square sports bars with giant screens for England World Cup matches.',
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
    blurb: 'Printworks, Deansgate and Spinningfields pubs — top Manchester World Cup venues with Sky Sports and TNT.',
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
    blurb: 'Broad Street and Brindleyplace sports pubs — popular Birmingham World Cup bars with late-night screenings.',
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
    blurb: 'City centre football pubs and sports bars showing live World Cup football on big screens.',
    pubs: [
      'The Saddle Inn',
      'The Monro',
      'The Liverpool (city centre)',
    ],
  },
  {
    city: 'Leeds',
    blurb: 'Leeds city centre and Headingley sports bars — bookable World Cup venues with match-day atmosphere.',
    pubs: [
      'BOX Leeds (city centre)',
      'BOX Headingley',
      'The Canary (Leeds Dock)',
      '147 Sports Bar (Pudsey)',
    ],
  },
  {
    city: 'Bristol',
    blurb: 'King Street and harbourside pubs — Bristol sports bars screening FIFA World Cup 2026 fixtures.',
    pubs: [
      'Famous Royal Naval Volunteer',
      'King Street Brew House',
      'Prince Street Social',
      'Kongs of King Street',
    ],
  },
  {
    city: 'Brighton',
    blurb: 'Seafront and Lanes pubs with sports TV — Brighton venues for late-night World Cup football.',
    pubs: [
      'Bear Inn',
      'Caxton Arms',
      'Bugle Inn',
      'Cobden Arms',
    ],
  },
  {
    city: 'Glasgow & Edinburgh',
    blurb: 'Scottish sports pubs and chain venues — check local listings for confirmed World Cup screenings.',
    pubs: [
      'Check FANZO for confirmed Scottish venues',
      'O\'Neill\'s and Walkabout chains often screen late fixtures',
    ],
  },
  {
    city: 'Newcastle',
    blurb: 'Quayside and city centre sports pubs — Newcastle World Cup bars with big-screen football.',
    pubs: [
      'O\'Neill\'s (city centre)',
      'BrewDog Newcastle',
      'The Mile Castle',
      'The Hancock',
    ],
  },
  {
    city: 'Sheffield',
    blurb: 'City centre venues with sports TV — Sheffield pubs for World Cup 2026 screenings.',
    pubs: [
      'The Beehive',
      'The Cavendish',
      'Walkabout Sheffield',
      'O\'Neill\'s Sheffield',
    ],
  },
  {
    city: 'Nottingham',
    blurb: 'Market Square and Lace Market sports bars showing live football and World Cup fixtures.',
    pubs: [
      'O\'Neill\'s Nottingham',
      'The Ale Stoates',
      'The Bell Inn',
      'Pitcher & Piano Nottingham',
    ],
  },
  {
    city: 'Cardiff',
    blurb: 'Cardiff Bay and city centre pubs — Welsh capital sports bars for World Cup match nights.',
    pubs: [
      'O\'Neill\'s Cardiff',
      'The Golden Cross',
      'Tiny Rebel Cardiff',
      'Walkabout Cardiff',
    ],
  },
] as const
</script>
