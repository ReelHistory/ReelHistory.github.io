import {
  fillContents, pageCount, pageHash, savedPage, savePage, scanPath, sectionName, validPage,
} from './book.js';

const header = document.querySelector('.reader-header');
const controls = document.querySelector('#reader-controls');
const pageTurns = document.querySelectorAll('[data-page-step]');
const pageJump = document.querySelector('#page-jump');
const pageNumber = document.querySelector('#page-number');
const progress = document.querySelector('#reading-progress');
const viewer = document.querySelector('#page-viewer');
const status = document.querySelector('#page-status');
const announcement = document.querySelector('#page-announcement');
const zoom = document.querySelector('#zoom');
const contents = document.querySelector('#reader-contents');
const chapterList = document.querySelector('#reader-chapters');
const pages = [];

let currentPage;
let swipeStart;
let scrollFrame;
let scrollReference = 0;
let hashTimer;

document.querySelector('#page-total').textContent = 'of ' + pageCount;
pageNumber.max = pageCount;
pageNumber.setAttribute('aria-describedby', 'page-total');
progress.max = pageCount;
history.scrollRestoration = 'manual';

const scans = document.createDocumentFragment();
for (let page = 1; page <= pageCount; page++) {
  const frame = document.createElement('div');
  frame.className = 'scan-page';
  frame.id = pageHash(page).slice(1);

  const scan = document.createElement('img');
  scan.className = 'scan';
  scan.width = 792;
  scan.height = 612;
  scan.alt = 'Scanned page ' + page + ' of Reel History.';
  scan.loading = 'lazy';
  scan.decoding = 'async';
  scan.draggable = false;
  scan.src = scanPath(page);
  frame.append(scan);
  scans.append(frame);
  pages.push(frame);
}

viewer.addEventListener('error', event => {
  if (!event.target.matches('.scan')) return;

  const fallback = document.createElement('p');
  fallback.className = 'scan-fallback';
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = event.target.src;
  link.textContent = 'Open the scan directly';
  fallback.append(event.target.alt + ' The image couldn’t load. ', link);
  event.target.replaceWith(fallback);
}, true);

viewer.append(scans);

function pageFromLocation() {
  const match = /^#page(\d+)$/i.exec(location.hash);
  const page = match ? Number(match[1]) : null;
  return validPage(page) ? page : savedPage() ?? 1;
}

function showPage(page) {
  currentPage = page;
  progress.value = page;
  if (document.activeElement !== pageNumber) pageNumber.value = page;
  for (const button of pageTurns) {
    button.setAttribute('aria-disabled', String(!validPage(page + Number(button.dataset.pageStep))));
  }

  status.textContent = 'Page ' + page + ' of ' + pageCount + ' · ' + sectionName(page);
  for (const link of chapterList.querySelectorAll('[data-page]')) {
    if (Number(link.dataset.page) === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  savePage(page);
}

function replacePageHash(page) {
  if (location.hash !== pageHash(page)) history.replaceState(null, '', pageHash(page));
}

function revealHeader() {
  header.classList.remove('is-collapsed');
  scrollReference = Math.max(0, window.scrollY);
}

function scrollToPage(page) {
  if (page === 1) window.scrollTo(0, 0);
  else pages[page - 1].scrollIntoView({ block: 'start', inline: 'nearest' });
  revealHeader();
}

function goToPage(page) {
  if (!validPage(page)) return;

  clearTimeout(hashTimer);
  replacePageHash(currentPage);
  if (page !== currentPage) {
    history.pushState(null, '', pageHash(page));
    showPage(page);
    announcement.textContent = status.textContent;
  }

  pageNumber.value = page;
  swipeStart = null;
  scrollToPage(page);
  viewer.scrollLeft = 0;
}

function trackVisiblePage() {
  scrollFrame = null;
  const position = Math.max(0, window.scrollY);
  const scrollDistance = position - scrollReference;
  if (position <= 16 || contents.open || header.querySelector(':focus-visible')) {
    revealHeader();
  } else if (Math.abs(scrollDistance) >= 16) {
    header.classList.toggle('is-collapsed', scrollDistance > 0);
    scrollReference = position;
  }

  // Keep the reading line steady while the header slides in or out.
  const readingLine = header.offsetHeight + 16;
  let first = 0;
  let end = pages.length;
  while (first < end) {
    const middle = Math.floor((first + end) / 2);
    if (pages[middle].getBoundingClientRect().top <= readingLine) first = middle + 1;
    else end = middle;
  }

  const page = Math.max(1, first);
  if (page === currentPage) return;
  showPage(page);
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => replacePageHash(currentPage), 350);
}

function selectFromContents(page) {
  contents.close();
  goToPage(page);
}

fillContents(chapterList, { onSelect: selectFromContents });
for (const link of document.querySelectorAll('[data-front-page]')) {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectFromContents(Number(link.dataset.frontPage));
  });
}

for (const button of pageTurns) {
  button.addEventListener('click', () => goToPage(currentPage + Number(button.dataset.pageStep)));
}
pageJump.addEventListener('submit', event => {
  event.preventDefault();
  goToPage(pageNumber.valueAsNumber);
});

viewer.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch') return;
  swipeStart = event.isPrimary && event.target.matches('.scan') && !viewer.classList.contains('is-zoomed')
    ? { id: event.pointerId, x: event.clientX, y: event.clientY, page: currentPage }
    : null;
});

viewer.addEventListener('pointerup', event => {
  if (!swipeStart || event.pointerId !== swipeStart.id) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  const page = swipeStart.page;
  swipeStart = null;

  if (page === currentPage && Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
    goToPage(page + (dx < 0 ? 1 : -1));
  }
});

viewer.addEventListener('pointercancel', event => {
  if (event.pointerId === swipeStart?.id) swipeStart = null;
});

zoom.addEventListener('click', () => {
  swipeStart = null;
  const enlarged = zoom.getAttribute('aria-pressed') !== 'true';
  zoom.setAttribute('aria-pressed', String(enlarged));
  viewer.classList.toggle('is-zoomed', enlarged);
  viewer.tabIndex = enlarged ? 0 : -1;
  scrollToPage(currentPage);
  if (!enlarged) viewer.scrollLeft = 0;
});

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  viewer.focus({ preventScroll: true });
  scrollToPage(currentPage);
});

document.querySelector('#open-contents').addEventListener('click', () => contents.showModal());

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || contents.open || viewer.classList.contains('is-zoomed')
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]'))) return;

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    goToPage(currentPage + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});

function syncLocation() {
  clearTimeout(hashTimer);
  const page = pageFromLocation();
  replacePageHash(page);
  showPage(page);
  pageNumber.value = page;
  scrollToPage(page);
  viewer.scrollLeft = 0;
}

function measureHeader() {
  document.body.style.setProperty('--reader-header-height', header.offsetHeight + 'px');
}

header.addEventListener('focusin', revealHeader);
window.addEventListener('hashchange', syncLocation);
window.addEventListener('scroll', () => {
  if (scrollFrame == null) scrollFrame = requestAnimationFrame(trackVisiblePage);
}, { passive: true });

controls.hidden = false;
document.querySelector('.page-turns-bottom').hidden = false;
measureHeader();
new ResizeObserver(measureHeader).observe(header);
syncLocation();
