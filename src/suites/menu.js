/*
 * Baseline for menus: no text overlaps or overflows, even with a lot of items.
 *
 *   menuTests({
 *     open,                 // a typical menu
 *     openFull,             // the longest menu the client could realistically enter (many items, long names, prices)
 *     scenarios,            // optional, more ways to open it: { 'two-line descriptions': (page) => ... }
 *     ignore, tolerance     // optional (see layout.js)
 *   })
 *
 * Menus usually grow in the CMS after launch, so the full menu is the one that matters most.
 * Text that is hidden on purpose when it doesn't fit is fine; text drawn on top of other text is not.
 */
const { layoutTests } = require('./layout')

function menuTests({ open, openFull, scenarios = {}, ignore, tolerance }) {
  if (!openFull) throw new Error('signage-qa: menuTests needs `openFull`, a menu with a lot of items')
  layoutTests({
    title: 'menu',
    scenarios: { 'typical menu': open, 'menu with many items': openFull, ...scenarios },
    ignore,
    tolerance
  })
}

module.exports = { menuTests }
