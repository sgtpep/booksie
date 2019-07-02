chrome.app.runtime.onLaunched.addListener(() =>
  chrome.app.window.create(
    'index.html'
    /*, createdWindow =>
    createdWindow.contentWindow.addEventListener('DOMContentLoaded', () =>
      createdWindow.contentWindow.document
        .querySelector('webview')
        .addEventListener('newwindow', event => {
          event.preventDefault();
          open(event.targetUrl);
        })
    )*/
  )
);
