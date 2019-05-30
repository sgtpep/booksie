export default () =>
  document.getElementById('contact').addEventListener('click', event => {
    event.preventDefault();
    location = `mailto:${atob(
      'bWFpbEBkYW5pbC5tb2Jp'
    )}?subject=${encodeURIComponent('A message from Booksie')}`;
  });
