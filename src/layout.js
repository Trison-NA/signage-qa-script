/*
 * Layout checks that work on any template, without knowing its markup.
 *
 * They look at every piece of visible text on the page (each DOM text node, measured line by
 * line with Range.getClientRects, so the boxes hug the glyphs, not the containing element):
 *
 *   findTextOverflow  text that runs past the screen edge, or is cut off by a parent with
 *                     overflow: hidden / auto / scroll, and a page that scrolls
 *   findTextOverlap   text whose box crosses another text's box
 *
 * Problems come back as readable strings, e.g.
 *   '"Hump Day HIIT: Beach Body Edition" (div.col-5 > span) overlaps "class studio" (div.col-4 > p) by 41x18px'
 * The expect* versions also outline the offending text in red, so the report screenshot shows it.
 *
 * Options (all checks):
 *   ignore     CSS selectors whose text is skipped (decorative text, a ticker that scrolls on purpose)
 *   tolerance  px of overlap/overflow allowed before it counts, default 2 (anti-aliasing, letter-spacing)
 */
const { playwright } = require('./project')

// Runs in the browser. Returns every visible text node with its line boxes.
function scanText({ ignore, tolerance }) {
  const W = window.innerWidth
  const H = window.innerHeight
  const where = (el) => {
    const parts = []
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      let s = e.tagName.toLowerCase()
      if (e.id) s += `#${e.id}`
      else if (e.classList.length) s += `.${[...e.classList].slice(0, 2).join('.')}`
      parts.unshift(s)
    }
    return parts.join(' > ') || 'body'
  }
  const snippet = (t) => {
    t = t.replace(/\s+/g, ' ').trim()
    return t.length > 40 ? `${t.slice(0, 37)}...` : t
  }

  const texts = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const start = node.data.search(/\S/)
    if (start === -1) continue
    const el = node.parentElement
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue
    if (el.closest('.signage-qa-highlight')) continue
    if (ignore.length && el.closest(ignore.join(','))) continue
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, node.data.length - node.data.match(/\s*$/)[0].length)
    const rects = [...range.getClientRects()]
      .filter((r) => r.width > 0.5 && r.height > 0.5)
      .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }))
    if (rects.length) texts.push({ el, text: snippet(node.data), where: where(el), rects })
  }

  // ---- overflow: screen edges, clipping parents, scrolling page
  const overflow = []
  const px = (n) => `${Math.round(n)}px`
  for (const t of texts) {
    let worst = null
    for (const r of t.rects) {
      const out = { left: -r.left, right: r.right - W, top: -r.top, bottom: r.bottom - H }
      for (const [side, amount] of Object.entries(out)) {
        if (amount > tolerance && (!worst || amount > worst.amount)) worst = { side, amount, rect: r }
      }
    }
    if (worst) {
      overflow.push({
        message: `"${t.text}" (${t.where}) runs ${px(worst.amount)} past the ${worst.side} of the screen`,
        rects: [worst.rect]
      })
      continue
    }
    // nearest ancestor that clips and hides part of the text
    for (let e = t.el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e)
      const clipX = cs.overflowX !== 'visible'
      const clipY = cs.overflowY !== 'visible'
      if (!clipX && !clipY) continue
      const b = e.getBoundingClientRect()
      const box = { left: b.left + e.clientLeft, top: b.top + e.clientTop }
      box.right = box.left + e.clientWidth
      box.bottom = box.top + e.clientHeight
      let hidden = null
      for (const r of t.rects) {
        const out = {
          ...(clipX && { left: box.left - r.left, right: r.right - box.right }),
          ...(clipY && { top: box.top - r.top, bottom: r.bottom - box.bottom })
        }
        for (const [side, amount] of Object.entries(out)) {
          if (amount > tolerance && (!hidden || amount > hidden.amount)) hidden = { side, amount, rect: r }
        }
      }
      if (hidden) {
        overflow.push({
          message: `"${t.text}" (${t.where}) is cut off by ${where(e)}: ${px(hidden.amount)} hidden at the ${hidden.side}`,
          rects: [hidden.rect]
        })
        break
      }
    }
  }
  const doc = document.documentElement
  if (doc.scrollWidth > W + tolerance) overflow.push({ message: `the page scrolls sideways: content is ${px(doc.scrollWidth)} wide on a ${px(W)} screen`, rects: [] })
  if (doc.scrollHeight > H + tolerance) overflow.push({ message: `the page scrolls down: content is ${px(doc.scrollHeight)} tall on a ${px(H)} screen`, rects: [] })

  // ---- overlap: any two text boxes crossing each other
  const overlap = []
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      let worst = null
      for (const a of texts[i].rects) {
        for (const b of texts[j].rects) {
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (w > tolerance && h > tolerance && (!worst || w * h > worst.w * worst.h)) worst = { w, h, a, b }
        }
      }
      if (worst) {
        overlap.push({
          message: `"${texts[i].text}" (${texts[i].where}) overlaps "${texts[j].text}" (${texts[j].where}) by ${Math.round(worst.w)}x${px(worst.h)}`,
          rects: [worst.a, worst.b]
        })
      }
    }
  }

  return { overflow, overlap, textCount: texts.length }
}

