let clientX
let currentNumber
let loadingTask
let numberQueue
let onResizeDebounced
let pdf
let renderTask
let rendering
let transitionEndName
let urls

const calculateViewport = (page) => {
  updatePageView(page)
  const viewer = queryElement('#viewer')
  const { height, width } = page.getViewport(1)
  return page.getViewport(
    (height / width > viewer.clientHeight / viewer.clientWidth
      ? viewer.clientHeight / height
      : viewer.clientWidth / width) * devicePixelRatio,
  )
}

const closeViewer = () => {
  redirectHome()
  setTimeout(() => unloadDocument())
  toggleViewer(false)
  document.exitFullscreen()
}

const createImage = (url, onLoad) => {
  const image = new Image()
  image.addEventListener('load', () => onLoad(image))
  image.addEventListener('dragstart', (event) => event.preventDefault())
  image.draggable = false
  image.src = url
}

const debounce = (func, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), delay)
  }
}

const displayNextPage = () =>
  currentNumber && pdf && currentNumber === pdf.numPages
    ? closeViewer()
    : displayPage(currentNumber + 1)

const displayPage = (number) => {
  if (numberValid(number)) {
    currentNumber = number
    updateNavigation(number)
    if (!urls[number]) {
      hidePages()
      toggleLoading(true)
    }
    renderPage(number)
  }
}

const displayPreviousPage = () => displayPage(currentNumber - 1)

const documentURL = (source, slug) => {
  const book = queryBook(source, slug)
  return book && book.dataset.href
}

const elements = {}

const eventClientX = (event) =>
  (event.changedTouches ? event.changedTouches[0] : event).clientX

