'use strict';
const canvas = document.querySelector('#viewer > canvas');
const pdfJS = window['pdfjs-dist/build/pdf'];
const viewer = document.getElementById('viewer');

const calculateViewport = page => {
  const { height, width } = page.getViewport(1);
  const fitHeight = height / width > canvas.height / canvas.width;
  const viewport = page.getViewport(
    fitHeight ? canvas.height / height : canvas.width / width
  );
  if (fitHeight) {
    viewport.transform[4] += (canvas.width - viewport.width) / 2;
  } else {
    viewport.transform[5] += (canvas.height - viewport.height) / 2;
  }
  return viewport;
};

const hideViewer = () => (viewer.hidden = true);

const listenBookClick = () =>
  document.querySelector('.books').addEventListener('click', event => {
    const book = event.target.closest('.book');
    if (book) {
      event.preventDefault();
      location = `#${book.pathname.replace(/^\/(.+)\..+$/, '$1')}`;
    }
  });

const listenHashChange = () => addEventListener('hashchange', onHashChange);

const listenResize = () => addEventListener('resize', onResize);

const loadDocument = url => {
  pdfJS.GlobalWorkerOptions.workerSrc = 'scripts/pdf.worker.min.js';
  pdfJS.getDocument(url).promise.then(pdfDocument =>
    pdfDocument.getPage(1).then(page =>
      page.render({
        background: 'black',
        canvasContext: canvas.getContext('2d'),
        viewport: calculateViewport(page),
      })
    )
  );
};

const main = () => {
  listenBookClick();
  listenHashChange();
  listenResize();
  onHashChange();
  onResize();
};

const onHashChange = (event = { newURL: location.href }) => {
  const hash = event.newURL.replace(/^.+?(#|$)/, '');
  hash ? showViewer(`https://data.booksie.org/${hash}.pdf`) : hideViewer();
};

const onResize = () => {
  canvas.height = innerHeight;
  canvas.width = innerWidth;
};

const showViewer = url => {
  loadDocument(url);
  viewer.hidden = false;
};

location.domain || main();
