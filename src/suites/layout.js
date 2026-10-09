/*
 * Baseline: screen content never overflows, and text never overlaps other text.
 *
 *   layoutTests({
 *     scenarios: {                       // each one is a way to open the template
 *       'normal day': (page) => open(page, { at: '...' }),
 *       'full feed': (page) => open(page, { classes: MANY })
 *     },
 *     ignore: ['.ticker'],               // optional, see layout.js
 *     tolerance: 2                       // optional, px
 *   })
 *
 * One test per scenario, at every size (layout depends on the size). A scenario must leave
 * the page fully rendered (data answered, fonts loaded), since that is when the screen is checked.
 */
const { playwright } = require('../project')
const { description } = require('../annotate')
const { expectCleanLayout } = require('../layout')

function layoutTests({ scenarios, ignore, tolerance, title = 'layout' }) {
  const { test } = playwright()
  if (!scenarios || !Object.keys(scenarios).length) throw new Error('signage-qa: layoutTests needs at least one scenario')

  test.describe(`baseline: ${title}`, () => {
    for (const [name, open] of Object.entries(scenarios)) {
      test(`${name}: no text overflows or overlaps`,
        description('Every piece of visible text must be fully on screen, not clipped by its container and not crossing other text, and the page must not scroll. Problems are outlined in red in the screenshot.', { allSizes: true }),
        async ({ page }) => {
          await open(page)
          await page.evaluate(() => document.fonts.ready)
          await expectCleanLayout(page, { ignore, tolerance })
        })
    }
  })
}

module.exports = { layoutTests }
