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
        saved.parentElement
          .querySelector('.books')
          .insertAdjacentHTML('afterbegin', htmls.join('\n'));
        saved.classList.toggle('visible', htmls.length);
      })
  );
