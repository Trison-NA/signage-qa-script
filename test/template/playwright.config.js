// End-to-end tests of the suites, run against a small real si9n template (site/).
// It uses the library's own defineSignageConfig, so the config, bin/serve.js (the test server)
// and the per-size projects are exercised exactly as a template project uses them.
const fs = require('fs')
const path = require('path')
const { defineSignageConfig } = require('../../src')

// The page loads the real si9n-sdk. Copy its browser build next to the page (gitignored).
// Only when it differs, since this file is loaded by the runner and again by every worker.
const sdk = path.resolve(__dirname, '..', '..', 'node_modules', 'si9n-sdk', 'dist', 'si9n-sdk.min.js')
const copy = path.join(__dirname, 'site', 'si9n-sdk.min.js')
if (!fs.existsSync(copy) || fs.statSync(copy).size !== fs.statSync(sdk).size) fs.copyFileSync(sdk, copy)

module.exports = defineSignageConfig({
  rootDir: __dirname,
  testDir: '.',
  distDir: 'site',
  si9n: 'site/si9n.json',
  port: 5199, // not 5100, so it never reuses a template project's test server
  timezoneId: 'America/Los_Angeles'
})
