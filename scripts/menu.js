export default () =>
  document.querySelector('.books').addEventListener('click', event => {
    if (event.target.closest('.menu')) {
      const book = event.target.closest('.book');
      event.target.dataset.action === 'copyright'
        ? (location = `#${book.dataset.source}/${book.dataset.slug}/copyright`)
        : event.target.dataset.action === 'save'
        ? alert('Comming soon!')
        : undefined;
    }
  });
