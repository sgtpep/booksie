export default () => {
  addEventListener('offline', () =>
    document.documentElement.classList.add('offline')
  );
  addEventListener('online', () =>
    document.documentElement.classList.remove('offline')
  );
};
