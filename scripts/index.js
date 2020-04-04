import './canvas-toblob-polyfill.js'
import bookMenu from './book-menu.js'
import clickyAnalytics from './clicky-analytics.js'
import contact from './contact.js'
import coverLazyLoading from './cover-lazy-loading.js'
import lazyLoading from './lazy-loading.js'
import offline from './offline.js'
import randomization from './randomization.js'
import serviceWorker from './service-worker.js'
import viewer from './viewer.js'

bookMenu()
clickyAnalytics()
contact()
coverLazyLoading()
lazyLoading()
offline()
randomization(() => coverLazyLoading())
serviceWorker()
viewer()
