/*
 * Baseline: content stays on screen when the internet connection drops.
 *
 * A player keeps showing a template for hours or days. When its connection drops, the next
 * refresh fails, and the template must keep the last content it had instead of going blank.
 *
 *   offlineTests({
 *     open,                       // loads the template with data; installs page.clock; returns mockNetwork()'s `net`
 *     content: (page) => locator, // what must stay on screen (e.g. the list rows)
 *     refreshEvery: '20:00',      // how often the template fetches again (ms, 'mm:ss' or 'hh:mm:ss')
 *     outages: {                  // optional: partial failures, e.g. one API answering errors
 *       'classes API answers 500': (url) => url.pathname.endsWith('/classes/search'),
 *       'feed times out': { match: (url) => url.hostname === 'feed.example.com', status: 'abort' }
 *     }
 *   })
 *
 * One test for "connection lost" and one per outage. Each also checks that the template fetches
 * again once the connection is back. They run at the first size only (behavior, not layout).
 * Not covered: starting offline. Without a cache there is nothing to show, which is expected.
 */
const { playwright } = require('../project')
const { description } = require('../annotate')
const { toMs } = require('../time')

const REFRESHES = 2 // fail two refreshes in a row, so a retry doesn't hide a problem

function checkNet(net) {
  if (!net || typeof net.goOffline !== 'function') {
    throw new Error('signage-qa: offlineTests `open` must return the `net` from mockNetwork()')
  }
  return net
}

function offlineTests({ open, content, refreshEvery, outages = {} }) {
  const { test, expect } = playwright()
  if (!refreshEvery) throw new Error('signage-qa: offlineTests needs `refreshEvery` (how often the template fetches data)')
  const refreshMs = toMs(refreshEvery) // throws on a malformed value, when the tests are registered
  if (refreshMs === 0) throw new Error('signage-qa: offlineTests `refreshEvery` must be more than 0')
  const cycle = refreshMs + 60e3

  const problems = {
    'connection lost': (net) => net.goOffline(),
    ...Object.fromEntries(Object.entries(outages).map(([name, o]) => [
      name,
      typeof o === 'function' ? (net) => net.fail(o) : (net) => net.fail(o.match, o.status)
    ]))
  }

  test.describe('baseline: connection problems', () => {
    for (const [name, start] of Object.entries(problems)) {
      test(`${name} after loading: content stays on screen, and refreshes once it is back`,
        description(`Loads normally, then: ${name}. Lets ${REFRESHES} refreshes fail (every ${refreshEvery}). The content must still be on screen, not a blank or "no data" screen. Then the connection comes back, and the next refresh must reach the API again.`),
        async ({ page }) => {
          const net = checkNet(await open(page))
          await expect(content(page).first(), 'content before the problem starts').toBeVisible()

          start(net)
          const before = net.dropped.length
          for (let i = 0; i < REFRESHES; i++) {
            await page.clock.fastForward(cycle)
            await net.settle(page)
          }
          expect(net.dropped.length, `the template never tried to refresh during ${REFRESHES} x ${refreshEvery}. Is refreshEvery right?`)
            .toBeGreaterThan(before)
          await expect(content(page).first(), `content after ${REFRESHES} failed refreshes`).toBeVisible()

          net.goOnline()
          const answered = () => net.requests.length - net.dropped.length
          const beforeRecovery = answered()
          await page.clock.fastForward(cycle)
          await net.settle(page)
          expect(answered(), 'requests answered after the connection came back').toBeGreaterThan(beforeRecovery)
          await expect(content(page).first(), 'content after the connection came back').toBeVisible()
        })
    }
  })
}

module.exports = { offlineTests }
