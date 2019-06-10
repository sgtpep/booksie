import { booksKey } from './menu.js';

export default () =>
  window.caches &&
  caches.open(booksKey).then(cache =>
    cache
      .keys()
      .then(requests =>
        Promise.all(
          requests
            .filter(request => request.url.endsWith('.html'))
            .map(request =>
              caches.match(request).then(response => response.text())
            )
        )
      )
      .then(html => {
        const saved = document.querySelector('#saved');
        saved.parentElement
          .querySelector('.books')
          .insertAdjacentHTML('afterbegin', html.join('\n'));
        saved.classList.add('loaded');
      })
  );
