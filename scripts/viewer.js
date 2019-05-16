const title = document.title;
let clientX;
let currentNumber;
let currentPage;
let hidingTimeout;
let loadingTask;
let onResizeDebounced;
let pdf;
let prerenderTask;
let renderTask;
let rendering;

const elements = {
  canvas: document.querySelector('#viewer > canvas'),
  close: document.getElementById('viewer-close'),
  edges: document.getElementById('viewer-edges'),
  message: document.getElementById('viewer-message'),
  navigation: document.getElementById('viewer-navigation'),
  next: document.getElementById('viewer-next'),
  nextEdge: document.getElementById('viewer-next-edge'),
  number: document.getElementById('viewer-number'),
  previous: document.getElementById('viewer-previous'),
  previousEdge: document.getElementById('viewer-previous-edge'),
  total: document.getElementById('viewer-total'),
  viewer: document.getElementById('viewer'),
};

const hidingDelay = parseFloat(
  getComputedStyle(elements.canvas).getPropertyValue('--delay')
);

const calculateViewport = page => {
  updatePageView(page);
  const { height, width } = page.getViewport(1);
  return page.getViewport(
    height / width > elements.viewer.clientHeight / elements.viewer.clientWidth
      ? elements.viewer.clientHeight / height
      : elements.viewer.clientWidth / width
  );
};

const clearCanvas = () =>
  elements.canvas
    .getContext('2d')
    .clearRect(0, 0, elements.canvas.width, elements.canvas.height);

const closeViewer = () => {
  document.documentElement.classList.remove('viewing');
  elements.viewer.hidden = true;
  listenGlobalEvents(false);
  redirectHome();
  setTimeout(() => loadingTask && loadingTask.destroy());
};

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;
  height === elements.viewer.clientHeight &&
    (canvas.style.left = `${(elements.viewer.clientWidth - canvas.width) /
      2}px`);
  width === elements.viewer.clientWidth &&
    (canvas.style.top = `${(elements.viewer.clientHeight - canvas.height) /
      2}px`);
  return canvas;
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
  currentNumber === pdf.numPages ? closeViewer() : displayNextPage();

const displayPage = number => {
  if (numberValid(number) && !rendering) {
    currentNumber = number;
    pdf.getPage(number).then(page => {
      if (currentNumber === number) {
        currentPage = page;
        renderPage(page);
        preloadPage(number + 1);
      }
    });
  }
};

const displayPreviousPage = () => displayPage(currentNumber - 1);

const eventClientX = event =>
  (event.changedTouches ? event.changedTouches[0] : event).clientX;

const updateBookHrefs = () =>
  [...document.querySelectorAll('.book')].forEach(
    book => (book.href = `#book/${book.pathname.replace(/^\/(.+)\..+$/, '$1')}`)
  );

const listenGlobalEvents = (listen = true) => {
  onResizeDebounced || (onResizeDebounced = debounce(onResize, 150));
  [['keydown', onKeyDown], ['resize', onResizeDebounced]].map(args =>
    (listen ? addEventListener : removeEventListener)(...args)
  );
};

const listenHashChange = () => {
  addEventListener('hashchange', onHashChange);
  onHashChange();
};

const listenViewerClick = () =>
  elements.viewer.addEventListener('click', event =>
    event.target === elements.close
      ? closeViewer()
      : [elements.next, elements.nextEdge].includes(event.target)
      ? displayNextPage()
      : [elements.previous, elements.previousEdge].includes(event.target)
      ? displayPreviousPage()
      : undefined
  );

const listenViewerDragEvents = () => {
  elements.viewer.addEventListener('mousedown', onDragStart);
  elements.viewer.addEventListener('mouseup', onDragStop);
  elements.viewer.addEventListener('touchend', onDragStop);
  elements.viewer.addEventListener('touchstart', onDragStart);
};

