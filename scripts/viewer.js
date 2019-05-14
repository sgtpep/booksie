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
  clearCanvas();
  document.body.removeAttribute('style');
  elements.viewer.hidden = true;
  history.pushState(null, null, location.href.replace(/#.*$/, ''));
  listenGlobalEvents(false);
  setTimeout(() => loadingTask && loadingTask.destroy());
  showNavigation(false);
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

const displayPage = number => {
  if (numberValid(number) && !rendering) {
    currentNumber = number;
    pdf.getPage(number).then(page => {
      if (page.pageNumber === currentNumber) {
        currentPage = page;
        renderPage(page);
        preloadPage(currentNumber + 1, () => preloadPage(currentNumber + 2));
      }
    });
  }
};

const displayPreviousPage = () => displayPage(currentNumber - 1);

const eventClientX = event =>
  (event.changedTouches ? event.changedTouches[0] : event).clientX;

const listenBooksClick = () =>
  document.querySelector('.books').addEventListener('click', event => {
    const book = event.target.closest('.book');
    if (book) {
      event.preventDefault();
      location = `#${book.pathname.replace(/^\/(.+)\..+$/, '$1')}`;
    }
  });

const listenGlobalEvents = (listen = true) => {
  onResizeDebounced || (onResizeDebounced = debounce(onResize, 150));
  [['keydown', onKeyDown], ['resize', onResizeDebounced]].map(args =>
    (listen ? addEventListener : removeEventListener)(...args)
  );
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
  viewer.addEventListener('mousedown', onDragStart);
  viewer.addEventListener('mouseup', onDragStop);
  viewer.addEventListener('touchend', onDragStop);
  viewer.addEventListener('touchstart', onDragStart);
};

const loadDocument = url => {
  window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
    'pdfjs/pdf.worker.min.js';
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

const onDragStart = event => {
  event.preventDefault();
  clientX = eventClientX(event);
};

const onDragStop = event => {
  const difference = eventClientX(event) - clientX;
  Math.abs(difference) >= 100 &&
    (difference > 0 ? displayPreviousPage() : displayNextPage());
};

const onHashChange = (event = { newURL: location.href }) => {
  const hash = event.newURL.replace(/^.+?(#|$)/, '');
  hash ? openViewer(`https://data.booksie.org/${hash}.pdf`) : closeViewer();
};

const onKeyDown = event =>
  event.key === 'ArrowLeft'
    ? displayPreviousPage()
    : event.key === 'ArrowRight'
    ? displayNextPage()
    : event.key === 'Escape'
    ? closeViewer()
    : undefined;

const onResize = () => currentPage && renderPage(currentPage);

const openViewer = url => {
  document.body.style.overflow = 'hidden';
  elements.viewer.hidden = false;
  listenGlobalEvents();
  loadPDFJS(() => loadDocument(url));
};

const preloadPage = (number, onPreload = () => {}) =>
  numberValid(number) &&
  (currentPage.transport.pageCache[number - 1]
    ? onPreload()
    : pdf.getPage(number).then(page => {
        prerenderTask && prerenderTask.cancel();
        prerenderTask = page.render({
          canvasContext: document.createElement('canvas').getContext('2d'),
          viewport: page.getViewport(1),
        });
        prerenderTask.promise.then(() => onPreload(), () => {});
      }));

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

export default () => {
  addEventListener('hashchange', onHashChange);
  listenBooksClick();
  listenViewerClick();
  listenViewerDragEvents();
  onHashChange();
};
