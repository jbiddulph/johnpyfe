
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
    }
  },
  devtools: { enabled: true },
  modules: [
    "@pinia/nuxt",
    "@nuxt/ui",
    "@nuxtjs/color-mode",
    "nuxt-mapbox",
    "@nuxtjs/supabase",
    "@nuxt/fonts",
    "@nuxtjs/robots",
    "@nuxtjs/sitemap",
  ],
  fonts: {
    google: {
      families: {
        Roboto: true, // Loads the Roboto font
        'Open+Sans': true, // Loads the Open Sans font
        'Lato': [100, 300], // Loads Lato font with weights 100 and 300
      }
    }
  },
  sitemap: {
    sources: ['https://ukpubs.co.uk/api/venue-urls'],
  },
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})