import saveBook, { booksKey } from './save-book.js';

const deleteBook = book =>
  caches.open(booksKey).then(cache =>
    cache.keys().then(requests => {
      requests
        .filter(request =>
          request.url.includes(`${book.dataset.source}/${book.dataset.slug}.`)
        )
        .forEach(request => cache.delete(request));
      updateSavedBooks();
    })
  );

const downloadBook = book => {
  const anchor = document.createElement('a');
  anchor.href = book.dataset.href;
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const showCopyright = book =>
  (location = `#${book.dataset.source}/${book.dataset.slug}/copyright`);

export default () =>
  addEventListener('click', event => {
    if (event.target.dataset.action) {
      const menu = event.target.closest('.menu');
      if (menu) {
        menu.blur();
        const book = event.target.closest('.book');
        event.target.dataset.action === 'copyright'
          ? showCopyright(book)
          : event.target.dataset.action === 'delete'
          ? deleteBook(book)
          : event.target.dataset.action === 'download'
          ? downloadBook(book)
          : event.target.dataset.action === 'save'
          ? saveBook(book)
          : undefined;
      }
    }
  });
