/**
 * Music Dashboard — script.js
 * iTunes Search API (Apple) · no API key required
 *
 * Arrays methods used:
 *   Array.map()    → renderTable()
 *   Array.filter() → applyFilter()
 *   Array.slice()  → getPaginatedData()
 */

'use strict';

const API_BASE = 'https://itunes.apple.com/search';
const PAGE_SIZE = 10;

const state = {
  allTracks: [],
  filteredTracks: [],
  currentPage: 1,
  currentAlbum: 'all'
};

let _currentPageTracks = [];

const searchInput    = document.getElementById('search-input');
const searchBtn      = document.getElementById('search-btn');
const albumFilter    = document.getElementById('album-filter');
const loader         = document.getElementById('loader');
const errorBox       = document.getElementById('error-box');
const errorText      = document.getElementById('error-text');
const emptyState     = document.getElementById('empty-state');
const tableContainer = document.getElementById('table-container');
const songTbody      = document.getElementById('song-tbody');
const resultInfo     = document.getElementById('result-info');
const pageInfo       = document.getElementById('page-info');
const prevBtn        = document.getElementById('prev-btn');
const nextBtn        = document.getElementById('next-btn');
const pageNumbers    = document.getElementById('page-numbers');
const statTotal      = document.getElementById('stat-total');

