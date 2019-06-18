import { coverURL } from './cover-lazy-loading.js';

export const booksKey = 'books';

const coverSize = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--cover-size')
);

const generateCacheURL = (book, extension) =>
  `${book.dataset.source}/${book.dataset.slug}${extension}`;

export default book =>
  window.caches
    ? caches.open(booksKey).then(cache => {
        book.classList.add('saving');
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
            clone.classList.add('offline');
            clone.classList.remove('saved');
            clone.classList.remove('saving');
            clone.dataset.href = generateCacheURL(book, '.pdf');
            const cover = clone.querySelector('.cover');
            cover.classList.remove(`cover-${cover.dataset.cover}`);
            const style = document.styleSheets[0];
            cover.setAttribute(
              'style',
              [...(style.rules || style.cssRules)]
                .find(style =>
                  style.selectorText.startsWith(
                    `.cover-${cover.dataset.cover},`
                  )
                )
                .cssText.replace(/^.+{(.+)}$/, '$1')
                .replace(/(\burl\()([^)]+)/g, (match, prefix, url) => {
                  const scale = url.match(/@(\d+)x/);
                  return `${prefix}${images[scale ? Number(scale[1]) - 1 : 0]}`;
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
        ]).then(() => {
          book.classList.add('saved');
          setTimeout(() => book.classList.remove('saved'), 1500);
          book.classList.remove('saving');
          updateSavedBooks();
        });
      })
    : alert('Not supported in your browser.');
