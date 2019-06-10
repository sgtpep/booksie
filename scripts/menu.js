import { coverURL } from './cover-lazy-loading.js';

export const booksKey = 'books';

const coverSize = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--cover-size')
);

const downloadBook = book => {
  const anchor = document.createElement('a');
  anchor.download = '';
  anchor.href = book.dataset.href;
  anchor.target = '_blank';
  anchor.click();
};

const generateCacheURL = (book, extension) =>
  `${book.dataset.source}/${book.dataset.slug}${extension}`;

const saveBook = book =>
  window.caches
    ? caches.open(booksKey).then(cache => {
        const cover = book.querySelector('.cover');
        const left = parseInt(cover.style.backgroundPositionX) / 100;
        const top = parseInt(cover.style.backgroundPositionY) / 100;
        return Promise.all([
          fetch(book.dataset.href).then(response =>
            cache.put(generateCacheURL(book, '.pdf'), response)
          ),
          Promise.all(
            [1, 2].map(scale =>
              new Promise((resolve, reject) => {
                const image = new Image();
                image.addEventListener('load', () => resolve([image, scale]));
                image.src = coverURL(
                  cover.dataset.cover,
                  scale,
                  cover.dataset.buster
                );
              }).then(([image, scale]) => {
                const canvas = document.createElement('canvas');
                canvas.height = coverSize * scale;
                canvas.width = coverSize * scale;
                canvas
                  .getContext('2d')
                  .drawImage(
                    image,
                    left * coverSize * scale,
                    top * coverSize * scale
                  );
                return canvas.toDataURL('image/jpeg', 0.8);
              })
            )
          ).then(images => {
            const clone = book.cloneNode(true);
            clone.dataset.href = generateCacheURL(book, '.pdf');
            const cover = clone.querySelector('.cover');
            cover.classList.add('offline');
            cover.classList.remove(`cover-${cover.dataset.cover}`);
            cover.setAttribute(
              'style',
              [...document.styleSheets[0].rules]
                .find(style =>
                  style.selectorText.startsWith(
                    `.cover-${cover.dataset.cover},`
                  )
                )
                .cssText.replace(/^.+{(.+)}$/, '$1')
                .replace(/(?<=url\()[^)]+/g, url => {
                  const match = url.match(/@(\d+)x/);
                  return images[match ? Number(match[1]) - 1 : 0];
                })
            );
            return cache.put(
              generateCacheURL(book, '.html'),
              new Response(clone.outerHTML, {
                headers: {
                  'Content-Length': clone.outerHTML.length,
                  'Content-Type': 'text/html',
                },
              })
            );
          }),
        ]);
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
