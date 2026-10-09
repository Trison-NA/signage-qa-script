const path = require('path')
const { loadSi9n } = require('./project')

const SERVE = path.resolve(__dirname, '..', 'bin', 'serve.js')

// used when si9n.json has no "sizes": the two standard full-screen orientations
const DEFAULT_SIZES = [{ w: 1080, h: 1920 }, { w: 1920, h: 1080 }]

// Tests tagged ALL_SIZES run at every size; the others only at the first one.
// Layout depends on the size, behavior (times, CMS settings, offline...) does not,
// so running behavior at every size only multiplies the run time.
const ALL_SIZES = '@all-sizes'

/**
 * Playwright config for a si9n template.
 *
 * - one Playwright project per size in si9n.json (1080x1920 and 1920x1080 if it lists none).
 *   Tests run at the first size; tests tagged ALL_SIZES (the layout checks) at every size.
 *   QA_ALL_SIZES=1 runs every test at every size, e.g. before a release.
 * - tests run in parallel across CPU cores (each test has its own page, clock and network mock)
 * - serves the production build (dist/, exactly what goes into the zip)
 * - screenshot of every test in the HTML report, handy for comparing against Figma
 *
 * Anything else Playwright accepts can be passed too, and wins over these defaults.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir]    project folder (pass __dirname). Default: current directory
 * @param {string} [options.testDir]    default 'qa'
 * @param {string} [options.distDir]    default 'dist'
 * @param {string} [options.si9n]       path to si9n.json, default 'src/si9n.json'
 * @param {number} [options.port]       default QA_PORT env or 5100
 * @param {string} [options.timezoneId] timezone the players run on, e.g. 'America/Los_Angeles'
 * @param {number} [options.expectTimeout] default 2000 (data is mocked, nothing should take long)
 * @param {object} [options.use]        extra Playwright `use` options
 */
function defineSignageConfig({
  rootDir = process.cwd(),
  testDir = 'qa',
  distDir = 'dist',
  si9n = 'src/si9n.json',
  port = Number(process.env.QA_PORT) || 5100,
  timezoneId,
  expectTimeout = 2000,
  use = {},
  ...playwrightOptions
} = {}) {
  process.env.SIGNAGE_QA_ROOT = rootDir
  process.env.SIGNAGE_QA_SI9N = si9n

  const sizes = loadSi9n().sizes?.length ? loadSi9n().sizes : DEFAULT_SIZES
  const everySize = Boolean(process.env.QA_ALL_SIZES)

  const baseURL = `http://127.0.0.1:${port}`
  return {
    testDir: path.resolve(rootDir, testDir),
    fullyParallel: true,
    outputDir: path.resolve(rootDir, testDir, 'test-results'),
    reporter: [['list'], ['html', { outputFolder: path.resolve(rootDir, testDir, 'report'), open: 'never' }]],
    expect: { timeout: expectTimeout },
    use: {
      baseURL,
      ...(timezoneId && { timezoneId }),
      screenshot: 'on',
      ...use
    },
    projects: sizes.map(({ w, h }, i) => ({
      name: `${w}x${h}`,
      use: { browserName: 'chromium', viewport: { width: w, height: h } },
      ...(i > 0 && !everySize && { grep: new RegExp(ALL_SIZES) })
    })),
    webServer: {
      command: `node "${SERVE}" --dir "${path.resolve(rootDir, distDir)}" --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI
    },
    ...playwrightOptions
  }
}

module.exports = { defineSignageConfig, ALL_SIZES, DEFAULT_SIZES }
