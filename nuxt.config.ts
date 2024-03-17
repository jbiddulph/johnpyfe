// https://nuxt.com/docs/api/configuration/nuxt-config
import axios from "axios";
export default defineNuxtConfig({
  // serverMiddleware: [
  //   { path: '/api', handler: '~/middleware/cors.js' } // Apply CORS middleware to '/api' routes
  // ],
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxt/ui", "@nuxtjs/color-mode", "nuxt-mapbox"],
  mapbox: {
    accessToken: 'pk.eyJ1IjoiamJpZGR1bHBoIiwiYSI6ImNscDgzemt0ZzJjNW8ydnM0MXJvNG56NjEifQ.h0CNNEv-Yjgkp4WMjOK9mA'
  },
})
