'use strict';
(() => {
  let canvas = document.querySelector('#viewer > canvas');
  let currentNumber;
  let currentPage;
  let loadingTask;
  let onResizeDebounced;
  let pdf;
  let prerenderTask;
  let renderTask;

  const elements = Object.entries({
    navigation: 'viewer-navigation',
    next: 'viewer-next',
    number: 'viewer-number',
    previous: 'viewer-previous',
    total: 'viewer-total',
    viewer: 'viewer',
  }).reduce(
    (elements, [name, id]) => ({
      ...elements,
      [name]: document.getElementById(id),
    }),
    {}
  );

  const calculateViewport = page => {
    const { height, width } = page.getViewport(1);
    return page.getViewport(
      height / width >
        elements.viewer.clientHeight / elements.viewer.clientWidth
        ? elements.viewer.clientHeight / height
        : elements.viewer.clientWidth / width
    );
  };

  const clearCanvas = () =>
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  const closeViewer = () => {
    elements.viewer.hidden = true;
    document.body.removeAttribute('style');
    unlistenViewerEvents();
    setTimeout(() => loadingTask && loadingTask.destroy());
    location.hash === '#' ||
      history.pushState(null, null, location.href.replace(/#.*$/, ''));
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
      const call = immediate && !timeout;
      const next = () => func.apply(this, arguments);
      clearTimeout(timeout);
      timeout = setTimeout(next, delay);
      call && next();
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

  const listenHashChange = () => addEventListener('hashchange', onHashChange);

  const listenViewerClick = () =>
    elements.viewer.addEventListener('click', event =>
      event.target.id === 'viewer-close'
        ? closeViewer()
        : event.target.id === 'viewer-next'
        ? loadPage(currentNumber + 1)
        : event.target.id === 'viewer-previous'
        ? loadPage(currentNumber - 1)
        : undefined
    );

  const listenViewerEvents = () => {
    addEventListener('keydown', onKeyDown);
    onResizeDebounced = debounce(onResize, 150);
    addEventListener('resize', onResizeDebounced);
  };

  const loadDocument = url => {
    window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = scriptPath(
      'pdf.worker.min.js'
    );
    loadingTask = window['pdfjs-dist/build/pdf'].getDocument(url);
    loadingTask.promise.then(loadedPDF => {
      pdf = loadedPDF;
      loadPage(1);
    });
  };

  const loadPDFJS = onLoad => {
    if (window['pdfjs-dist/build/pdf']) {
      onLoad();
    } else {
      var script = document.createElement('script');
      script.addEventListener('load', onLoad);
      script.src = scriptPath('pdf.min.js');
      document.body.appendChild(script);
    }
  };

  const loadPage = (number, preload = false) => {
    if (pdf && number >= 1 && number <= pdf.numPages) {
      preload || (currentNumber = number);
      pdf.getPage(number).then(page => {
        if (page.pageNumber === currentNumber && !preload) {
          currentPage = page;
          renderPage(page);
        } else if (page.pageNumber === currentNumber + 1 && preload) {
          renderPage(page, true);
        }
      });
    }
  };

  const main = () => {
    listenBooksClick();
    listenHashChange();
    listenViewerClick();
    onHashChange();
  };

  const onHashChange = (event = { newURL: location.href }) => {
    const hash = event.newURL.replace(/^.+?(#|$)/, '');
    hash ? openViewer(`https://data.booksie.org/${hash}.pdf`) : closeViewer();
  };

  const onKeyDown = event =>
    event.key === 'ArrowLeft'
      ? loadPage(currentNumber - 1)
      : event.key === 'ArrowRight'
      ? loadPage(currentNumber + 1)
      : event.key === 'Escape'
      ? closeViewer()
      : undefined;

  const onResize = () => currentPage && renderPage(currentPage);

  const openViewer = url => {
    clearCanvas();
    elements.viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    listenViewerEvents();
    loadPDFJS(() => loadDocument(url));
  };

  const renderPage = (page, preload = false) => {
    ((preload ? prerenderTask : renderTask) || { cancel: () => {} }).cancel();
    const viewport = calculateViewport(page);
    const newCanvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    );
    const task = page.render({
      canvasContext: newCanvas.getContext('2d'),
      viewport,
    });
    task.promise.then(
      () => {
        if (!preload) {
          canvas.parentElement.insertBefore(newCanvas, canvas);
          canvas.parentElement.removeChild(canvas);
          canvas = newCanvas;
          page.transport.pageCache[page.pageNumber] ||
            loadPage(page.pageNumber + 1, true);
          updateNavigation();
        }
      },
      () => {}
    );
    preload ? (prerenderTask = task) : (renderTask = task);
  };

  const scriptPath = filename => `scripts/${filename}`;

  const unlistenViewerEvents = () => {
    removeEventListener('keydown', onKeyDown);
    removeEventListener('resize', onResizeDebounced);
  };

  const updateNavigation = () => {
    elements.number.textContent = currentNumber;
    elements.next.classList.toggle('disabled', currentNumber === pdf.numPages);
    elements.previous.classList.toggle('disabled', currentNumber === 1);
    if (elements.navigation.hidden) {
      elements.total.textContent = pdf.numPages;
      elements.navigation.hidden = false;
    }
  };

  location.protocol === 'file:' && main();
})();