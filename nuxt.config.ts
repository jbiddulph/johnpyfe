import { resolveSiteUrl } from './utils/site-url'

const mapboxToken = process.env.NUXT_PUBLIC_MAPBOX_TOKEN || ''
const siteUrl = resolveSiteUrl()
const googleAnalyticsId = (process.env.NUXT_PUBLIC_GA_ID || 'G-LHT3Z80MSB').trim()

export default defineNuxtConfig({
  site: {
    url: siteUrl,
    name: 'UK Pubs',
    description: 'Events listings for pubs and venues across the UK — live music, comedy, quizzes and more.',
    defaultLocale: 'en-GB',
  },
  css: [
    '~/assets/css/hub-cards.css',
    '~/assets/css/spinner.css',
  ],
  runtimeConfig: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceSolo: process.env.STRIPE_PRICE_SOLO || '',
    stripePriceGroup: process.env.STRIPE_PRICE_GROUP || '',
    stripePriceRegional: process.env.STRIPE_PRICE_REGIONAL || '',
    stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
    stripeTestPayment: process.env.STRIPE_TEST_PAYMENT || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      baseURL: (process.env.BASE_URL || process.env.NUXT_PUBLIC_APP_URL || siteUrl).replace(/\/$/, ''),
      appURL: siteUrl,
      apiURL: (process.env.NUXT_PUBLIC_API_URL || process.env.NUXT_PUBLIC_APP_URL || siteUrl).replace(/\/$/, ''),
      userName: process.env.USER_NAME,
      googleMaps: {
        key: process.env.NUXT_PUBLIC_GOOGLE_MAPS_KEY || '',
      },
      eventImgFolder: process.env.EVENT_IMG_FOLDER,
      venueImgFolder: process.env.VENUE_IMG_FOLDER,
      admin: process.env.ADMIN_EMAIL,
      mapbox_token: mapboxToken,
      googleAnalyticsId,
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
      }
    }
  },
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  
  // Performance optimizations
  experimental: {
    payloadExtraction: false, // Reduce bundle size
    inlineSSRStyles: false, // Prevent render-blocking CSS
  },
  
  // Optimize build
  build: {
    analyze: false, // Set to true to analyze bundle
  },
  
  // Optimize rendering
  ssr: true,
  routeRules: {
    '/': {
      isr: 3600,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
    '/town/**': { isr: 3600 },
    '/county/**': { isr: 3600 },
    '/counties': { isr: 3600 },
    '/counties/**': { isr: 3600 },
    '/search': { isr: 900 },
    '/dashboard/**': { robots: false },
    '/favorites': { robots: false },
    '/api/webhooks/**': { cors: false },
    '/venues/**': { isr: 1800 },
    '/api/venues/*/owner-profile': { cache: false },
    '/api/venues/*/reviews': { cache: false },
    '/api/favorites': { cache: false },
    '/api/favorites/**': { cache: false },
    '/api/homepage/stats': { cache: { maxAge: 300, swr: true } },
    '/api/news/featured': { cache: { maxAge: 300, swr: true } },
    '/api/news/latest': { cache: { maxAge: 300, swr: true } },
    '/api/events/top-ten': { cache: { maxAge: 900, swr: true } },
    '/events/**': { isr: 900 },
    '/news/**': { isr: 1800 },
    '/pubs-near-stadiums/**': { isr: 3600 },
    '/admin/**': { robots: false },
    '/login': { robots: false },
    '/register': { robots: false },
    '/auth/**': { robots: false },
  },
  nitro: {
    preset: 'netlify',
    compressPublicAssets: true,
    minify: true,
    prerender: {
      crawlLinks: false,
      failOnError: false,
      routes: ['/'],
    },
  },
  
  // Analytics is loaded after idle in plugins/analytics.client.ts to keep the first JS payload smaller.
  app: {
    head: {},
  },
  // app: {
  //   head: {
  //     link: [
  //       { rel: 'preload', href: '/assets/css/critical.css', as: 'style' }
  //     ]
  //   }
  // },
  
  // Vite optimizations
  vite: {
    optimizeDeps: {
      include: ['@nuxt/ui']
    }
  },
  
  modules: [
    "@pinia/nuxt",
    "@nuxt/ui",
    "@nuxtjs/color-mode",
    // "@nuxtjs/supabase", // Temporarily disabled due to build issues
    "@nuxt/fonts",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
    "@nuxt/image",
  ],
  // Image optimization
  image: {
    format: ['avif', 'webp'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    quality: 75,
    loading: 'lazy',
    presets: {
      event: {
        modifiers: {
          format: 'webp',
          quality: 75,
          width: 400,
          height: 250,
        }
      },
      venue: {
        modifiers: {
          format: 'webp',
          quality: 75,
          width: 300,
          height: 200,
        }
      },
      header: {
        modifiers: {
          format: 'webp',
          quality: 75,
          width: 1280,
          height: 416,
        }
      }
    },
    domains: [
      'ukpubs.co.uk',
      'www.ukpubs.co.uk',
      'localhost',
      '127.0.0.1',
      'isprmebbahzjnrekkvxv.supabase.co',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      'plus.unsplash.com',
      'upload.wikimedia.org',
      'ichef.bbci.co.uk',
      'i.guim.co.uk',
      'media.guim.co.uk',
      'static.independent.co.uk',
      'www.theguardian.com',
      'images.pexels.com',
      'res.cloudinary.com',
      'maps.googleapis.com',
      'places.googleapis.com',
      'cdn.pixabay.com',
    ],
  },
  
  fonts: {
    defaults: {
      weights: [400, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
    families: [
      { name: 'Kanit', provider: 'google', global: true },
    ],
    google: {
      families: {
        Kanit: [400, 700],
      },
      display: 'swap',
      download: true,
    },
    experimental: {
      disableLocalFallbacks: true,
    },
  },
  robots: {
    groups: [
      {
        userAgent: '*',
        disallow: [
          '/admin',
          '/admin/',
          '/login',
          '/register',
          '/auth',
          '/auth/',
        ],
      },
    ],
    sitemap: ['/sitemap_index.xml'],
  },
  sitemap: {
    // DB-backed URLs; split into chunks so Netlify can build XML without 500s
    sitemaps: true,
    defaultSitemapsChunkSize: 2500,
    sitemapsPathPrefix: '/sitemaps/',
    autoLastmod: false,
    discoverImages: false,
    excludeAppSources: ['pages', 'nuxt:prerender'],
    sources: ['/api/sitemap-urls'],
    exclude: ['/admin/**', '/login', '/register', '/auth/**', '/map/map'],
    cacheMaxAgeSeconds: 600,
  },
})