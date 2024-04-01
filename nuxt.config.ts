// https://nuxt.com/docs/api/configuration/nuxt-config
// import axios from "axios";
export default defineNuxtConfig({
  // serverMiddleware: [
  //   { path: '/api', handler: '~/middleware/cors.js' } // Apply CORS middleware to '/api' routes
  // ],
  runtimeConfig: {
    public: {
      appURL: process.env.NUXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
      apiURL: process.env.NUXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
      mapbox_token:
            "pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA",
    }
  },
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/ui", "@nuxtjs/color-mode", "nuxt-mapbox"],
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})
