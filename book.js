export const pageCount = 321;

const progressKey = 'reel-history:last-page';

const parts = [
  {
    number: 1,
    title: 'Search',
    page: 7,
    chapters: [
      ['’Réal to Reel', 8],
      ['Origin', 20],
      ['Media', 40],
      ['Proposal', 48],
      ['The Barn', 62],
    ],
  },
  {
    number: 2,
    title: 'Found',
    page: 105,
    chapters: [
      ['True Creation', 107],
      ['We Were Conscious', 127],
      ['All Kinds of Experiments', 156],
      ['’66 to ’72 (My Archive)', 183],
      ['A Blistering Statement', 205],
      ['The Studio', 238],
    ],
  },
  {
    number: 3,
    title: 'Lost',
    page: 259,
    chapters: [
      ['Craquelure', 261],
      ['Bone', 282],
      ['Postscript', 296],
      ['Coda', 300],
      ['Credit', 316],
    ],
  },
];

export function validPage(page) {
  return Number.isInteger(page) && page >= 1 && page <= pageCount;
}

export function pageHash(page) {
  return '#page' + page;
}

export function readerLink(page) {
  return 'reader.html' + pageHash(page);
}

export function scanPath(page) {
  return 'images/Master%20Copy_img_' + (page - 1) + '.jpg';
}

export function savedPage() {
  try {
    const page = Number(localStorage.getItem(progressKey));
    return validPage(page) ? page : null;
  } catch {
    return null;
  }
}

export function savePage(page) {
  try {
    localStorage.setItem(progressKey, String(page));
  } catch {
    // Readers can still navigate when storage is unavailable.
  }
}

export function sectionName(page) {
  const part = parts.findLast(item => page >= item.page);
  if (!part) return page === 1 ? 'Cover' : 'Front matter';

  const chapter = part.chapters.findLast(([, start]) => page >= start);
  return chapter ? part.title + ' / ' + chapter[0] : 'Part ' + part.number + ' · ' + part.title;
}

export function fillContents(container, { onSelect } = {}) {
  for (const part of parts) {
    const section = document.createElement('section');
    section.className = 'contents-part';

    const heading = document.createElement('h3');
    const partLink = makeLink(part.title, part.page, onSelect);
    const partLabel = document.createElement('span');
    partLabel.className = 'part-label';
    partLabel.textContent = 'Part ' + part.number;
    partLink.prepend(partLabel);
    heading.append(partLink);
    section.append(heading);

    const chapters = document.createElement('ul');
    for (const [title, page] of part.chapters) {
      const item = document.createElement('li');
      const link = makeLink(title, page, onSelect);
      const pageLabel = document.createElement('span');
      pageLabel.className = 'chapter-page';
      pageLabel.innerHTML = '<span class="visually-hidden">, page </span>';
      pageLabel.append(String(page));
      link.append(pageLabel);
      item.append(link);
      chapters.append(item);
    }
    section.append(chapters);
    container.append(section);
  }
}

function makeLink(title, page, onSelect) {
  const link = document.createElement('a');
  link.href = readerLink(page);
  link.dataset.page = String(page);
  link.append(title);

  if (onSelect) {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onSelect(page);
    });
  }

  return link;
}
