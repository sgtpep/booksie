'use strict';
(() => {
  const viewer = document.getElementById('viewer');
  let currentNumber;
  let currentPage;
  let loadingTask;
  let pdf;
  let renderTask;

  const calculateViewport = page => {
    const { height, width } = page.getViewport(1);
    return page.getViewport(
      height / width > viewer.clientHeight / viewer.clientWidth
        ? viewer.clientHeight / height
        : viewer.clientWidth / width
    );
    //        if (fitHeight) {
    //          viewport.transform[4] += (canvas.width - viewport.width) / 2;
    //        } else {
    //          viewport.transform[5] += (canvas.height - viewport.height) / 2;
    //        }
    //    return viewport;
  };

  const createCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };

  const hideViewer = () => {
    viewer.hidden = true;
    document.body.removeAttribute('style');
    unlistenViewerEvents();
    setTimeout(() => loadingTask && loadingTask.destroy());
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
    addEventListener('resize', onResize);
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
    hash ? showViewer(`https://data.booksie.org/${hash}.pdf`) : hideViewer();
  };

  const onKeyDown = event =>
    event.key === 'ArrowLeft'
      ? loadPage(currentNumber - 1)
      : event.key === 'ArrowRight'
      ? loadPage(currentNumber + 1)
      : undefined;

  const onResize = () => currentPage && renderPage(currentPage);

  const renderPage = page => {
    renderTask && renderTask.cancel();
    const viewport = calculateViewport(page);
    const canvas = createCanvas(viewport.width, viewport.height);
    renderTask = page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    });
    renderTask.promise.then(
      () => {
        const oldCanvas = viewer.querySelector('canvas');
        oldCanvas.parentElement.insertBefore(canvas, oldCanvas);
        oldCanvas.parentElement.removeChild(oldCanvas);
      },
      () => {}
    );
  };

  const scriptPath = filename => `scripts/${filename}`;

  const showViewer = url => {
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    listenViewerEvents();
    loadPDFJS(() => loadDocument(url));
  };

  const unlistenViewerEvents = () => {
    removeEventListener('keydown', onKeyDown);
    removeEventListener('resize', onResize);
  };

  location.protocol === 'file:' && main();
})();
