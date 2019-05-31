export default (onShuffle = () => {}) =>
  document.querySelector('#randomization').addEventListener('click', event => {
    if (event.target.tagName === 'A') {
      if (event.target.dataset.action === 'book') {
        const books = document.querySelectorAll('.book');
        books[Math.floor(Math.random() * books.length)].click();
      } else if (event.target.dataset.action === 'shuffle') {
        [...document.querySelectorAll('.books')].forEach(books => {
          const clone = books.cloneNode(true);
          [...clone.querySelectorAll('.book')].forEach((book, index, books) =>
            book.parentElement.insertBefore(
              books[(Math.random() * books.length) | 0],
              book.parentElement.firstElementChild
            )
          );
          books.parentElement.replaceChild(clone, books);
        });
        onShuffle();
      }
    }
  });
