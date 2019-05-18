const elements = {};
const title = (typeof document === 'undefined' ? {} : document).title;
let clientX;
let currentNumber;
let loadingTask;
let onResizeDebounced;
let pageDelay;
let pdf;
let renderTask;
let urls;

const calculateViewport = page => {
  updatePageView(page);
  const { height, width } = page.getViewport(1);
  const viewer = queryElement('#viewer');
  return page.getViewport(
    height / width > viewer.clientHeight / viewer.clientWidth
      ? viewer.clientHeight / height
      : viewer.clientWidth / width
  );
};

const cleanupURLs = () => {
  urls && urls.forEach(url => URL.revokeObjectURL(url));
  urls = [];
};

const closeViewer = () => {
  redirectHome();
  setTimeout(() => unloadDocument());
  toggleViewer(false);
};

const createImage = (url, onLoad) => {
  const image = new Image();
  const viewer = queryElement('#viewer');
  image.addEventListener('load', () => {
    image.height === viewer.clientHeight &&
      (image.style.left = `${(viewer.clientWidth - image.width) / 2}px`);
    image.width === viewer.clientWidth &&
      (image.style.top = `${(viewer.clientHeight - image.height) / 2}px`);
    onLoad(image);
  });
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
  pdf && currentNumber === pdf.numPages ? closeViewer() : displayNextPage();

const displayPage = number => {
  if (numberValid(number)) {
    updateNumber(number);
    if (!urls[number]) {
      hidePages();
      updateMessage('Loading...');
    }
    renderPage(number);
  }
};

const displayPreviousPage = () => displayPage(currentNumber - 1);

const eventClientX = event =>
  (event.changedTouches ? event.changedTouches[0] : event).clientX;

const hidePages = () =>
  [...queryElement('#viewer-pages').children].forEach(image => {
    image.classList.add('fading');
    setTimeout(
      () => image.parentElement && image.parentElement.removeChild(image),
      pageDelay ||
        (pageDelay = parseFloat(
          getComputedStyle(image).getPropertyValue('--delay')
        ))
    );
  });

const listenGlobalEvents = (listen = true) =>
  [
    ['keydown', onKeyDown],
    [
      'resize',
      onResizeDebounced || (onResizeDebounced = debounce(onResize, 150)),
    ],
  ].map(args => (listen ? addEventListener : removeEventListener)(...args));

const listenHashChange = () => {
  addEventListener('hashchange', onHashChange);
  onHashChange();
};

const listenViewerClick = () =>
  queryElement('#viewer').addEventListener('click', event =>
    event.target === queryElement('#viewer-close')
      ? closeViewer()
      : [
          queryElement('#viewer-next'),
          queryElement('#viewer-next-edge'),
        ].includes(event.target)
      ? displayNextPage()
      : [
          queryElement('#viewer-previous'),
          queryElement('#viewer-previous-edge'),
        ].includes(event.target)
      ? displayPreviousPage()
      : undefined
  );

const listenViewerDragEvents = () => {
  const viewer = queryElement('#viewer');
  viewer.addEventListener('mousedown', onDragStart);
  viewer.addEventListener('mouseup', onDragStop);
  viewer.addEventListener('touchend', onDragStop);
  viewer.addEventListener('touchstart', onDragStart);
};

const loadDocument = url => {
  updateMessage('Loading...');
  loadPDFJS(() => {
    unloadDocument();
    window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc =
      'pdfjs/pdf.worker.min.js';
    (loadingTask = window['pdfjs-dist/build/pdf'].getDocument(
      url
    )).promise.then(
      loadedPDF => {
        pdf = loadedPDF;
        displayPage(1);
      },
      error =>
        updateMessage(`Loading error: ${error.message.replace(/\.$/, '')}.`)
    );
  });
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

const onPageRender = (number, url) =>
  number === currentNumber &&
  createImage(url, image => {
    replacePage(image);
    updateMessage('');
  });

const onResize = () => {
  cleanupURLs();
  renderTask && renderTask.cancel();
  displayPage(currentNumber);
};

const openViewer = url => {
  loadDocument(url);
  toggleViewer(true);
  updateTitle(url);
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
  const previousURLs = urls;
  const renderNeeded = () => urls === previousURLs;
  const rendering = (pageNumber = number) =>
    renderTask && renderTask._internalRenderTask.pageNumber === pageNumber;
  urls[number]
    ? onPageRender(number, urls[number])
    : renderNeeded() &&
      !rendering() &&
      pdf &&
      pdf.getPage(number).then(
        page => {
          if (renderNeeded() && !rendering()) {
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
                  onPageRender(
                    number,
                    (urls[number] = URL.createObjectURL(blob))
                  );
                  const nextNumber = number + 1;
                  urls[nextNumber] ||
                    rendering(nextNumber) ||
                    (numberValid(nextNumber) && renderPage(nextNumber));
                }),
              () => {}
            );
          }
        },
        () => {}
      );
};

const replacePage = newImage => {
  hidePages();
  const pages = queryElement('#viewer-pages');
  pages.insertAdjacentElement('afterbegin', newImage);
  if (pages.childElementCount === 1) {
    newImage.classList.add('fading');
    setTimeout(() => newImage.classList.remove('fading'));
  }
};

const showNavigation = (shown = true) =>
  ['#viewer-edges', '#viewer-navigation'].forEach(selector => {
    const element = queryElement(selector);
    element.hidden === !shown || (element.hidden = !shown);
  });

const sourceName = () => location.hash.replace(/^#/, '').split('/')[0];

const toggleViewer = shown => {
  document.documentElement.classList.toggle('viewing', shown);
  hidePages();
  listenGlobalEvents(shown);
  queryElement('#viewer').hidden = !shown;
  showNavigation(!shown);
};

const unloadDocument = () => {
  cleanupURLs();
  loadingTask && loadingTask.destroy();
  pdf = undefined;
};

const updateBookHrefs = () =>
  [...document.querySelectorAll('.book')].forEach(
    book => (book.href = `#book/${book.pathname.replace(/^\/(.+)\..+$/, '$1')}`)
  );

const updateMessage = text => {
  const message = queryElement('#viewer-message');
  message.textContent === text || (message.textContent = text);
};

const updateNumber = number => {
  currentNumber = number;
  ['#viewer-next', '#viewer-next-edge'].forEach(selector =>
    queryElement(selector).classList.toggle(
      'disabled',
      pdf && number === pdf.numPages
    )
  );
  ['#viewer-previous', '#viewer-previous-edge'].forEach(selector =>
    queryElement(selector).classList.toggle('disabled', number === 1)
  );
  queryElement('#viewer-number').textContent = number;
  queryElement('#viewer-total').textContent = pdf && pdf.numPages;
  showNavigation();
};

const updatePageView = page => {
  if (!page._viewUpdated) {
    const name = sourceName();
    if (['pratham-books', 'room-to-read', 'storyweaver'].includes(name)) {
      offsetView(page.view, 9, 10, 13, 35);
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
