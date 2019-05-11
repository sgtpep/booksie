'use strict';
(() => {
  const viewer = document.getElementById('viewer');
  let canvas = document.querySelector('#viewer > canvas');
  let currentNumber;
  let currentPage;
  let loadingTask;
  let onResizeDebounced;
  let pdf;
  let renderTask;

  const calculateViewport = page => {
    const { height, width } = page.getViewport(1);
    return page.getViewport(
      height / width > viewer.clientHeight / viewer.clientWidth
        ? viewer.clientHeight / height
        : viewer.clientWidth / width
    );
  };

  const clearCanvas = () =>
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  const closeViewer = () => {
    viewer.hidden = true;
    document.body.removeAttribute('style');
    unlistenViewerEvents();
    setTimeout(() => loadingTask && loadingTask.destroy());
  };

  const createCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;
    height === viewer.clientHeight &&
      (canvas.style.left = `${(viewer.clientWidth - canvas.width) / 2}px`);
    width === viewer.clientWidth &&
      (canvas.style.top = `${(viewer.clientHeight - canvas.height) / 2}px`);
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

  const listenViewerEvents = () => {
    addEventListener('keydown', onKeyDown);
    onResizeDebounced = debounce(onResize, 300);
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

  const loadPage = number => {
    if (pdf && number >= 1 && number <= pdf.numPages) {
      currentNumber = number;
      pdf.getPage(number).then(page => {
        if (page.pageIndex === number - 1) {
          currentPage = page;
          renderPage(page);
        }
      });
    }
  };

  const main = () => {
    listenBooksClick();
    listenHashChange();
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
      ? (location = '#')
      : undefined;

  const onResize = () => currentPage && renderPage(currentPage);

  const openViewer = url => {
    clearCanvas();
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    listenViewerEvents();
    loadPDFJS(() => loadDocument(url));
  };

  const renderPage = page => {
    renderTask && renderTask.cancel();
    const viewport = calculateViewport(page);
    const newCanvas = createCanvas(viewport.width, viewport.height);
    renderTask = page.render({
      canvasContext: newCanvas.getContext('2d'),
      viewport,
    });
    renderTask.promise.then(
      () => {
        canvas.parentElement.insertBefore(newCanvas, canvas);
        canvas.parentElement.removeChild(canvas);
        canvas = newCanvas;
      },
      () => {}
    );
  };

  const scriptPath = filename => `scripts/${filename}`;

  const unlistenViewerEvents = () => {
    removeEventListener('keydown', onKeyDown);
    removeEventListener('resize', onResizeDebounced);
  };

  location.protocol === 'file:' && main();
})();
