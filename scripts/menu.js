export default () =>
  document
    .querySelector('.books')
    .addEventListener(
      'click',
      event =>
        event.target.closest('.menu') &&
        (event.target.dataset.action === 'copyright'
          ? alert('Comming soon!')
          : event.target.dataset.action === 'save'
          ? alert('Comming soon!')
          : undefined)
    );
