const baseURL = `${location.protocol}//${location.host}`;

const cacheable = url =>
  urls.includes(url.replace(`${baseURL}/`, '')) ||
  (location.hostname === 'localhost' &&
    /\.(css|js)$/.test(url) &&
    url !== `${baseURL}/service-worker.js`);

const listenFetch = () =>
  self.addEventListener(
    'fetch',
    event =>
      cacheable(event.request.url) &&
      event.respondWith(
        navigator.onLine || navigator.onLine === undefined
          ? fetch(event.request)
              .then(response =>
                caches.open(shell).then(cache => {
                  cache.put(event.request, response.clone());
                  return response;
                })
              )
              .catch(() => caches.match(event.request))
          : caches.match(event.request)
      )
  );

const listenInstall = () =>
  self.addEventListener('install', event =>
    event.waitUntil(
      caches
        .open(shell)
        .then(cache => cache.addAll(urls.map(url => url || '.')))
    )
  );

const main = () => {
  listenFetch();
  listenInstall();
};

const shell = 'shell';

const urls = [
  '',
  'manifest.webmanifest',
  ...['favicon.png', 'logo.svg'].map(filename => `assets/${filename}`),
];

main();
