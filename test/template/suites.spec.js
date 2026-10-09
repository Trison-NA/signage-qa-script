/*
 * The suites end to end, against the test template in site/: the real si9n-sdk driven by
 * mockPlayer, served by bin/serve.js through defineSignageConfig, with its API mocked.
 *
 * 1. On the working template, every test the suites register must pass.
 * 2. With one known bug switched on (the CMS field `defect`, see site/app.js), the suite meant
 *    to catch it must fail. Those groups are marked test.fail(): Playwright reports them as
 *    passed only when they fail. Each one differs from the working template by that single
 *    CMS value, so its failure comes from the bug, not from the fixture.
 */
const { test } = require('@playwright/test')
const { baselineTests, layoutTests, menuTests, offlineTests, scheduleTests } = require('../../src')
const { at, item, open, rows } = require('./fixtures')

const REFRESH = '20:00' // refreshMinutes default in site/si9n.json

// what the schedule looks like as the day goes on (items in fixtures.js)
const TIMELINE = [
  { at: at('10:01'), gone: ['Morning Flow'], shows: ['Pilates Fusion'] }, // ended 10:00
  { after: '3:00:00', gone: ['Pilates Fusion'], shows: ['Evening HIIT'] } // 13:01, ended 12:45
]

// a long day with long names: the "full menu" case
const FULL = ['Hump Day HIIT: Beach Body Edition', 'Restorative Yoga and Breathwork', 'Power Vinyasa Yoga',
  'Heated Slow Flow', 'Mat Pilates Fundamentals', 'Sound Bath and Guided Meditation', 'Boxing Conditioning']
  .map((name, i) => item(name, `${String(9 + i).padStart(2, '0')}:00`, 45))

test.describe('working template', () => {
  baselineTests({
    open: (page) => open(page),
    content: rows,
    refreshEvery: REFRESH,
    scenarios: { 'long names': (page) => open(page, { items: FULL }) },
    outages: { 'items API answers 500': (url) => url.pathname === '/items' }
  })
  scheduleTests({ open: (page) => open(page), items: rows, timeline: TIMELINE })
  menuTests({ open: (page) => open(page), openFull: (page) => open(page, { items: FULL }) })
})

// Registers a suite against the template with one bug switched on; its tests must fail.
function catches(defect, register) {
  test.describe(`catches defect "${defect}"`, () => {
    test.fail(() => true, `the template has the "${defect}" bug, so these checks must fail`)
    register((page, options = {}) => open(page, { ...options, data: { defect } }))
  })
}

catches('blank-on-error', (openBroken) => offlineTests({ open: openBroken, content: rows, refreshEvery: REFRESH }))
catches('no-refresh', (openBroken) => offlineTests({ open: openBroken, content: rows, refreshEvery: REFRESH }))
catches('never-expire', (openBroken) => scheduleTests({ open: openBroken, items: rows, timeline: TIMELINE }))
catches('overlap', (openBroken) => layoutTests({ scenarios: { typical: openBroken } }))
catches('overlap', (openBroken) => menuTests({ open: openBroken, openFull: (page) => openBroken(page, { items: FULL }) }))
