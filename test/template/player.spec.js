// mockPlayer against the real si9n-sdk, and bin/serve.js, the server every template project tests through.
const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')
const { open, rows } = require('./fixtures')

test.describe('mockPlayer, with the real si9n-sdk', () => {
  test('CMS fields not given get their default from si9n.json', async ({ page }) => {
    await open(page)
    await expect(page.locator('#title')).toHaveText('Upcoming')
  })

  test('CMS values given to mockPlayer reach the template', async ({ page }) => {
    await open(page, { data: { title: 'Today at the club' } })
    await expect(page.locator('#title')).toHaveText('Today at the club')
  })

  test('the preview time reaches the template as si9n.display.now', async ({ page }) => {
    await open(page, { now: '2030-01-15 12:25:00' })
    await expect(page.locator('#preview')).toHaveText('Preview: 2030-01-15 12:25:00')
  })

  test('without mockPlayer, the SDK gives up on the player and the template still runs', async ({ page }) => {
    await open(page, { player: false })
    await expect(page.locator('#title')).toHaveText('') // no CMS data outside a player
    await expect(rows(page)).toHaveCount(3)
  })
})

test.describe('bin/serve.js (the test server)', () => {
  test('serves the build, ignoring the ?hash webpack adds to asset URLs', async ({ request }) => {
    const index = await request.get('/')
    expect(index.status()).toBe(200)
    expect(index.headers()['content-type']).toBe('text/html')
    expect(await index.text()).toContain('signage-qa test template')

    const js = await request.get('/app.js?abc123')
    expect(js.status()).toBe(200)
    expect(js.headers()['content-type']).toBe('text/javascript')

    expect((await request.get('/missing.js')).status()).toBe(404)
  })

  test('a malformed URL gets a 400, and the server keeps running', async ({ request }) => {
    expect((await request.get('/%E0%A4%A.js')).status()).toBe(400)
    expect((await request.get('/')).status()).toBe(200)
  })

  test('never serves files outside the build folder', async ({ request }) => {
    // a sibling folder whose name starts like the build folder's ("site" -> "site-private")
    const sibling = path.join(__dirname, 'site-private')
    fs.mkdirSync(sibling, { recursive: true })
    fs.writeFileSync(path.join(sibling, 'secret.txt'), 'not part of the build')
    try {
      // %2f keeps the "../" from being resolved by the client; the server decodes it
      expect((await request.get('/%2e%2e%2fplaywright.config.js')).status()).toBe(404)
      expect((await request.get('/%2e%2e%2fsite-private%2fsecret.txt')).status()).toBe(404)
    } finally {
      fs.rmSync(sibling, { recursive: true, force: true })
    }
  })
})
