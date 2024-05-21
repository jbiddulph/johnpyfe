import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: `${useRuntimeConfig().public.baseURL}`,
  },
  setupNodeEvents(on, config) {
    // implement node event listeners here
  },
  projectId: "abgibp",
})