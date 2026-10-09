/*
 * Time helpers. Players run on the venue's local time, and fixtures are easiest to write
 * in that local time too, whatever timezone the test machine is in.
 */

// offset of `timeZone` from UTC at a given instant, in ms
function offsetMs(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(date).map((p) => [p.type, p.value])
  )
  const asUTC = Date.UTC(+parts.year, parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return asUTC - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * A local wall-clock time in a timezone, as a real Date.
 * zonedTime('2030-01-15T09:30', 'America/Los_Angeles') -> 2030-01-15T17:30:00Z
 */
function zonedTime(local, timeZone) {
  const [date, time = '00:00'] = local.split(/[T ]/)
  const [y, m, d] = date.split('-').map(Number)
  const [h, min, s = 0] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, min, s)
  const first = guess - offsetMs(new Date(guess), timeZone)
  return new Date(guess - offsetMs(new Date(first), timeZone)) // second pass handles DST changes
}

// 'mm:ss' or 'hh:mm:ss'. The first part can be any size ('90:00'), the others must be 00-59.
const DURATION = /^(?:(\d+):([0-5]\d):([0-5]\d)|(\d+):([0-5]\d))$/

/**
 * A duration in ms: 90000 (ms), '01:30' (mm:ss) or '1:00:00' (hh:mm:ss).
 * Anything else throws, so a typo ('20:60', '1:2:3:4', '-5:00') can't silently move the
 * clock by the wrong amount. A plain string like '1500' throws too: is it ms or seconds?
 */
function toMs(value) {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value >= 0) return value
  } else {
    const m = DURATION.exec(String(value).trim())
    if (m) {
      const [h, min, s] = m[1] !== undefined ? [m[1], m[2], m[3]] : [0, m[4], m[5]]
      return ((Number(h) * 60 + Number(min)) * 60 + Number(s)) * 1000
    }
  }
  throw new Error(`signage-qa: ${JSON.stringify(value)} is not a duration. Use ms (a number >= 0), 'mm:ss' or 'hh:mm:ss', e.g. 90000, '20:00' or '1:30:00'`)
}

/** Moves the page's fake clock (page.clock.install) to `at` (a Date), or forward by `after`. */
async function advanceClock(page, { at, after }) {
  if (at) {
    const now = await page.evaluate(() => Date.now())
    const ms = new Date(at).getTime() - now
    if (ms > 0) await page.clock.fastForward(ms)
  } else if (after !== undefined) {
    await page.clock.fastForward(toMs(after))
  }
}

module.exports = { zonedTime, toMs, advanceClock }
