let clientX;
let currentNumber;
let loadingTask;
let numberQueue;
let onResizeDebounced;
let pdf;
let renderTask;
let rendering;
let transitionEndName;
let urls;

const calculateViewport = page => {
  updatePageView(page);
  const { height, width } = page.getViewport(1);
  const viewer = queryElement('#viewer');
  return page.getViewport(
    (height / width > viewer.clientHeight / viewer.clientWidth
      ? viewer.clientHeight / height
      : viewer.clientWidth / width) * devicePixelRatio
  );
};

const closeViewer = () => {
  redirectHome();
  setTimeout(() => unloadDocument());
  toggleViewer(false);
};

const createImage = (url, onLoad) => {
  const image = new Image();
  image.addEventListener('load', () => onLoad(image));
  image.addEventListener('dragstart', event => event.preventDefault());
  image.draggable = false;
  image.src = url;
};

const debounce = (func, delay, immediate = false) => {
  let timeout;
  return function() {
    const debounced = immediate && !timeout;
    const call = () => func.apply(this, arguments);
    clearTimeout(timeout);
    timeout = setTimeout(call, delay);
    debounced && call();
  };
};

const displayNextPage = () => displayPage(currentNumber + 1);

const displayNextPageOrClose = () =>
  currentNumber && pdf && currentNumber === pdf.numPages
    ? closeViewer()
    : displayNextPage();

const displayPage = number => {
  if (numberValid(number)) {
    currentNumber = number;
    updateNavigation(number);
    if (!urls[number]) {
      hidePages();
      toggleLoading(true);
    }
    renderPage(number);
  }
};

const displayPreviousPage = () => displayPage(currentNumber - 1);

const documentURL = (source, slug) =>
  `https://data.booksie.org/${source}/${slug}.pdf`;

const elements = {};

const eventClientX = event =>
  (event.changedTouches ? event.changedTouches[0] : event).clientX;

const generateBookTitle = (source, slug) => {
  const book = document.querySelector(
    `.book[href="${documentURL(
      source,
      slug
    )}"], .book[href="#${source}/${slug}"]`
  );
  return (
    book &&
    `${book.querySelector('strong').textContent} (by ${
      book.querySelector('small').textContent
    })`
  );
};

const hidePages = () => {
  const remove = element =>
    element.parentElement && element.parentElement.removeChild(element);
  [...queryElement('#viewer-pages').children].forEach(image => {
    image.classList.add('fading');
    listenTransitionEnd(image, () => remove(image));
  });
};

const listenHashChange = () => {
  addEventListener('hashchange', onHashChange);
  onHashChange();
};

const listenTransitionEnd = (element, onTransitionEnd) => {
  transitionEndName ||
    (transitionEndName = (Object.entries({
      transition: 'transitionend',
      MozTransition: 'transitionend',
      WebkitTransition: 'webkitTransitionEnd',
      OTransition: 'otransitionend',
    }).find(([property, type]) => property in document.body.style) || [])[1]);
  transitionEndName
    ? element.addEventListener(transitionEndName, onTransitionEnd)
    : onTransitionEnd();
};

const listenViewerClick = () =>
  queryElement('#viewer').addEventListener('click', event =>
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
      : undefined
  );

const listenViewerDoubleClick = () => {
  const viewer = queryElement('#viewer');
  viewer.addEventListener(
    'dblclick',
    event =>
      event.target.classList.contains('viewer-edge') ||
      (document.fullscreenElement === viewer
        ? document.exitFullscreen()
        : viewer.requestFullscreen())
  );
};

const listenViewerDragEvents = () => {
  const viewer = queryElement('#viewer');
  viewer.addEventListener('mousedown', onDragStart);
  viewer.addEventListener('mouseup', onDragStop);
  viewer.addEventListener('touchend', onDragStop);
  viewer.addEventListener('touchstart', onDragStart);
};

