// Fixture data and `open()` for the test template in site/.
const { mockPlayer, mockNetwork, zonedTime } = require('../../src')

const TZ = 'America/Los_Angeles'
const DAY = '2030-01-15'

/** A Pacific local time on DAY, e.g. at('09:30'). */
const at = (time) => zonedTime(`${DAY}T${time}`, TZ)

const item = (name, start, minutes) => ({
  name,
  start: at(start).toISOString(),
  end: new Date(at(start).getTime() + minutes * 60e3).toISOString()
})

const ITEMS = [
  item('Morning Flow', '09:00', 60),
  item('Pilates Fusion', '12:00', 45),
  item('Evening HIIT', '18:00', 30)
]

/**
 * Loads the template at `time` (Pacific, on DAY) with `items` from the API.
 * `data` and `now` go to the fake si9n player (CMS fields and preview time).
 * `player: false` loads it without a player, as when the page is opened outside si9n.
 * Returns mockNetwork()'s `net`, as the suites expect.
 */
async function open(page, { time = '08:00', items = ITEMS, data = {}, now, player = true } = {}) {
  await page.clock.install({ time: at(time) })
  if (player) await mockPlayer(page, { data, now })
  const net = await mockNetwork(page, {
    'api.example.test': (url) => (url.pathname === '/items' ? items : undefined)
  })
  const loaded = page.waitForResponse((r) => r.url().endsWith('/items'))
  await page.goto('/')
  await loaded
  await net.settle(page)
  return net
}

const rows = (page) => page.locator('#list .item')

module.exports = { TZ, DAY, at, item, ITEMS, open, rows }
