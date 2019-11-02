export default () => {
  if (navigator.onLine || navigator.onLine === undefined) {
    window.clicky_custom = {
      cookies_disable: true,
      history_disable: true,
      outbound_disable: true,
      ping_disable: true,
    }
    window.clicky_site_ids = [101191727]
    const script = document.createElement('script')
    script.async = true
    script.src = '//static.getclicky.com/js'
    document.body.appendChild(script)
  }
}
