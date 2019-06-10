import { booksKey } from './menu.js';

export default () =>
  window.caches &&
  caches.open(booksKey).then(cache =>
    cache
      .keys()
      .then(requests =>
        Promise.all(
          requests
            .reverse()
            .filter(request => request.url.endsWith('.html'))
            .map(request =>
              caches.match(request).then(response => response.text())
            )
        )
      )
      .then(htmls => {
        const saved = document.querySelector('#saved');
        saved.parentElement
          .querySelector('.books')
          .insertAdjacentHTML('afterbegin', htmls.join('\n'));
        saved.classList.toggle('loaded', htmls.length);
      })
  );
