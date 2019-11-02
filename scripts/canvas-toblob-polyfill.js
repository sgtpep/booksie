if (!HTMLCanvasElement.prototype.toBlob) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value(callback, type, quality) {
      setTimeout(() => {
        const data = atob(this.toDataURL(type, quality).split(',')[1])
        const array = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) {
          array[i] = data.charCodeAt(i)
        }
        callback(new Blob([array], { type: type || 'image/png' }))
      })
    },
  })
}
