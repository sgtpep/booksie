export default () =>
  document.querySelector('#randomization').addEventListener('click', event => {
    if (event.target.tagName === 'A') {
      if (event.target.dataset.action === 'book') {
        const books = document.querySelectorAll('.book');
        books[Math.floor(Math.random() * books.length)].click();
      } else if (event.target.dataset.action === 'shuffle') {
        console.log('!');
      }
    }
  });
