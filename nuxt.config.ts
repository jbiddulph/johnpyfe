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
      admin: process.env.ADMIN_EMAIL,
      // apiURL: process.env.NUXT_PUBLIC_API_URL ?? "http://lookwhatfound.me",
      mapbox_token:
            "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA",
    }
  },
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/ui", "@nuxtjs/color-mode", "nuxt-mapbox", "@nuxtjs/supabase"],
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})
