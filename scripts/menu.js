export default () =>
  addEventListener('click', event => {
    if (event.target.dataset.action && event.target.closest('.menu')) {
      const book = event.target.closest('.book');
      event.target.dataset.action === 'copyright'
        ? (location = `#${book.dataset.source}/${book.dataset.slug}/copyright`)
        : event.target.dataset.action === 'save'
        ? alert('Comming soon!')
        : undefined;
    }
  });
