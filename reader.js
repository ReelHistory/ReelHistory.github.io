import {
  fillContents, pageCount, pageHash, savedPage, savePage, scanPath, sectionName, validPage,
} from './book.js';

const controls = document.querySelector('#reader-controls');
const pageTurns = document.querySelectorAll('[data-page-step]');
const pageJump = document.querySelector('#page-jump');
const pageNumber = document.querySelector('#page-number');
const progress = document.querySelector('#reading-progress');
const viewer = document.querySelector('#page-viewer');
const scan = document.querySelector('#scan');
const scanError = document.querySelector('#scan-error');
const scanLink = document.querySelector('#scan-link');
const status = document.querySelector('#page-status');
const zoom = document.querySelector('#zoom');
const contents = document.querySelector('#reader-contents');
const chapterList = document.querySelector('#reader-chapters');

let currentPage;
let swipeStart;

document.querySelector('#page-total').textContent = 'of ' + pageCount;
pageNumber.max = pageCount;
pageNumber.setAttribute('aria-describedby', 'page-total');
progress.max = pageCount;

function pageFromLocation() {
  const match = /^#page(\d+)$/i.exec(location.hash);
  const page = match ? Number(match[1]) : null;
  return validPage(page) ? page : savedPage() ?? 1;
}

function showPage(page) {
  currentPage = page;
  swipeStart = null;
  pageNumber.value = page;
  progress.value = page;
  for (const button of pageTurns) {
    button.setAttribute('aria-disabled', String(!validPage(page + Number(button.dataset.pageStep))));
  }

  const section = sectionName(page);
  status.textContent = 'Page ' + page + ' of ' + pageCount + ' · ' + section;
  scan.alt = 'Scanned page ' + page + ' of Reel History. ' + section + '.';
  scanError.hidden = true;
  scan.hidden = false;
  scan.src = scanPath(page);
  scanLink.href = scan.src;

  for (const link of chapterList.querySelectorAll('[data-page]')) {
    if (Number(link.dataset.page) === page) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
  savePage(page);
}

function goToPage(page) {
  if (!validPage(page) || page === currentPage) return;
  history.pushState(null, '', pageHash(page));
  showPage(page);
  viewer.scrollLeft = 0;
  window.scrollTo(0, 0);
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
  swipeStart = event.isPrimary && event.target === scan && !viewer.classList.contains('is-zoomed')
    ? { id: event.pointerId, x: event.clientX, y: event.clientY }
    : null;
});

viewer.addEventListener('pointerup', event => {
  if (!swipeStart || event.pointerId !== swipeStart.id) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;

  if (Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
    goToPage(currentPage + (dx < 0 ? 1 : -1));
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
  if (!enlarged) viewer.scrollLeft = 0;
});

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  viewer.focus();
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

scan.addEventListener('error', () => {
  scan.hidden = true;
  scanError.hidden = false;
});

function syncLocation() {
  const page = pageFromLocation();
  if (location.hash !== pageHash(page)) {
    history.replaceState(null, '', pageHash(page));
  }
  if (page !== currentPage) {
    showPage(page);
    viewer.scrollLeft = 0;
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', syncLocation);
syncLocation();
controls.hidden = false;
document.querySelector('.page-turns-bottom').hidden = false;
document.querySelector('#reader-caption').hidden = false;
