const addCoverClass = cover =>
  cover.classList.add(`cover-${cover.dataset.cover}`);

export default () => {
  const covers = [...document.querySelectorAll('.cover')];
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(
      entries =>
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            addCoverClass(entry.target);
            observer.unobserve(entry.target);
          }
        }),
      { rootMargin: '500% 0%' }
    );
    covers.forEach(cover => observer.observe(cover));
  } else {
    covers.forEach(cover => addCoverClass(cover));
  }
};
