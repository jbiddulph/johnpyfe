import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: `https://ukpubs.co.uk`,
  },
  setupNodeEvents(on, config) {
    // implement node event listeners here
  },
  projectId: "abgibp",
})