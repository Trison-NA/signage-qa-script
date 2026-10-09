/*
 * A minimal si9n schedule template, used to test the signage-qa suites against a real page:
 * the real si9n-sdk (driven by mockPlayer), items fetched from an API (answered by mockNetwork),
 * a refresh every few minutes and a list that drops ended items as time passes.
 *
 * The CMS field `defect` switches on one known bug, so tests can check that a suite catches it:
 *   blank-on-error   a failed refresh empties the list instead of keeping the last items
 *   no-refresh       items are fetched once, never again
 *   never-expire     ended items stay on screen
 *   overlap          every row is drawn at the same spot
 */
const API = 'https://api.example.test/items'

let cnf = {}
let items = []

si9n.on('data', (event) => {
  cnf = Object.fromEntries((event.data || []).map(({ key, value }) => [key, value]))
})

// fires after the player's load message, or after the SDK gives up waiting for a player
si9n.on('ready', () => {
  document.getElementById('title').textContent = cnf.title || ''
  document.getElementById('preview').textContent = si9n.display?.now ? `Preview: ${si9n.display.now}` : ''
  document.body.classList.toggle('overlap', cnf.defect === 'overlap')
  fetchItems()
  setInterval(render, 10e3)
})

async function fetchItems() {
  if (cnf.defect !== 'no-refresh') setTimeout(fetchItems, (Number(cnf.refreshMinutes) || 20) * 60e3)
  try {
    const res = await fetch(API)
    if (!res.ok) throw new Error(`items: ${res.status}`)
    items = await res.json()
  } catch (err) {
    if (cnf.defect === 'blank-on-error') items = []
  }
  render()
}

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

function render() {
  const now = Date.now()
  const upcoming = cnf.defect === 'never-expire' ? items : items.filter((item) => Date.parse(item.end) > now)
  const list = document.getElementById('list')
  list.replaceChildren(...upcoming.map((item) => {
    const li = document.createElement('li')
    li.className = 'item'
    li.innerHTML = '<span class="time"></span><span class="name"></span>'
    li.querySelector('.time').textContent = time.format(new Date(item.start))
    li.querySelector('.name').textContent = item.name
    return li
  }))
}
