import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: `https://lookwhatfound.me`,
  },
  setupNodeEvents(on, config) {
    // implement node event listeners here
  },
  projectId: "abgibp",
})