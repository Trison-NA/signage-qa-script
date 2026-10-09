// Unit tests for the library (config, layout detectors, network mock, time helpers).
// They use page.setContent, so no template and no web server are needed.
// The suites, mockPlayer and bin/serve.js are tested end to end in test/template (own config).
const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: 'test',
  testIgnore: 'template/**',
  reporter: [['list']],
  use: { browserName: 'chromium', viewport: { width: 1080, height: 1920 } }
})
