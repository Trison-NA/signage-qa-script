/*
 * Fake si9n player.
 *
 * Inside a real player, the template receives a `load` message (window.postMessage) carrying
 * the CMS field values and display info. si9n-sdk turns it into the `data` event (CMS fields)
 * and the `ready` event, and exposes display.now as the preview time.
 * mockPlayer() sends that same message, so tests can set CMS fields and a preview time
 * exactly as the player would, without touching the app's internals.
 *
 * Usage (call BEFORE page.goto):
 *   await mockPlayer(page, {
 *     data: { qrcode_label: 'A long label' },  // CMS values, keyed like si9n.json template.fields
 *     now: '2030-01-15 12:21:00'               // optional si9n preview time (local yyyy-mm-dd hh:mm:ss)
 *   })
 *
 * Fields not given in `data` get their `default` from si9n.json. This assumes a CMS item made
 * from the template starts with the defaults filled in, which is how the si9n UI presents new items.
 */
const { loadSi9n } = require('./project')

async function mockPlayer(page, { data = {}, now, display = {} } = {}) {
  const fields = loadSi9n().template?.fields || []
  const values = {}
  for (const field of fields) {
    if (field.default !== undefined) values[field.key] = field.default
  }
  Object.assign(values, data)

  const message = {
    type: 'load',
    data: {
      content: { data: values, template: { fields } },
      display: { ...display, ...(now && { now }) }
    }
  }

  // The SDK listens from the moment its script runs (deferred, so before DOMContentLoaded)
  // and gives up on the player after 400ms, so post right at DOMContentLoaded.
  await page.addInitScript((msg) => {
    document.addEventListener('DOMContentLoaded', () => window.postMessage(msg, '*'))
  }, message)
}

module.exports = { mockPlayer }
