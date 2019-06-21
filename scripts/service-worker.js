export default () =>
  navigator.serviceWorker &&
  navigator.serviceWorker.register('service-worker.js');
