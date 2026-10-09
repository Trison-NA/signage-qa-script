// The layout detectors must flag real problems and stay quiet on clean layouts.
const { test, expect } = require('@playwright/test')
const { findTextOverflow, findTextOverlap } = require('../src')

const page_ = (body) => `<!doctype html><html><head><style>
  html, body { margin: 0; font: 40px/1.2 sans-serif; }
</style></head><body>${body}</body></html>`

test.describe('findTextOverlap', () => {
  test('clean two-column row: no problems', async ({ page }) => {
    await page.setContent(page_(`
      <div style="display:flex"><div style="width:50%">9:30am</div><div style="width:50%">Yoga</div></div>
      <p>Second line</p>`))
    expect(await findTextOverlap(page)).toEqual([])
  })

  test('long name running into the next column', async ({ page }) => {
    await page.setContent(page_(`
      <div style="display:flex"><div style="width:200px;white-space:nowrap">Hump Day HIIT: Beach Body Edition</div><div>Studio A</div></div>`))
    const problems = await findTextOverlap(page)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('"Hump Day HIIT: Beach Body Edition"')
    expect(problems[0]).toContain('"Studio A"')
  })

  test('rows drawn on top of each other (absolute positioning)', async ({ page }) => {
    await page.setContent(page_(`
      <div style="position:absolute;top:100px">Burger $9</div>
      <div style="position:absolute;top:110px">Fries $4</div>`))
    expect(await findTextOverlap(page)).toHaveLength(1)
  })

  test('line-height too small for wrapped text in two elements', async ({ page }) => {
    await page.setContent(page_(`<div style="width:300px"><p style="margin:0;line-height:.5">Chicken sandwich</p><p style="margin:0;line-height:.5">Fries</p></div>`))
    expect((await findTextOverlap(page)).length).toBeGreaterThan(0)
  })

  test('hidden text is ignored, and `ignore` skips selectors', async ({ page }) => {
    await page.setContent(page_(`
      <div style="position:absolute;top:100px">Burger</div>
      <div style="position:absolute;top:100px;visibility:hidden">Hidden</div>
      <div style="position:absolute;top:100px;opacity:0">Faded</div>
      <div class="deco" style="position:absolute;top:100px">Deco</div>`))
    expect(await findTextOverlap(page, { ignore: ['.deco'] })).toEqual([])
  })
})

test.describe('findTextOverflow', () => {
  test('text inside the screen: no problems', async ({ page }) => {
    await page.setContent(page_('<p>Hello</p>'))
    expect(await findTextOverflow(page)).toEqual([])
  })

  test('text past the right edge of the screen', async ({ page }) => {
    await page.setContent(page_('<div style="position:fixed;left:1000px;white-space:nowrap">Too far right</div>'))
    const [problem] = await findTextOverflow(page)
    expect(problem).toMatch(/"Too far right" .* past the right of the screen/)
  })

  test('text cut off by a parent with overflow hidden', async ({ page }) => {
    await page.setContent(page_('<div class="cell" style="width:100px;overflow:hidden;white-space:nowrap">A very long class name</div>'))
    const [problem] = await findTextOverflow(page)
    expect(problem).toMatch(/is cut off by div\.cell: \d+px hidden at the right/)
  })

  test('text below the bottom of the screen, and the page scrolls', async ({ page }) => {
    await page.setContent(page_('<div style="height:1900px"></div><p>Last item</p>'))
    const problems = await findTextOverflow(page)
    expect(problems.some((p) => p.includes('"Last item"') && p.includes('bottom of the screen'))).toBe(true)
    expect(problems.some((p) => p.startsWith('the page scrolls down'))).toBe(true)
  })
})
