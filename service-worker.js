const baseURL = `${location.protocol}//${location.host}/`

const booksKey = 'books'

const cacheable = url =>
  urls.includes(url.replace(baseURL, '')) ||
  (location.hostname === 'localhost' &&
    /\.(css|js)$/.test(url) &&
    url !== `${baseURL}service-worker.js`)

const listenFetch = () =>
  self.addEventListener('fetch', event =>
    event.request.url.endsWith('.pdf')
      ? event.respondWith(
          caches
            .match(event.request)
            .then(response => response || fetch(event.request)),
        )
      : cacheable(event.request.url) &&
        event.respondWith(
          navigator.onLine || navigator.onLine === undefined
            ? fetch(event.request)
                .then(response =>
                  caches.open(shellKey).then(cache => {
                    cache.put(event.request, response.clone())
                    return response
                  }),
                )
                .catch(() => caches.match(event.request))
            : caches.match(event.request),
        ),
  )

const listenInstall = () =>
  self.addEventListener('install', event =>
    event.waitUntil(
      caches
        .open(shellKey)
        .then(cache => cache.addAll(urls.map(url => url || '.'))),
    ),
  )

const main = () => {
  listenFetch()
  listenInstall()
}

const shellKey = 'shell'

const urls = [
  '',
  'assets/favicon.png',
  'assets/icon.png',
  'assets/icon.svg',
  'assets/logo.svg',
  'assets/privacy-policy.html',
  'assets/splash.png',
  'manifest.webmanifest',
  'pdfjs/pdf.min.js',
  'pdfjs/pdf.worker.min.js',
]

main()
