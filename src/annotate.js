const { ALL_SIZES } = require('./config')

/**
 * Test details that show a description in the HTML report:
 *   test('title', description('what this checks and why'), async ({ page }) => { ... })
 * Tests run at the first size only. Pass { allSizes: true } for checks that depend on the
 * screen size (layout, overflow), so they run at every size in si9n.json.
 */
const description = (text, { allSizes = false } = {}) => ({
  annotation: { type: 'description', description: text },
  ...(allSizes && { tag: ALL_SIZES })
})

module.exports = { description }
