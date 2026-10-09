const { test, expect } = require('@playwright/test')
const { zonedTime, toMs, mockNetwork, reply } = require('../src')

test.describe('zonedTime', () => {
  test('Pacific winter and summer times', () => {
    expect(zonedTime('2030-01-15T09:30', 'America/Los_Angeles').toISOString()).toBe('2030-01-15T17:30:00.000Z')
    expect(zonedTime('2030-07-15T09:30', 'America/Los_Angeles').toISOString()).toBe('2030-07-15T16:30:00.000Z')
    expect(zonedTime('2030-01-15 23:59:30', 'UTC').toISOString()).toBe('2030-01-15T23:59:30.000Z')
  })

  test('day after the DST change (US, 2030-03-10)', () => {
    expect(zonedTime('2030-03-10T12:00', 'America/New_York').toISOString()).toBe('2030-03-10T16:00:00.000Z')
  })
})

test.describe('toMs', () => {
  test('ms, mm:ss and hh:mm:ss', () => {
    expect(toMs(1500)).toBe(1500)
    expect(toMs(0)).toBe(0)
    expect(toMs('01:30')).toBe(90e3)
    expect(toMs('20:00')).toBe(1200e3)
    expect(toMs('90:00')).toBe(5400e3) // mm:ss, minutes past 59 are fine in the first part
    expect(toMs('1:00:00')).toBe(3600e3)
    expect(toMs('02:05:09')).toBe((2 * 3600 + 5 * 60 + 9) * 1000)
    expect(toMs(' 20:00 ')).toBe(1200e3)
  })

  for (const bad of ['soon', '', '1:2:3:4', '20:60', '1:60:00', '1:00:60', '1:2', '-5:00', '20:', ':30', '1500', '1.5:00'])
    test(`rejects ${JSON.stringify(bad)}`, () => {
      expect(() => toMs(bad)).toThrow(/is not a duration/)
    })

  for (const bad of [-1, NaN, Infinity, null, undefined, {}])
    test(`rejects ${String(bad)}`, () => {
      expect(() => toMs(bad)).toThrow(/is not a duration/)
    })
})

test.describe('mockNetwork', () => {
  // a page on a local host, so its own requests are let through like a template's files
  const fetchFrom = (page, url) => page.evaluate((u) => fetch(u).then(async (r) => ({ status: r.status, text: await r.text() }), (e) => 'failed'), url)

  test('answers, fails, goes offline and blocks unknown hosts', async ({ page }) => {
    const net = await mockNetwork(page, {
      'api.example.com': (url) => {
        if (url.pathname === '/items') return [{ id: 1 }]
        if (url.pathname === '/error') return 503
        if (url.pathname === '/feed.xml') return reply({ body: '<rss/>', contentType: 'application/xml' })
      }
    })
    await page.route('http://127.0.0.1:9/', (route) => route.fulfill({ body: '<html></html>', contentType: 'text/html' }))
    await page.goto('http://127.0.0.1:9/')

    expect(await fetchFrom(page, 'https://api.example.com/items')).toEqual({ status: 200, text: '[{"id":1}]' })
    expect((await fetchFrom(page, 'https://api.example.com/error')).status).toBe(503)
    expect((await fetchFrom(page, 'https://api.example.com/feed.xml')).text).toBe('<rss/>')
    expect(await fetchFrom(page, 'https://api.example.com/unknown')).toBe('failed')
    expect(await fetchFrom(page, 'https://cdn.other.com/lib.js')).toBe('failed')
    expect(net.unmocked.map(String)).toEqual(['https://cdn.other.com/lib.js'])

    net.fail((url) => url.pathname === '/items', 500)
    expect((await fetchFrom(page, 'https://api.example.com/items')).status).toBe(500)
    net.goOffline()
    expect(await fetchFrom(page, 'https://api.example.com/feed.xml')).toBe('failed')
    expect(net.dropped).toHaveLength(2)
    net.goOnline()
    expect((await fetchFrom(page, 'https://api.example.com/items')).status).toBe(200)
  })
})
