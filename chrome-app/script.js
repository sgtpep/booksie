document.querySelector('webview').addEventListener('newwindow', event => {
  event.preventDefault();
  open(event.targetUrl);
});
