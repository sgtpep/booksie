export default () =>
  document.querySelector('#random-book').addEventListener('click', () => {
    const books = document.querySelectorAll('.book');
    books[Math.floor(Math.random() * books.length)].click();
  });
