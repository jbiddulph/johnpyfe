// https://nuxt.com/docs/api/configuration/nuxt-config
// import axios from "axios";
export default defineNuxtConfig({
  // serverMiddleware: [
  //   { path: '/api', handler: '~/middleware/cors.js' } // Apply CORS middleware to '/api' routes
  // ],
  runtimeConfig: {
    public: {
      baseURL: process.env.BASE_URL,
      appURL: process.env.NUXT_PUBLIC_APP_URL ?? "https://lookwhatfound.me",
      apiURL: process.env.NUXT_PUBLIC_API_URL ?? "https://lookwhatfound.me",
      userName: process.env.USER_NAME,
      googleMaps: {
        key: 'AIzaSyBWiPC71sMkSoaa0TNrioE8CP1Ll5HmpZ4'
      },
      eventImgFolder: process.env.EVENT_IMG_FOLDER,
      venueImgFolder: process.env.VENUE_IMG_FOLDER,
      admin: process.env.ADMIN_EMAIL,
      // apiURL: process.env.NUXT_PUBLIC_API_URL ?? "http://lookwhatfound.me",
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
    hostname: process.env.NUXT_PUBLIC_APP_URL ?? "https://lookwhatfound.me",
    routes: async () => {
      const { data } = await fetch(`${process.env.NUXT_PUBLIC_API_URL ?? "https://lookwhatfound.me"}/api/venue-urls`)
        .then(res => res.json());
      return data.map(venue => `/venues/${venue.slug}`);
    },
    path: '/sitemap.xml', // Ensure the sitemap is generated at this path
  },
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})