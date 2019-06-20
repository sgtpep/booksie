export default () => {
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(entries =>
      entries.forEach(
        entry =>
          entry.boundingClientRect.width &&
          entry.target.nextElementSibling.classList.toggle(
            'sticky',
            !entry.isIntersecting && entry.boundingClientRect.top < 0
          )
      )
    );
    [...document.querySelectorAll('.stickiness-sentinel')].forEach(sentinel =>
      observer.observe(sentinel)
    );
  }
};
