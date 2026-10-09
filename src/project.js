/*
 * Where the template project lives, and access to its files and its Playwright.
 *
 * defineSignageConfig() stores the project root and si9n.json path in environment variables,
 * so every module (in the Playwright runner and in every worker) finds the same files.
 */
const fs = require('fs')
const path = require('path')

const projectRoot = () => process.env.SIGNAGE_QA_ROOT || process.cwd()

const si9nCache = new Map()
/** The project's si9n.json (sizes and CMS template fields). */
function loadSi9n() {
  const file = path.resolve(projectRoot(), process.env.SIGNAGE_QA_SI9N || 'src/si9n.json')
  if (!si9nCache.has(file)) {
    if (!fs.existsSync(file)) {
      throw new Error(`signage-qa: si9n.json not found at ${file}. Pass { si9n: 'path/to/si9n.json' } to defineSignageConfig().`)
    }
    si9nCache.set(file, JSON.parse(fs.readFileSync(file, 'utf8')))
  }
  return si9nCache.get(file)
}

/**
 * The project's own @playwright/test.
 * The suites must register tests on the same Playwright instance as the project's spec files.
 * A second copy (e.g. the library's own devDependency, reached through a symlinked install)
 * makes Playwright refuse to run, so resolve it from the project, never from this folder.
 */
function playwright() {
  return require(require.resolve('@playwright/test', { paths: [projectRoot()] }))
}

module.exports = { projectRoot, loadSi9n, playwright }
