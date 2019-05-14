let currentNumber;
let currentPage;
let loadingTask;
let onResizeDebounced;
let pdf;
let renderTask;

const elements = {
  canvas: document.querySelector('#viewer > canvas'),
  message: document.getElementById('viewer-message'),
  navigation: document.getElementById('viewer-navigation'),
  next: document.getElementById('viewer-next'),
  number: document.getElementById('viewer-number'),
  previous: document.getElementById('viewer-previous'),
  total: document.getElementById('viewer-total'),
  viewer: document.getElementById('viewer'),
};

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
  elements.navigation.hidden = true;
  elements.viewer.hidden = true;
  history.pushState(null, null, location.href.replace(/#.*$/, ''));
  setTimeout(() => loadingTask && loadingTask.destroy());
  unlistenViewerEvents();
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

const listenBooksClick = () =>
  document.querySelector('.books').addEventListener('click', event => {
    const book = event.target.closest('.book');
    if (book) {
      event.preventDefault();
      location = `#${book.pathname.replace(/^\/(.+)\..+$/, '$1')}`;
    }
  });

const listenViewerClick = () =>
  elements.viewer.addEventListener('click', event =>
    event.target.id === 'viewer-close'
      ? closeViewer()
      : event.target.id === 'viewer-next'
      ? showPage(currentNumber + 1)
      : event.target.id === 'viewer-previous'
      ? showPage(currentNumber - 1)
      : undefined
  );

const listenViewerEvents = () => {
  addEventListener('keydown', onKeyDown);
  onResizeDebounced = debounce(onResize, 150);
  addEventListener('resize', onResizeDebounced);
};

const loadDocument = url => {
  window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
    'pdfjs/pdf.worker.min.js';
  loadingTask = window['pdfjs-dist/build/pdf'].getDocument(url);
  loadingTask.promise.then(
    loadedPDF => {
      pdf = loadedPDF;
      showPage(1);
    },
    error =>
      (elements.message.textContent = `Loading error: ${error.message.replace(
        /\.$/,
        ''
      )}.`)
  );
  elements.message.textContent = 'Loading...';
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

const onHashChange = (event = { newURL: location.href }) => {
  const hash = event.newURL.replace(/^.+?(#|$)/, '');
  hash ? openViewer(`https://data.booksie.org/${hash}.pdf`) : closeViewer();
};

const onKeyDown = event =>
  event.key === 'ArrowLeft'
    ? showPage(currentNumber - 1)
    : event.key === 'ArrowRight'
    ? showPage(currentNumber + 1)
    : event.key === 'Escape'
    ? closeViewer()
    : undefined;

const onResize = () => currentPage && renderPage(currentPage);

const openViewer = url => {
  document.body.style.overflow = 'hidden';
  elements.viewer.hidden = false;
  listenViewerEvents();
  loadPDFJS(() => loadDocument(url));
};

const renderPage = page => {
  renderTask && renderTask.cancel();
  const viewport = calculateViewport(page);
  const canvas = createCanvas(
    Math.round(viewport.width),
    Math.round(viewport.height)
  );
  renderTask = page.render({
    canvasContext: canvas.getContext('2d'),
    viewport,
  });
  renderTask.promise.then(
    () => {
      elements.message.textContent = '';
      replaceCanvas(canvas);
      updateNavigation();
    },
    () => {}
  );
};

const replaceCanvas = canvas => {
  elements.canvas.parentElement.insertBefore(canvas, elements.canvas);
  elements.canvas.parentElement.removeChild(elements.canvas);
  elements.canvas = canvas;
};

const showPage = number => {
  if (numberValid(number)) {
    currentNumber = number;
    pdf.getPage(number).then(page => {
      if (page.pageNumber === currentNumber) {
        currentPage = page;
        renderPage(page);
      }
    });
  }
};

const unlistenViewerEvents = () => {
  removeEventListener('keydown', onKeyDown);
  removeEventListener('resize', onResizeDebounced);
};

const updateNavigation = () => {
  elements.next.classList.toggle('disabled', currentNumber === pdf.numPages);
  elements.number.textContent = currentNumber;
  elements.previous.classList.toggle('disabled', currentNumber === 1);
  elements.total.textContent = pdf.numPages;
  currentPage.transport.pageCache.length === 1 &&
    (elements.navigation.hidden = false);
};

export default () => {
  addEventListener('hashchange', onHashChange);
  listenBooksClick();
  listenViewerClick();
  onHashChange();
};
