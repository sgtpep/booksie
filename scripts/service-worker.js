export default () =>
  (navigator.onLine || navigator.onLine === undefined) &&
  navigator.serviceWorker &&
  navigator.serviceWorker.register('service-worker.js');
