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
    'mapbox-gl/dist/mapbox-gl.css',
    '~/assets/css/hub-cards.css',
    '~/assets/css/spinner.css',
  ],
  runtimeConfig: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    public: {
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
  devtools: { enabled: true },
  
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
    // "@nuxt/image", // Temporarily disabled for testing
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
    domains: ['ukpubs.co.uk', 'localhost'],
    // Provider configuration
    providers: {
      // Default provider settings
      default: {
        // Don't force format conversion for SVG
        format: ['webp', 'avif', 'jpg', 'jpeg', 'png'],
        // Preserve original format when possible
        fallbackFormat: 'original'
      }
    }
  },
  
  fonts: {
    google: {
      families: {
        Roboto: [300, 400, 500, 700], // Load only needed weights
        'Open+Sans': [300, 400, 600, 700], // Load only needed weights
        'Lato': [300, 400, 700], // Load only needed weights
      },
      display: 'swap', // Improve font loading performance
      download: true, // Download fonts for better performance
      inject: true, // Automatically inject font styles
    }
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