const extractHash = (url) => url.replace(/^.+?(#|$)/, '')

const generateBookTitle = (source, slug) => {
  const book = queryBook(source, slug)
  return book && `${book.dataset.title} (by ${book.dataset.sourceName})`
}

const hidePages = () => {
  const remove = (element) =>
    element.parentElement && element.parentElement.removeChild(element)
  ;[...queryElement('#viewer-pages').children].forEach((image) => {
    image.classList.add('fading')
    listenTransitionEnd(image, () => remove(image))
  })
}

const listenHashChange = () => {
  addEventListener('hashchange', onHashChange)
  onHashChange()
}

const listenTransitionEnd = (element, onTransitionEnd) => {
  transitionEndName ||
    (transitionEndName = (Object.entries({
      transition: 'transitionend',
      MozTransition: 'transitionend',
      WebkitTransition: 'webkitTransitionEnd',
      OTransition: 'otransitionend',
    }).find(([property, type]) => property in document.body.style) || [])[1])
  if (transitionEndName) {
    const listener = () => {
      element.removeEventListener(transitionEndName, listener)
      onTransitionEnd()
    }
    element.addEventListener(transitionEndName, listener)
  } else {
    onTransitionEnd()
  }
}

const listenViewerClick = () =>
  queryElement('#viewer').addEventListener('click', (event) =>
    event.target === queryElement('#viewer-action-close')
      ? closeViewer()
      : [
          queryElement('#viewer-action-next'),
          queryElement('#viewer-edge-next'),
        ].includes(event.target)
      ? displayNextPage()
      : [
          queryElement('#viewer-action-previous'),
          queryElement('#viewer-edge-previous'),
        ].includes(event.target)
      ? displayPreviousPage()
      : undefined,
  )

const listenViewerDoubleClick = () => {
  const viewer = queryElement('#viewer')
  viewer.addEventListener(
    'dblclick',
    (event) =>
      event.target.tagName === 'A' ||
      (document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen()),
  )
}

const listenViewerDragEvents = () => {
  const viewer = queryElement('#viewer')
  viewer.addEventListener('mousedown', onDragStart)
  viewer.addEventListener('mouseup', onDragStop)
  viewer.addEventListener('touchend', onDragStop)
  viewer.addEventListener('touchstart', onDragStart, { passive: true })
}

const loadDocument = (source, slug, copyright = false) => {
  toggleError(false)
  toggleLoading(true, generateBookTitle(source, slug))
  setTimeout(() =>
    loadPDFJS(() => {
      unloadDocument()
      window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
        'pdfjs/pdf.worker.min.js'
      ;(loadingTask = window['pdfjs-dist/build/pdf'].getDocument(
        documentURL(source, slug),
      )).promise.then(
        (loadedPDF) => {
          pdf = loadedPDF
          const copyrightPage = Number(book.dataset.copyrightPage)
          displayPage(
            copyright
              ? copyrightPage > 0
                ? copyrightPage
                : pdf.numPages + copyrightPage + 1
              : 1,
          )
          resetQueue()
          setTimeout(() => updateProgress(), 50)
          updateProgress(size, size)
        },
        (error) => {
          toggleError(
            true,
            `Loading error: ${error.message.replace(/\.$/, '')}.`,
          )
          toggleLoading(false)
        },
      )
      const book = queryBook(source, slug)
      const size = Number(book.dataset.size)
      loadingTask.onProgress = throttle(
        (progress) => updateProgress(progress.loaded, size),
        150,
      )
    }),
  )
}

const loadPDFJS = (onLoad) => {
  if (window['pdfjs-dist/build/pdf']) {
    onLoad()
  } else {
    var script = document.createElement('script')
    script.addEventListener('load', onLoad)
    script.src = 'pdfjs/pdf.min.js'
    document.body.appendChild(script)
  }
}

const numberValid = (number) => number >= 1 && pdf && number <= pdf.numPages

const offsetView = (view, top, right, bottom, left) => {
  view[0] += left
  view[1] += bottom
  view[2] -= right
  view[3] -= top
}

const onDragStart = (event) => (clientX = eventClientX(event))

const onDragStop = (event) => {
  const difference = eventClientX(event) - clientX
  Math.abs(difference) >= 100 &&
    (difference > 0 ? displayPreviousPage() : displayNextPage())
}

const onHashChange = (event = { newURL: location.href, oldURL: '' }) => {
  const hash = extractHash(event.newURL)
  const oldHash = extractHash(event.oldURL)
  if (hash.includes('/')) {
    const [source, slug, action] = hash.split('/')
    openViewer(source, decodeURIComponent(slug), action === 'copyright')
  } else if (oldHash.includes('/')) {
    closeViewer()
  }
}

const onKeyDown = (event) =>
  event.key === 'ArrowLeft' || (event.key === ' ' && event.shiftKey)
    ? displayPreviousPage()
    : event.key === 'ArrowRight' || (event.key === ' ' && !event.shiftKey)
    ? displayNextPage()
    : event.key === 'Escape'
    ? closeViewer()
    : undefined

const onResize = () => {
  const image = queryElement('#viewer-pages').firstElementChild || {}
  const [width, height] = [
    image.naturalWidth / devicePixelRatio,
    image.naturalHeight / devicePixelRatio,
  ]
  const viewer = queryElement('#viewer')
  if (
    (height === viewer.clientHeight && width > viewer.clientWidth) ||
    (width === viewer.clientWidth && height > viewer.clientHeight) ||
    (height !== viewer.clientHeight && width !== viewer.clientWidth)
  ) {
    resetQueue()
    resetRendering()
    displayPage(currentNumber)
  }
}

const openViewer = (source, slug, copyright = false) => {
  loadDocument(source, slug, copyright)
  toggleViewer(true)
  updateTitle(source, slug)
}

const queryBook = (source, slug) =>
  document.querySelector(`.book[data-source="${source}"][data-slug="${slug}"]`)

const queryElement = (selector) =>
  elements[selector] || (elements[selector] = document.querySelector(selector))

const redirectHome = () => {
  if (location.hash.replace(/^#/, '')) {
    history.pushState(null, null, location.href.replace(/#.*$/, ''))
    document.title = title
  }
}

const renderPage = (number) => {
  if (urls[number]) {
    updatePage(urls[number])
  } else if (rendering) {
    const index = numberQueue.indexOf(number)
    index === -1 ||
      (numberQueue = [
        ...numberQueue.slice(index),
        ...numberQueue.slice(0, index).reverse(),
      ])
  } else {
    rendering = true
    const previousURLs = urls
    pdf &&
      pdf.getPage(number).then(
        (page) => {
          const canvas = document.createElement('canvas')
          const viewport = calculateViewport(page)
          canvas.height = Math.round(viewport.height)
          canvas.width = Math.round(viewport.width)
          renderTask = page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
          })
          renderTask.promise.then(
            () =>
              canvas.toBlob((blob) => {
                if (urls === previousURLs) {
                  urls[number] = URL.createObjectURL(blob)
                  number === currentNumber && updatePage(urls[number])
                }
                rendering = false
                const index = numberQueue.indexOf(number)
                index === -1 || numberQueue.splice(index, 1)
                numberQueue.length && renderPage(numberQueue.shift())
              }, 'image/jpeg'),
            () => {},
          )
        },
        () => {},
      )
  }
}

const replacePage = (image) => {
  hidePages()
  const pages = queryElement('#viewer-pages')
  pages.insertAdjacentElement('afterbegin', image)
  if (pages.childElementCount === 1) {
    image.classList.add('fading')
    setTimeout(() => image.classList.remove('fading'))
  }
}

const resetQueue = () =>
  pdf &&
  (numberQueue = [
    ...Array.from(Array(pdf.numPages - currentNumber + 1).keys()).map(
      (number) => number + currentNumber,
    ),
    ...Array.from(Array(currentNumber - 1).keys())
      .map((number) => number + 1)
      .reverse(),
  ])

const resetRendering = () => {
  renderTask && renderTask.cancel()
  rendering = false
  urls && urls.forEach((url) => URL.revokeObjectURL(url))
  urls = []
}

const sourceName = () => location.hash.replace(/^#/, '').split('/')[0]

const title = (typeof document === 'undefined' ? {} : document).title

const toggleError = (visible, text = '') => {
  const error = queryElement('#viewer-error')
  error.hidden = !visible
  error.textContent = text
}

const toggleGlobalListners = (adding) =>
  [
    ['keydown', onKeyDown],
    [
      'resize',
      onResizeDebounced || (onResizeDebounced = debounce(onResize, 150)),
    ],
  ].map((args) => (adding ? addEventListener : removeEventListener)(...args))

const toggleLoading = (visible, title = '') => {
  queryElement('#viewer-loading').hidden = !visible
  visible || updateProgress()
  if (title || !visible) {
    const heading = queryElement('#viewer-heading')
    heading.hidden = !title
    heading.textContent = title
  }
}

const toggleNavigation = (visible) =>
  ['#viewer-edges', '#viewer-navigation'].forEach((selector) => {
    const element = queryElement(selector)
    element.hidden === !visible || (element.hidden = !visible)
  })

const toggleViewer = (visible) => {
  document.documentElement.classList.toggle('viewing', visible)
  hidePages()
  queryElement('#viewer').hidden = !visible
  toggleGlobalListners(visible)
  toggleNavigation(!visible)
}

const throttle = (func, delay) => {
  let previousTime = 0
  return (...args) => {
    const time = new Date().getTime()
    if (time - previousTime > delay) {
      previousTime = time
      return func(...args)
    }
  }
}

const unloadDocument = () => {
  loadingTask && loadingTask.destroy()
  pdf = undefined
  resetRendering()
}

const updateNavigation = (number) => {
  ;['#viewer-action-next'].forEach((selector) =>
    queryElement(selector).classList.toggle(
      'disabled',
      pdf && number === pdf.numPages,
    ),
  )
  ;['#viewer-action-previous', '#viewer-edge-previous'].forEach((selector) =>
    queryElement(selector).classList.toggle('disabled', number === 1),
  )
  queryElement('#viewer-number').textContent = number
  queryElement('#viewer-total').textContent = pdf ? pdf.numPages : ''
  toggleNavigation(true)
}

const updatePage = (url) =>
  createImage(url, (image) => {
    replacePage(image)
    toggleLoading(false)
  })

const updatePageView = (page) => {
  if (!page._viewUpdated) {
    const name = sourceName()
    if (name === 'lets-read') {
      offsetView(page.view, 50, 50, 50, 50)
    } else if (name === 'mustard-seed-books') {
      offsetView(page.view, 10, 10, 10, 10)
    } else if (
      ['pratham-books', 'room-to-read', 'storyweaver'].includes(name)
    ) {
      const { height, width } = page.getViewport(1)
      height < width
        ? offsetView(page.view, 9, 10, 13, 34)
        : offsetView(page.view, 9, 9, 19, 34)
    } else if (name === 'storybooks-canada') {
      page.pageNumber === 1
        ? offsetView(page.view, 35, 60, 194, 17)
        : pdf && page.pageNumber === pdf.numPages
        ? offsetView(page.view, 45, 30, 120, 30)
        : offsetView(page.view, 45, 45, 240, 45)
    }
    page._viewUpdated = true
  }
}

const updateProgress = (loaded = undefined, total = undefined) =>
  (queryElement('#viewer-progress').firstElementChild.textContent =
    loaded === undefined && total === undefined
      ? ''
      : `${Math.min(Math.round((loaded / total) * 100), 100)}%`)

const updateTitle = (source, slug) => {
  const title = generateBookTitle(source, slug)
  title && (document.title = title)
}

export default () => {
  listenHashChange()
  listenViewerClick()
  listenViewerDoubleClick()
  listenViewerDragEvents()
}
