let observer;

const addCoverClass = cover => toggleCoverClass(cover, true);

const coverPreloaded = {};

export const coverURL = (index, scale = 1, buster = undefined) =>
  `covers/${index}${scale > 1 ? '@2x' : ''}.jpg${buster ? `?${buster}` : ''}`;

const loadCover = cover => {
  if (coverPreloaded[cover.dataset.cover]) {
    addCoverClass(cover);
  } else {
    coverPreloaded[cover.dataset.cover] = true;
    const image = new Image();
    image.addEventListener('load', () =>
      [
        ...document.querySelectorAll(
          `.cover[data-cover="${cover.dataset.cover}"]`
        ),
      ].forEach(cover => addCoverClass(cover))
    );
    image.src = coverURL(
      cover.dataset.cover,
      devicePixelRatio,
      cover.dataset.buster
    );
  }
};

const toggleCoverClass = (cover, force) =>
  cover.classList.toggle(`cover-${cover.dataset.cover}`, force);

export default () => {
  (
    observer ||
    (observer = new IntersectionObserver(
      entries =>
        entries.forEach(entry =>
          entry.isIntersecting
            ? loadCover(entry.target)
            : toggleCoverClass(entry.target, false)
        ),
      { rootMargin: '500% 0%' }
    ))
  ).disconnect();
  const covers = [...document.querySelectorAll('.cover')];
  if (window.IntersectionObserver) {
    covers.forEach(cover => observer.observe(cover));
  } else {
    covers.forEach(cover => addCoverClass(cover));
  }
};
