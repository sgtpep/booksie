function updateSavedBooks(initial = false) {
  window.caches &&
    caches.open('books').then(cache =>
      cache
        .keys()
        .then(requests => {
          const urls = requests.map(request => request.url);
          return Promise.all(
            requests
              .reverse()
              .filter(
                request =>
                  request.url.endsWith('.html') &&
                  urls.includes(request.url.replace(/\.\w+$/, '.pdf'))
              )
              .map(request =>
                caches.match(request).then(response => response.text())
              )
          );
        })
        .then(htmls => {
          const saved = document.querySelector('#saved');
          const height = document.documentElement.scrollHeight;
          const books = saved.closest('.source-books').querySelector('.books');
          while (
            books.firstElementChild &&
            books.firstElementChild.classList.contains('book')
          ) {
            books.removeChild(books.firstElementChild);
          }
          books.insertAdjacentHTML('afterbegin', htmls.join('\n'));
          saved.classList.toggle('visible', htmls.length);
          document.documentElement.scrollHeight > height &&
            !initial &&
            scrollBy(0, document.documentElement.scrollHeight - height);
        })
    );
}
updateSavedBooks(true);
