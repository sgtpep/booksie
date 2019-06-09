import contact from './contact.js';
import coverLazyLoading from './cover-lazy-loading.js';
import externalLinks from './external-links.js';
import lazyLoading from './lazy-loading.js';
import menu from './menu.js';
import randomization from './randomization.js';
import stickyElements from './sticky-elements.js';
import viewer from './viewer.js';

contact();
coverLazyLoading();
externalLinks();
lazyLoading();
menu();
randomization(() => coverLazyLoading());
stickyElements();
viewer();
