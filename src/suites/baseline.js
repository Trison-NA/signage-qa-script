/*
 * Baseline for every template: layout (overflow + overlap) and connection problems.
 *
 *   baselineTests({
 *     open,                      // loads the template with typical data; returns mockNetwork()'s `net`
 *     content: (page) => locator,
 *     refreshEvery: '20:00',
 *     scenarios: { ... },        // optional, more layouts to check (default: just `open`)
 *     outages: { ... },          // optional, see offline.js
 *     ignore, tolerance          // optional, see layout.js
 *   })
 *
 * Add scheduleTests() for schedules and menuTests() for menus.
 */
const { layoutTests } = require('./layout')
const { offlineTests } = require('./offline')

function baselineTests({ open, content, refreshEvery, scenarios, outages, ignore, tolerance }) {
  layoutTests({ scenarios: { typical: open, ...scenarios }, ignore, tolerance })
  offlineTests({ open, content, refreshEvery, outages })
}

module.exports = { baselineTests }
