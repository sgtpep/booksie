import { coverURL } from './cover-lazy-loading.js';

const downloadBook = book => {
  const anchor = document.createElement('a');
  anchor.download = '';
  anchor.href = book.dataset.href;
  anchor.target = '_blank';
  anchor.click();
};

const saveBook = book =>
  window.caches
    ? caches.open('books').then(cache => {
        const cover = book.querySelector('.cover');
        return cache
          .addAll([
            book.dataset.href,
            ...[1, 2].map(scale =>
              coverURL(cover.dataset.cover, scale, cover.dataset.buster)
            ),
          ])
          .then(() => {
            const clone = book.cloneNode(true);
            const cover = clone.querySelector('.cover');
            cover.classList.remove(`cover-${cover.dataset.cover}`);
            const coverClass = `cover-${cover.dataset.cover}-${
              cover.dataset.buster
            }`;
            cover.classList.add(coverClass);
            const style = [...document.styleSheets[0].rules]
              .find(style =>
                style.selectorText.startsWith(`.cover-${cover.dataset.cover},`)
              )
              .cssText.replace(/^.+( {)/, `.${coverClass}$1`);
            return cache.put(
              `/${book.dataset.source}/${book.dataset.slug}.html`,
              new Response(`${clone.outerHTML}\n${style}`, {
                headers: { 'Content-Type': 'text/html' },
              })
            );
          });
      })
    : alert('Not supported in your browser.');

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