const loadDocument = url => {
  window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
    'pdfjs/pdf.worker.min.js';
  loadingTask && loadingTask.destroy();
  loadingTask = window['pdfjs-dist/build/pdf'].getDocument(url);
  loadingTask.promise.then(
    loadedPDF => {
      pdf = loadedPDF;
      displayPage(1);
    },
    error => showMessage(`Loading error: ${error.message.replace(/\.$/, '')}.`)
  );
  showMessage('Loading...');
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

const numberValid = number => pdf && number >= 1 && number <= pdf.numPages;

const offsetView = (view, top, right, bottom, left) => {
  view[0] += left;
  view[1] += bottom;
  view[2] -= right;
  view[3] -= top;
};

const onDragStart = event => (clientX = eventClientX(event));

const onDragStop = event => {
  const difference = eventClientX(event) - clientX;
  Math.abs(difference) >= 100 &&
    (difference > 0 ? displayPreviousPage() : displayNextPageOrClose());
};

const onHashChange = (event = { newURL: location.href }) => {
  const hash = event.newURL.replace(/^.+?(#|$)/, '');
  hash.startsWith('book/') &&
    (hash
      ? openViewer(
          `https://data.booksie.org/${hash.replace(/^book\//, '')}.pdf`
        )
      : closeViewer());
};

const onKeyDown = event =>
  event.key === 'ArrowLeft'
    ? displayPreviousPage()
    : event.key === 'ArrowRight'
    ? displayNextPageOrClose()
    : event.key === 'Escape'
    ? closeViewer()
    : undefined;

const onResize = () => currentPage && renderPage(currentPage);

const openViewer = url => {
  clearCanvas();
  document.documentElement.classList.add('viewing');
  elements.viewer.hidden = false;
  listenGlobalEvents();
  loadPDFJS(() => loadDocument(url));
  showNavigation(false);
  updateTitle(url);
};

const preloadPage = number =>
  numberValid(number) &&
  !currentPage.transport.pageCache[number - 1] &&
  pdf.getPage(number).then(page => {
    prerenderTask && prerenderTask.cancel();
    prerenderTask = page.render({
      canvasContext: document.createElement('canvas').getContext('2d'),
      viewport: page.getViewport(1),
    });
    prerenderTask.promise.catch(() => {});
  });

const redirectHome = () => {
  if (location.hash.replace(/^#/, '')) {
    history.pushState(null, null, location.href.replace(/#.*$/, ''));
    document.title = title;
  }
};

const renderPage = page => {
  renderTask && renderTask.cancel();
  const viewport = calculateViewport(page);
  const canvas = createCanvas(
    Math.round(viewport.width),
    Math.round(viewport.height)
  );
  rendering = true;
  renderTask = page.render({
    canvasContext: canvas.getContext('2d'),
    viewport,
  });
  renderTask.promise.then(
    () => {
      replaceCanvas(canvas);
      showMessage('');
      showNavigation();
      updateNavigation();
      rendering = false;
    },
    () => (rendering = false)
  );
};

const replaceCanvas = canvas => {
  elements.canvas.parentElement.insertBefore(canvas, elements.canvas);
  elements.canvas.classList.add('hiding');
  clearTimeout(hidingTimeout);
  hidingTimeout = setTimeout(
    canvas => canvas.parentElement.removeChild(canvas),
    hidingDelay,
    elements.canvas
  );
  elements.canvas = canvas;
};

const showMessage = message =>
  elements.message.textContent === message ||
  (elements.message.textContent = message);

const showNavigation = (shown = true) =>
  [elements.edges, elements.navigation].forEach(
    element => element.hidden === !shown || (element.hidden = !shown)
  );

const sourceName = () => location.hash.replace(/^#/, '').split('/')[0];

const updateNavigation = () => {
  [elements.next, elements.nextEdge].forEach(element =>
    element.classList.toggle('disabled', currentNumber === pdf.numPages)
  );
  [elements.previous, elements.previousEdge].forEach(element =>
    element.classList.toggle('disabled', currentNumber === 1)
  );
  elements.number.textContent = currentNumber;
  elements.total.textContent = pdf.numPages;
};

const updatePageView = page => {
  if (!page._viewUpdated) {
    const name = sourceName();
    if (['pratham-books', 'room-to-read', 'storyweaver'].includes(name)) {
      offsetView(page.view, 9, 10, 13, 35);
    } else if (name === 'storybooks-canada') {
      page.pageNumber === 1
        ? offsetView(page.view, 35, 60, 194, 17)
        : page.pageNumber === pdf.numPages
        ? offsetView(page.view, 45, 30, 120, 30)
        : offsetView(page.view, 45, 45, 240, 45);
    }
    page._viewUpdated = true;
  }
};

const updateTitle = url => {
  const book = document.querySelector(
    `.book[href="${url}"], .book[href="#book/${new URL(url).pathname.replace(
      /^\/(.+)\.\w+$/,
      '$1'
    )}"]`
  );
  book &&
    (document.title = `${book.querySelector('strong').textContent} (by ${
      book.querySelector('small').textContent
    })`);
};

export default () => {
  listenHashChange();
  listenViewerClick();
  listenViewerDragEvents();
  updateBookHrefs();
};
