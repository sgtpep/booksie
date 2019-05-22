export default () => {
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(
      entries =>
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(`cover-${entry.target.dataset.cover}`);
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: '500% 0%' }
    );
    [...document.querySelectorAll('.cover')].forEach(cover =>
      observer.observe(cover)
    );
  }
};
