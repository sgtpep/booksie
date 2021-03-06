let observer

const addCoverClass = (cover) =>
  cover.classList.add(`cover-${cover.dataset.cover}`)

const coverPreloaded = {}

export const coverURL = (index, scale = 1, buster = undefined) =>
  `covers/${index}${scale > 1 ? '@2x' : ''}.jpg${buster ? `?${buster}` : ''}`

const loadCover = (cover) => {
  if (!coverPreloaded[cover.dataset.cover]) {
    coverPreloaded[cover.dataset.cover] = true
    const image = new Image()
    image.addEventListener('load', () =>
      [
        ...document.querySelectorAll(
          `.cover[data-cover="${cover.dataset.cover}"]`,
        ),
      ].forEach((cover) => addCoverClass(cover)),
    )
    image.src = coverURL(
      cover.dataset.cover,
      devicePixelRatio,
      cover.dataset.buster,
    )
  }
}

export default () => {
  ;(
    observer ||
    (observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target)
            loadCover(entry.target)
          }
        }),
      { rootMargin: '500% 0%' },
    ))
  ).disconnect()
  const covers = [...document.querySelectorAll('.cover')]
  if (window.IntersectionObserver) {
    covers.forEach((cover) => observer.observe(cover))
  } else {
    covers.forEach((cover) => addCoverClass(cover))
  }
}
