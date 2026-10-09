/*
 * Network mock: answers the template's data requests with fixtures, and makes sure
 * nothing else leaves the machine during a test.
 *
 *   const net = await mockNetwork(page, {
 *     'fitness-sf.exerp.com': (url) => {
 *       if (url.pathname.endsWith('/centers')) return CENTERS   // object/array -> JSON
 *       if (url.pathname.endsWith('/login/staff')) return 401   // number -> that HTTP status
 *       if (url.pathname.endsWith('/feed.xml')) return reply({ body: xml, contentType: 'application/xml' })
 *     }                                                         // undefined -> the request fails
 *   })
 *
 * The template's own files (127.0.0.1 / localhost) are always served: on a player they are on disk.
 * Requests to hosts without a handler are aborted and listed in net.unmocked.
 *
 * During a test:
 *   net.goOffline() / net.goOnline()   every mocked host fails as with no internet / back to normal
 *   net.fail(url => ..., 500)          only matching requests fail (with that status, or 'abort')
 *   net.requests                       every request that reached a mocked host (URL objects)
 *   net.dropped                        requests that failed because of goOffline() / fail()
 *   await net.settle(page)             wait until in-flight requests are answered and the page re-rendered
 */
const LOCAL = new Set(['127.0.0.1', 'localhost', '[::1]'])
const REPLY = Symbol('reply')

/** A non-JSON answer: reply({ status, body, contentType, headers }) (any route.fulfill option). */
const reply = (options) => ({ [REPLY]: options })

async function mockNetwork(page, hosts = {}) {
  const net = {
    requests: [],
    dropped: [],
    unmocked: [],
    offline: false,
    failures: [],
    inFlight: 0,
    goOffline() { net.offline = true },
    goOnline() { net.offline = false; net.failures = [] },
    fail(match, status = 500) { net.failures.push({ match, status }) },
    async settle(page, { quiet = 300 } = {}) {
      while (net.inFlight > 0) await page.waitForTimeout(50)
      await page.waitForTimeout(quiet) // let the app process the answer and re-render
    }
  }

  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (LOCAL.has(url.hostname)) return route.continue()

    const handler = hosts[url.hostname]
    if (!handler) {
      net.unmocked.push(url)
      return route.abort('blockedbyclient')
    }

    net.requests.push(url)
    if (net.offline) {
      net.dropped.push(url)
      return route.abort('internetdisconnected')
    }
    const failure = net.failures.find((f) => f.match(url, request))
    if (failure) {
      net.dropped.push(url)
      return failure.status === 'abort' ? route.abort('connectionfailed') : route.fulfill({ status: failure.status })
    }

    net.inFlight++
    try {
      const answer = await handler(url, request)
      if (answer === undefined) return await route.abort('failed')
      if (typeof answer === 'number') return await route.fulfill({ status: answer })
      if (answer[REPLY]) return await route.fulfill(answer[REPLY])
      return await route.fulfill({ json: answer })
    } finally {
      net.inFlight--
    }
  })

  return net
}

module.exports = { mockNetwork, reply }
