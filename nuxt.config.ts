import { resolveSiteUrl } from './utils/site-url'

const mapboxToken = process.env.NUXT_PUBLIC_MAPBOX_TOKEN || ''
const siteUrl = resolveSiteUrl()

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
    '/': { isr: 3600 },
    '/town/**': { isr: 3600 },
    '/county/**': { isr: 3600 },
    '/counties': { isr: 3600 },
    '/counties/**': { isr: 3600 },
    '/search': { isr: 900 },
    '/dashboard/**': { robots: false },
    '/api/webhooks/**': { cors: false },
    '/venues/**': { isr: 1800 },
    '/events/**': { isr: 900 },
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
  },
  
  // Critical CSS inlining (commented out until critical.css file exists)
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
    "nuxt-mapbox",
    // "@nuxtjs/supabase", // Temporarily disabled due to build issues
    "@nuxt/fonts",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
    "@nuxt/image",
  ],
  // Image optimization
  image: {
    // Enable all formats including original formats
    format: ['webp', 'avif', 'jpg', 'jpeg', 'png', 'svg'],
    // Optimize for different screen sizes
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    // Quality settings
    quality: 80,
    // Enable lazy loading
    loading: 'lazy',
    // Presets for common image sizes
    presets: {
      event: {
        modifiers: {
          format: 'webp',
          quality: 80,
          width: 400,
          height: 250,
        }
      },
      venue: {
        modifiers: {
          format: 'webp',
          quality: 85,
          width: 300,
          height: 200,
        }
      },
      header: {
        modifiers: {
          format: 'webp',
          quality: 90,
          width: 1920,
          height: 400,
        }
      }
    },
    // Allow external domains
    domains: [
      'ukpubs.co.uk',
      'localhost',
      '127.0.0.1',
      'isprmebbahzjnrekkvxv.supabase.co',
      'lh3.googleusercontent.com',
    ],
  },
  
  fonts: {
    google: {
      families: {
        Kanit: [100, 300, 400, 700],
      },
      display: 'swap',
      download: true,
      inject: true,
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
  mapbox: {
    accessToken: mapboxToken,
  },
})