#!/usr/bin/env node
// Serves a template build (dist/, the exact contents of the zip) for the Playwright tests.
// Usage: signage-qa-serve --dir dist --port 5100
const http = require('http')
const fs = require('fs')
const path = require('path')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const ROOT = path.resolve(arg('dir', 'dist'))
const PORT = Number(arg('port', process.env.QA_PORT || 5100))

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error(`${path.join(ROOT, 'index.html')} not found. Run "npm run build" first (or "npm run qa", which builds for you).`)
  process.exit(1)
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2'
}

http.createServer((req, res) => {
  let urlPath
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]) // webpack adds ?hash to asset urls
  } catch {
    res.writeHead(400) // malformed %-encoding; throwing here would stop the server mid-run
    return res.end('Bad request')
  }
  const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath)
  // ROOT + separator, or "dist-old/..." would pass as being inside "dist"
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404)
    return res.end('Not found')
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(PORT, '127.0.0.1', () => console.log(`Serving ${ROOT} on http://127.0.0.1:${PORT}`))
