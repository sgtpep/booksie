const randomBook = () => {
  const books = document.querySelectorAll('.book');
  books[Math.floor(Math.random() * books.length)].click();
};

const shuffleBooks = (onShuffle = () => {}) =>
  [...document.querySelectorAll('.books')]
    .reduce(
      (promise, books) =>
        promise.then(
          () =>
            new Promise(resolve =>
              setTimeout(() => {
                shuffleSourceBooks(books);
                resolve();
              })
            )
        ),
      Promise.resolve()
    )
    .then(() => onShuffle());

const shuffleSourceBooks = books => {
  const clone = books.cloneNode(true);
  [...clone.querySelectorAll('.book')].forEach((book, index, books) =>
    book.parentElement.insertBefore(
      books[(Math.random() * books.length) | 0],
      book.parentElement.firstElementChild
    )
  );
  books.parentElement.replaceChild(clone, books);
};

export default (onShuffle = () => {}) =>
  document
    .querySelector('#randomization')
    .addEventListener(
      'click',
      event =>
        event.target.tagName === 'A' &&
        (event.target.dataset.action === 'book'
          ? randomBook()
          : event.target.dataset.action === 'shuffle'
          ? shuffleBooks(onShuffle)
          : undefinded)
    );
