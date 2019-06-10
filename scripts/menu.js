import saveBook from './save-book.js';

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
    if (event.target.dataset.action && event.target.closest('.menu')) {
      const book = event.target.closest('.book');
      event.target.dataset.action === 'copyright'
        ? showCopyright(book)
        : event.target.dataset.action === 'download'
        ? downloadBook(book)
        : event.target.dataset.action === 'save'
        ? saveBook(book)
        : undefined;
    }
  });
