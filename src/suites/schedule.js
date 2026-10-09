/*
 * Baseline for schedules: the list updates on screen as time passes, without a reload.
 *
 *   scheduleTests({
 *     open,                          // loads the template at a known time; must install page.clock
 *     items: (page) => locator,      // one element per item, containing its name
 *     timeline: [                    // steps, in order; each moves the clock then checks the screen
 *       { at: zonedTime('2030-01-15T10:16', TZ), gone: ['Power Vinyasa Yoga'], shows: ['Pilates Fusion'] },
 *       { after: '2:00:00', gone: ['Pilates Fusion'], check: async (page) => { ... } }
 *     ],
 *     ignore, tolerance              // optional, for the layout check (see layout.js)
 *   })
 *
 * `at` is a Date (moves the clock there), `after` a duration (moves the clock forward).
 * One test, at the first size: the timeline, then a layout check (overflow + overlap) at the end,
 * after the list has changed several times.
 */
const { playwright } = require('../project')
const { description } = require('../annotate')
const { advanceClock, toMs } = require('../time')
const { expectCleanLayout } = require('../layout')

const stepTitle = (step) => (step.at ? `at ${new Date(step.at).toISOString()}` : `after ${step.after}`)

function scheduleTests({ open, items, timeline, ignore, tolerance }) {
  const { test, expect } = playwright()
  if (!timeline?.length) throw new Error('signage-qa: scheduleTests needs a `timeline`')
  // check every step now, so a typo fails when the tests are registered, not halfway through a run
  timeline.forEach((step, i) => {
    if (step.at === undefined && step.after === undefined) throw new Error(`signage-qa: scheduleTests timeline step ${i + 1} needs \`at\` or \`after\``)
    if (step.at !== undefined && Number.isNaN(new Date(step.at).getTime())) throw new Error(`signage-qa: scheduleTests timeline step ${i + 1}: \`at\` is not a valid date`)
    if (step.after !== undefined) toMs(step.after)
  })

  test.describe('baseline: schedule over time', () => {
    test('items update on screen as time passes, and the layout stays clean',
      description('The template is loaded once and the clock moves forward through the timeline. Ended items must leave the screen and upcoming ones appear, with no reload. At the end, no text may run off screen or overlap.'),
      async ({ page }) => {
        await open(page)
        for (const step of timeline) {
          await test.step(stepTitle(step), async () => {
            await advanceClock(page, step)
            for (const name of step.gone || []) {
              await expect(items(page).filter({ hasText: name }), `"${name}" should have left the screen`).toHaveCount(0)
            }
            for (const name of step.shows || []) {
              await expect(items(page).filter({ hasText: name }).first(), `"${name}" should be on screen`).toBeVisible()
            }
            if (step.check) await step.check(page)
          })
        }
        await test.step('layout after the timeline', () => expectCleanLayout(page, { ignore, tolerance }))
      })
  })
}

module.exports = { scheduleTests }
