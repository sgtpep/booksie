const loadImage = (image) => {
  const newImage = new DOMParser().parseFromString(
    image.nextElementSibling.textContent,
    'text/html',
  ).body.firstElementChild
  newImage.classList.add('lazy-loading')
  image.parentElement.replaceChild(newImage, image)
  setTimeout(() => newImage.classList.add('loaded'))
}

export default () => {
  const images = [...document.querySelectorAll('img.lazy-loading')]
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target)
            loadImage(entry.target)
          }
        }),
      { rootMargin: '500% 0%' },
    )
    images.forEach((image) => observer.observe(image))
  } else {
    images.forEach((image) => addCoverClass(image))
  }
}
