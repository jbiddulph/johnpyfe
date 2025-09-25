
export default defineNuxtConfig({
  css: [
    'mapbox-gl/dist/mapbox-gl.css'
  ],
  runtimeConfig: {
    public: {
      baseURL: process.env.BASE_URL,
      appURL: process.env.NUXT_PUBLIC_APP_URL ?? "https://ukpubs.co.uk",
      apiURL: process.env.NUXT_PUBLIC_API_URL ?? "https://ukpubs.co.uk",
      userName: process.env.USER_NAME,
      googleMaps: {
        key: 'AIzaSyBWiPC71sMkSoaa0TNrioE8CP1Ll5HmpZ4'
      },
      eventImgFolder: process.env.EVENT_IMG_FOLDER,
      venueImgFolder: process.env.VENUE_IMG_FOLDER,
      admin: process.env.ADMIN_EMAIL,
      mapbox_token:
            "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA",
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
  nitro: {
    compressPublicAssets: true,
    minify: true,
  },
  
  // Critical CSS inlining
  app: {
    head: {
      link: [
        { rel: 'preload', href: '/assets/css/critical.css', as: 'style' }
      ]
    }
  },
  
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
    "@nuxt/image", // Add image optimization
  ],
  // Image optimization
  image: {
    // Enable next-gen formats (WebP, AVIF)
    format: ['webp', 'avif'],
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
  sitemap: {
    sources: ['https://ukpubs.co.uk/api/venue-urls'],
  },
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})