const scan = (page, { ignore = [], tolerance = 2 } = {}) => page.evaluate(scanText, { ignore, tolerance })

/** Text that runs off screen or is cut off, and page scrolling. Returns problem strings. */
async function findTextOverflow(page, options) {
  return (await scan(page, options)).overflow.map((p) => p.message)
}

/** Text crossing other text. Returns problem strings. */
async function findTextOverlap(page, options) {
  return (await scan(page, options)).overlap.map((p) => p.message)
}

// red outlines on the problems, so the end-of-test screenshot shows where they are
async function highlight(page, problems) {
  const rects = problems.flatMap((p) => p.rects)
  if (!rects.length) return
  await page.evaluate((rects) => {
    for (const r of rects) {
      const d = document.createElement('div')
      d.className = 'signage-qa-highlight'
      Object.assign(d.style, {
        position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px`,
        outline: '3px solid red', background: 'rgba(255,0,0,.15)', zIndex: 2147483647, pointerEvents: 'none'
      })
      document.body.appendChild(d)
    }
  }, rects)
}

async function expectClean(page, kind, options, emptyMessage) {
  const { expect } = playwright()
  const result = await scan(page, options)
  expect(result.textCount, emptyMessage).toBeGreaterThan(0)
  await highlight(page, result[kind])
  expect(result[kind].map((p) => p.message)).toEqual([])
}

/**
 * Both checks from one scan: fails if any text runs off screen, is cut off or overlaps other
 * text, or the page scrolls. Both lists are reported, even when the first one fails.
 */
async function expectCleanLayout(page, options) {
  const { expect } = playwright()
  const result = await scan(page, options)
  expect(result.textCount, 'no visible text on the page, so there is nothing to check').toBeGreaterThan(0)
  await highlight(page, [...result.overflow, ...result.overlap])
  expect.soft(result.overflow.map((p) => p.message), 'text off screen or cut off').toEqual([])
  expect.soft(result.overlap.map((p) => p.message), 'text overlapping other text').toEqual([])
}

/** Fails if any text runs off screen or is cut off, or the page scrolls. */
const expectNoTextOverflow = (page, options) =>
  expectClean(page, 'overflow', options, 'no visible text on the page, so there is nothing to check')

/** Fails if any text crosses other text. */
const expectNoTextOverlap = (page, options) =>
  expectClean(page, 'overlap', options, 'no visible text on the page, so there is nothing to check')

/**
 * Position and scroll sizes of the first element matching `selector`, for project-specific checks
 * like "this column's content fits": expect(b.scrollWidth).toBeLessThanOrEqual(b.clientWidth)
 */
const box = (page, selector) =>
  page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
  })

module.exports = { findTextOverflow, findTextOverlap, expectCleanLayout, expectNoTextOverflow, expectNoTextOverlap, box }
