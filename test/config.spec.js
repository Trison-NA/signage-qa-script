const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')
const { defineSignageConfig } = require('../src')

// a throwaway project folder containing only src/si9n.json
function project(si9n) {
  const root = test.info().outputPath('project')
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'src', 'si9n.json'), JSON.stringify(si9n))
  return root
}

test.describe('defineSignageConfig', () => {
  // defineSignageConfig sets these; put them back so other tests in the worker are unaffected
  const KEYS = ['SIGNAGE_QA_ROOT', 'SIGNAGE_QA_SI9N', 'QA_ALL_SIZES']
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  test.afterEach(() => {
    for (const k of KEYS) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])
  })

  test('one project per si9n.json size; only the first runs every test', () => {
    const config = defineSignageConfig({ rootDir: project({ sizes: [{ w: 1080, h: 1920 }, { w: 720, h: 1280 }] }) })
    expect(config.projects.map((p) => p.name)).toEqual(['1080x1920', '720x1280'])
    expect(config.projects[0].grep).toBeUndefined()
    expect(config.projects[1].grep.test('layout check @all-sizes')).toBe(true)
    expect(config.projects[1].grep.test('timezone check')).toBe(false)
    expect(config.fullyParallel).toBe(true)
  })

  test('no sizes in si9n.json: 1080x1920 and 1920x1080', () => {
    const config = defineSignageConfig({ rootDir: project({ template: { fields: [] } }) })
    expect(config.projects.map((p) => p.name)).toEqual(['1080x1920', '1920x1080'])
  })

  test('QA_ALL_SIZES runs every test at every size', () => {
    process.env.QA_ALL_SIZES = '1'
    const config = defineSignageConfig({ rootDir: project({ sizes: [{ w: 1080, h: 1920 }, { w: 720, h: 1280 }] }) })
    expect(config.projects.every((p) => p.grep === undefined)).toBe(true)
  })
})