async function fetchTracks(artist) {
  const params = new URLSearchParams({
    term: artist,
    media: 'music',
    entity: 'song',
    limit: 200
  });

  const response = await fetch(`${API_BASE}?${params}`);

  if (!response.ok) {
    throw new Error(`iTunes API responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.results ?? [];
}

function applyFilter() {
  state.filteredTracks = state.currentAlbum === 'all'
    ? state.allTracks
    : state.allTracks.filter((track) => track.collectionName === state.currentAlbum);
}

function getPaginatedData() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  return state.filteredTracks.slice(start, start + PAGE_SIZE);
}

function totalPages() {
  return Math.ceil(state.filteredTracks.length / PAGE_SIZE);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(tracks) {
  const startIndex = (state.currentPage - 1) * PAGE_SIZE;
  _currentPageTracks = tracks;

  const rows = tracks.map((track, index) => {
    const rowNumber  = startIndex + index + 1;
    const trackName  = escapeHtml(track.trackName || '—');
    const artistName = escapeHtml(track.artistName || '—');
    const albumName  = escapeHtml(track.collectionName || '—');
    const genre      = escapeHtml(track.primaryGenreName || '');
    const year       = track.releaseDate ? new Date(track.releaseDate).getFullYear() : '—';
    const artwork    = track.artworkUrl100 || '';
    const previewUrl = track.previewUrl || null;

    const genreBadge = genre
      ? `<span class="genre-badge">${genre}</span>`
      : `<span class="genre-badge genre-na">N/A</span>`;

    const artworkCell = artwork
      ? `<img src="${artwork}" alt="${trackName}" class="artwork-thumb" loading="lazy" />`
      : `<span class="no-art">🎵</span>`;

    const previewCell = previewUrl
      ? `<button class="video-btn" onclick="openPreview(${index})" title="Play 30s preview">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
             <polygon points="5 3 19 12 5 21 5 3"/>
           </svg>
           Preview
         </button>`
      : `<span class="no-link">—</span>`;

    return `
      <tr>
        <td class="col-no">${rowNumber}</td>
        <td class="col-art-cell">${artworkCell}</td>
        <td><span class="track-name" title="${trackName}">${trackName}</span></td>
        <td><span class="artist-name">${artistName}</span></td>
        <td><span class="album-name" title="${albumName}">${albumName}</span></td>
        <td>${genreBadge}</td>
        <td class="year-cell">${year}</td>
        <td style="text-align:center;">${previewCell}</td>
      </tr>`;
  });

  songTbody.innerHTML = rows.join('');
}

function renderResultInfo() {
  const total = state.filteredTracks.length;
  const start = (state.currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(state.currentPage * PAGE_SIZE, total);

  resultInfo.innerHTML = total > 0
    ? `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> track${total !== 1 ? 's' : ''}`
    : 'No tracks found for this selection.';

  pageInfo.textContent = `Page ${state.currentPage} of ${totalPages()}`;
}

function renderPageNumbers() {
  const tp = totalPages();
  const cp = state.currentPage;

  pageNumbers.innerHTML = '';
  if (tp <= 1) return;

  const toShow = new Set([1, tp]);
  for (let p = Math.max(1, cp - 2); p <= Math.min(tp, cp + 2); p++) toShow.add(p);

  const sorted = [...toShow].sort((a, b) => a - b);

  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.cssText = 'color:var(--clr-text-dim);padding:0 4px;align-self:center;font-size:.85rem;';
      pageNumbers.appendChild(dots);
    }

    const btn = document.createElement('button');
    btn.textContent = p;
    btn.className = `page-num${p === cp ? ' active' : ''}`;
    btn.setAttribute('aria-label', `Go to page ${p}`);
    btn.addEventListener('click', () => { state.currentPage = p; refresh(); });
    pageNumbers.appendChild(btn);
  });
}

function renderPaginationButtons() {
  prevBtn.disabled = state.currentPage <= 1;
  nextBtn.disabled = state.currentPage >= totalPages();
}

function populateAlbumFilter(tracks) {
  const albums = [...new Set(tracks.map((t) => t.collectionName).filter(Boolean))].sort();

  albumFilter.innerHTML = '<option value="all">All Albums</option>';
  albums.forEach((album) => {
    const option = document.createElement('option');
    option.value = album;
    option.textContent = album.length > 42 ? album.slice(0, 42) + '…' : album;
    albumFilter.appendChild(option);
  });

  albumFilter.disabled = albums.length === 0;

  albumFilter.value = albums.includes(state.currentAlbum) ? state.currentAlbum : 'all';
  if (!albums.includes(state.currentAlbum)) state.currentAlbum = 'all';
}

function showLoader(visible) {
  loader.style.display         = visible ? 'flex' : 'none';
  tableContainer.style.display = visible ? 'none' : (state.allTracks.length ? 'block' : 'none');
}

function showError(message) {
  errorText.textContent    = message;
  errorBox.style.display   = 'flex';
  emptyState.style.display = 'none';
}

function hideError() {
  errorBox.style.display = 'none';
}

function showEmptyState(visible) {
  emptyState.style.display = visible ? 'block' : 'none';
}

function showTable(visible) {
  tableContainer.style.display = visible ? 'block' : 'none';
}

function updateStatPill(text) {
  statTotal.innerHTML = `<span class="stat-dot"></span>${text}`;
}

function refresh() {
  applyFilter();
  renderTable(getPaginatedData());
  renderResultInfo();
  renderPageNumbers();
  renderPaginationButtons();
  tableContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleSearch() {
  const artist = searchInput.value.trim();

  if (!artist) {
    searchInput.style.animation = 'none';
    requestAnimationFrame(() => { searchInput.style.animation = 'shake 0.35s ease'; });
    searchInput.focus();
    return;
  }

  hideError();
  showEmptyState(false);
  showTable(false);
  showLoader(true);
  updateStatPill('Searching…');
  searchBtn.disabled = true;

  try {
    const tracks = await fetchTracks(artist);

    state.allTracks    = tracks;
    state.currentPage  = 1;
    state.currentAlbum = 'all';

    if (tracks.length === 0) {
      showLoader(false);
      showTable(false);
      showError(`No songs found for "<strong>${escapeHtml(artist)}</strong>". Try a different artist name.`);
      albumFilter.innerHTML = '<option value="all">All Albums</option>';
      albumFilter.disabled  = true;
      updateStatPill('No results');
      return;
    }

    populateAlbumFilter(tracks);
    applyFilter();
    showLoader(false);
    showTable(true);
    refresh();
    updateStatPill(`${tracks.length} track${tracks.length !== 1 ? 's' : ''} found`);

  } catch (err) {
    showLoader(false);
    showError('Failed to reach the iTunes API. Please check your internet connection and try again.');
    updateStatPill('Error');
  } finally {
    searchBtn.disabled = false;
  }
}

searchBtn.addEventListener('click', handleSearch);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

albumFilter.addEventListener('change', () => {
  state.currentAlbum = albumFilter.value;
  state.currentPage  = 1;
  refresh();
});

prevBtn.addEventListener('click', () => {
  if (state.currentPage > 1) { state.currentPage--; refresh(); }
});

nextBtn.addEventListener('click', () => {
  if (state.currentPage < totalPages()) { state.currentPage++; refresh(); }
});

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)} 60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
`;
document.head.appendChild(shakeStyle);

showEmptyState(true);
showTable(false);
searchInput.focus();

/* ── Audio Preview Modal ── */

const previewOverlay  = document.getElementById('preview-overlay');
const previewAudio    = document.getElementById('preview-audio');
const previewArt      = document.getElementById('preview-art');
const previewTrackEl  = document.getElementById('preview-track');
const previewArtistEl = document.getElementById('preview-artist');
const previewAlbumEl  = document.getElementById('preview-album');
const previewPlayPause= document.getElementById('preview-playpause');
const previewCloseBtn = document.getElementById('preview-close');
const previewRewind   = document.getElementById('preview-rewind');
const previewForward  = document.getElementById('preview-forward');
const previewCurrentEl= document.getElementById('preview-current');
const previewDurationEl=document.getElementById('preview-duration');
const previewFill     = document.getElementById('preview-progress-fill');
const previewThumb    = document.getElementById('preview-progress-thumb');
const previewBar      = document.getElementById('preview-progress-bar');
const waveformEl      = document.getElementById('waveform');
const iconPlay        = previewPlayPause.querySelector('.icon-play');
const iconPause       = previewPlayPause.querySelector('.icon-pause');

function formatTime(secs) {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setPlayState(playing) {
  iconPlay.style.display  = playing ? 'none'  : 'block';
  iconPause.style.display = playing ? 'block' : 'none';
  waveformEl.classList.toggle('playing', playing);
}

function closePreview() {
  previewOverlay.classList.remove('open');
  document.body.style.overflow = '';
  previewAudio.pause();
  setPlayState(false);
}

window.openPreview = function (index) {
  const track = _currentPageTracks[index];
  if (!track || !track.previewUrl) return;

  previewTrackEl.textContent  = track.trackName      || '—';
  previewArtistEl.textContent = track.artistName     || '—';
  previewAlbumEl.textContent  = track.collectionName || '—';

  const art = (track.artworkUrl100 || '').replace('100x100', '300x300');
  previewArt.src = art;
  previewArt.style.display = art ? 'block' : 'none';

  previewAudio.src = track.previewUrl;
  previewAudio.currentTime = 0;

  setPlayState(false);
  previewFill.style.width  = '0%';
  previewThumb.style.left  = '0%';
  previewCurrentEl.textContent  = '0:00';
  previewDurationEl.textContent = '0:30';

  previewOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  previewAudio.play().catch(() => {});
};

previewAudio.addEventListener('play',  () => setPlayState(true));
previewAudio.addEventListener('pause', () => setPlayState(false));
previewAudio.addEventListener('ended', () => setPlayState(false));

previewAudio.addEventListener('timeupdate', () => {
  const cur = previewAudio.currentTime;
  const dur = previewAudio.duration || 30;
  const pct = Math.min((cur / dur) * 100, 100);
  previewFill.style.width  = `${pct}%`;
  previewThumb.style.left  = `${pct}%`;
  previewCurrentEl.textContent = formatTime(cur);
});

previewAudio.addEventListener('loadedmetadata', () => {
  previewDurationEl.textContent = formatTime(previewAudio.duration);
});

previewPlayPause.addEventListener('click', () => {
  previewAudio.paused ? previewAudio.play() : previewAudio.pause();
});

previewRewind.addEventListener('click', () => {
  previewAudio.currentTime = Math.max(0, previewAudio.currentTime - 5);
});

previewForward.addEventListener('click', () => {
  previewAudio.currentTime = Math.min(previewAudio.duration || 30, previewAudio.currentTime + 5);
});

previewCloseBtn.addEventListener('click', closePreview);

previewOverlay.addEventListener('click', (e) => {
  if (e.target === previewOverlay) closePreview();
});

document.addEventListener('keydown', (e) => {
  if (!previewOverlay.classList.contains('open')) return;
  if (e.key === 'Escape')     { e.preventDefault(); closePreview(); }
  if (e.key === ' ')          { e.preventDefault(); previewPlayPause.click(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); previewRewind.click(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); previewForward.click(); }
});

previewBar.addEventListener('click', (e) => {
  const rect = previewBar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  previewAudio.currentTime = pct * (previewAudio.duration || 30);
});