const loadDocument = (source, slug) => {
  toggleLoading(true, generateBookTitle(source, slug));
  updateError('');
  setTimeout(() =>
    loadPDFJS(() => {
      unloadDocument();
      window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
        'pdfjs/pdf.worker.min.js';
      (loadingTask = window['pdfjs-dist/build/pdf'].getDocument(
        documentURL(source, slug)
      )).promise.then(
        loadedPDF => {
          pdf = loadedPDF;
          displayPage(1);
          resetQueue();
        },
        error => {
          toggleLoading(false);
          updateError(`Loading error: ${error.message.replace(/\.$/, '')}.`);
        }
      );
    })
  );
};

const loadPDFJS = onLoad => {
  if (window['pdfjs-dist/build/pdf']) {
    onLoad();
  } else {
    var script = document.createElement('script');
    script.addEventListener('load', onLoad);
    script.src = 'pdfjs/pdf.min.js';
    document.body.appendChild(script);
  }
};

const numberValid = number => number >= 1 && pdf && number <= pdf.numPages;

const offsetView = (view, top, right, bottom, left) => {
  view[0] += left;
  view[1] += bottom;
  view[2] -= right;
  view[3] -= top;
};

const onDragStart = event => {
  event.preventDefault();
  clientX = eventClientX(event);
};

const onDragStop = event => {
  const difference = eventClientX(event) - clientX;
  Math.abs(difference) >= 100 &&
    (difference > 0 ? displayPreviousPage() : displayNextPageOrClose());
};

