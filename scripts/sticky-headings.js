export default () => {
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(entries =>
      entries.forEach(entry => {
        entry.target.parentElement
          .querySelector('h2')
          .classList.toggle('sticky', !entry.isIntersecting);
      })
    );
    [...document.querySelectorAll('.source-books-sentinel')].forEach(sentinel =>
      observer.observe(sentinel)
    );
  }
};