const onHashChange = (event = { newURL: location.href }) => {
  const hash = event.newURL.replace(/^.+?(#|$)/, '');
  hash.includes('/') && (hash ? openViewer(...hash.split('/')) : closeViewer());
};

const onKeyDown = event =>
  event.key === 'ArrowLeft' || (event.key === ' ' && event.shiftKey)
    ? displayPreviousPage()
    : event.key === 'ArrowRight' || (event.key === ' ' && !event.shiftKey)
    ? displayNextPageOrClose()
    : event.key === 'Escape'
    ? closeViewer()
    : undefined;

const onResize = () => {
  const image = queryElement('#viewer-pages').firstElementChild;
  const viewer = queryElement('#viewer');
  if (
    !image ||
    (image.height === viewer.clientHeight &&
      image.width > viewer.clientWidth) ||
    (image.width === viewer.clientWidth &&
      image.height > viewer.clientHeight) ||
    (image.height < viewer.clientHeight && image.width < viewer.clientWidth)
  ) {
    resetQueue();
    resetRendering();
    displayPage(currentNumber);
  }
};

const openViewer = (source, slug) => {
  loadDocument(source, slug);
  toggleViewer(true);
  updateTitle(source, slug);
};

const queryElement = selector =>
  elements[selector] || (elements[selector] = document.querySelector(selector));

const redirectHome = () => {
  if (location.hash.replace(/^#/, '')) {
    history.pushState(null, null, location.href.replace(/#.*$/, ''));
    document.title = title;
  }
};

const renderPage = number => {
  if (urls[number]) {
    updatePage(urls[number]);
  } else if (rendering) {
    const index = numberQueue.indexOf(number);
    index === -1 ||
      (numberQueue = [
        ...numberQueue.slice(index),
        ...numberQueue.slice(0, index).reverse(),
      ]);
  } else {
    const previousURLs = urls;
    rendering = true;
    pdf &&
      pdf.getPage(number).then(
        page => {
          const viewport = calculateViewport(page);
          const canvas = document.createElement('canvas');
          canvas.height = Math.round(viewport.height);
          canvas.width = Math.round(viewport.width);
          renderTask = page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
          });
          renderTask.promise.then(
            () =>
              canvas.toBlob(blob => {
                if (urls === previousURLs) {
                  urls[number] = URL.createObjectURL(blob);
                  number === currentNumber && updatePage(urls[number]);
                }
                rendering = false;
                const index = numberQueue.indexOf(number);
                index === -1 || numberQueue.splice(index, 1);
                numberQueue.length && renderPage(numberQueue.shift());
              }, 'image/jpeg'),
            () => {}
          );
        },
        () => {}
      );
  }
};

const replacePage = image => {
  hidePages();
  const pages = queryElement('#viewer-pages');
  pages.insertAdjacentElement('afterbegin', image);
  if (pages.childElementCount === 1) {
    image.classList.add('fading');
    setTimeout(() => image.classList.remove('fading'));
  }
};

const resetQueue = () =>
  pdf &&
  (numberQueue = [
    ...Array.from(Array(pdf.numPages - currentNumber + 1).keys()).map(
      number => number + currentNumber
    ),
    ...Array.from(Array(currentNumber - 1).keys())
      .map(number => number + 1)
      .reverse(),
  ]);

const resetRendering = () => {
  renderTask && renderTask.cancel();
  rendering = false;
  urls && urls.forEach(url => URL.revokeObjectURL(url));
  urls = [];
};

const sourceName = () => location.hash.replace(/^#/, '').split('/')[0];

const title = (typeof document === 'undefined' ? {} : document).title;

const toggleGlobalListners = adding =>
  [
    ['keydown', onKeyDown],
    [
      'resize',
      onResizeDebounced || (onResizeDebounced = debounce(onResize, 150)),
    ],
  ].map(args => (adding ? addEventListener : removeEventListener)(...args));

const toggleLoading = (visible, title = '') => {
  queryElement('#viewer-loading').hidden = !visible;
  (visible && !title) || (queryElement('#viewer-title').textContent = title);
};

const toggleNavigation = visible =>
  ['#viewer-edges', '#viewer-navigation'].forEach(selector => {
    const element = queryElement(selector);
    element.hidden === !visible || (element.hidden = !visible);
  });

const toggleViewer = visible => {
  document.documentElement.classList.toggle('viewing', visible);
  hidePages();
  queryElement('#viewer').hidden = !visible;
  toggleGlobalListners(visible);
  toggleNavigation(!visible);
};

const unloadDocument = () => {
  loadingTask && loadingTask.destroy();
  pdf = undefined;
  resetRendering();
};

const updateError = text => (queryElement('#viewer-error').textContent = text);

const updateNavigation = number => {
  ['#viewer-action-next', '#viewer-edge-next'].forEach(selector =>
    queryElement(selector).classList.toggle(
      'disabled',
      pdf && number === pdf.numPages
    )
  );
  ['#viewer-action-previous', '#viewer-edge-previous'].forEach(selector =>
    queryElement(selector).classList.toggle('disabled', number === 1)
  );
  queryElement('#viewer-number').textContent = number;
  queryElement('#viewer-total').textContent = pdf ? pdf.numPages : '';
  toggleNavigation(true);
};

const updatePage = url =>
  createImage(url, image => {
    replacePage(image);
    toggleLoading(false);
  });

const updatePageView = page => {
  if (!page._viewUpdated) {
    const name = sourceName();
    if (['pratham-books', 'room-to-read', 'storyweaver'].includes(name)) {
      const { height, width } = page.getViewport(1);
      height < width
        ? offsetView(page.view, 9, 10, 13, 34)
        : offsetView(page.view, 9, 9, 19, 34);
    } else if (name === 'storybooks-canada') {
      page.pageNumber === 1
        ? offsetView(page.view, 35, 60, 194, 17)
        : pdf && page.pageNumber === pdf.numPages
        ? offsetView(page.view, 45, 30, 120, 30)
        : offsetView(page.view, 45, 45, 240, 45);
    }
    page._viewUpdated = true;
  }
};

const updateTitle = (source, slug) => {
  const title = generateBookTitle(source, slug);
  title && (document.title = title);
};

export default () => {
  listenHashChange();
  listenViewerClick();
  listenViewerDoubleClick();
  listenViewerDragEvents();
};
