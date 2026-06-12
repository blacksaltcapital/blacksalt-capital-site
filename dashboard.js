const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// SVG icons
const folderSVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/></svg>`;
const fileSVG = `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
const backArrowSVG = `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;

function getFileType(name) {
  // Strip to alphanumerics — this value is injected into a class attribute
  const ext = (name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const known = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc'];
  return known.includes(ext) ? ext.replace('xls', 'xlsx').replace('doc', 'docx') : ext || 'file';
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Escape any user/storage-provided string before injecting into HTML.
// Prevents XSS if a file/folder name contains HTML or script tags.
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

// ============================================================
// Render a folder view: shows folders as clickable tiles,
// files as download rows. Clicking a folder drills in.
// ============================================================
async function renderFolder(basePath, containerEl, sectionLabel, emptyMessage = 'No documents available yet.', searchEl = null, wrapEl = null) {
  containerEl.innerHTML = '';

  // Clear and reset search input on each navigation
  if (searchEl) {
    searchEl.value = '';
    if (wrapEl) wrapEl.style.display = 'none';
  }

  const parts = basePath.split('/');
  const isSubfolder = parts.length > 1;

  if (isSubfolder) {
    const parentPath = parts.slice(0, -1).join('/');
    const currentFolder = parts[parts.length - 1];

    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = `${backArrowSVG} Back`;
    backBtn.addEventListener('click', () => renderFolder(parentPath, containerEl, sectionLabel, emptyMessage, searchEl, wrapEl));
    containerEl.appendChild(backBtn);

    const crumb = document.createElement('div');
    crumb.className = 'breadcrumb';
    crumb.innerHTML = `${escapeHTML(sectionLabel)} / <span>${escapeHTML(currentFolder)}</span>`;
    containerEl.appendChild(crumb);
  }

  // Fetch items at this path
  const { data: items, error } = await sb
    .storage
    .from('statements')
    .list(basePath, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  if (error || !items || items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = emptyMessage;
    containerEl.appendChild(empty);
    return 0;
  }

  const folders = items.filter(i => i.id === null && i.name && !i.name.startsWith('.'));

  // Parse a Q# YYYY score from a filename for tiebreaking same-day uploads.
  // Returns a numeric score (higher = more recent) or null if no match.
  function parseQYearScore(name) {
    const match = name.match(/Q(\d)\s+(\d{4})/i);
    if (!match) return null;
    return parseInt(match[2]) * 10 + parseInt(match[1]);
  }

  // Sort newest-first by upload date.
  // If two files share the same calendar day, fall back to Q# YYYY parsed
  // from the filename (so Q4 2030 > Q3 2030 > Q4 2029, etc.).
  // If neither file matches the pattern, fall back to alphabetical order.
  const files = items
    .filter(i => i.id !== null && i.name && !i.name.startsWith('.'))
    .sort((a, b) => {
      const dayA = a.updated_at ? new Date(a.updated_at).toDateString() : '';
      const dayB = b.updated_at ? new Date(b.updated_at).toDateString() : '';

      if (dayA !== dayB) {
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      }

      const scoreA = parseQYearScore(a.name);
      const scoreB = parseQYearScore(b.name);
      if (scoreA !== null && scoreB !== null) return scoreB - scoreA;

      return a.name.localeCompare(b.name);
    });

  const list = document.createElement('div');
  list.className = 'doc-list';

  // Render folders as clickable tiles
  for (const folder of folders) {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.innerHTML = `
      <div class="folder-icon">${folderSVG}</div>
      <div class="folder-name">${escapeHTML(folder.name)}</div>
      <div class="folder-arrow">›</div>
    `;
    row.addEventListener('click', () => {
      renderFolder(`${basePath}/${folder.name}`, containerEl, sectionLabel, emptyMessage, searchEl, wrapEl);
    });
    list.appendChild(row);
  }

  // Render files as download rows — signed URL is generated on click, not on load
  for (const file of files) {
    const filePath = `${basePath}/${file.name}`;

    const row = document.createElement('div');
    row.className = 'doc-row';
    row.innerHTML = `
      <div class="doc-info">
        <div class="doc-icon">${fileSVG}</div>
        <div>
          <div class="doc-name">${escapeHTML(file.name)}</div>
          <div>
            <span class="doc-type-badge badge-${escapeHTML(getFileType(file.name))}">${escapeHTML(getFileType(file.name))}</span>
            ${file.updated_at ? `<span class="doc-date" style="margin-left:0.4rem">${escapeHTML(formatDate(file.updated_at))}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="doc-download">Download</button>
    `;

    const btn = row.querySelector('.doc-download');
    btn.addEventListener('click', async () => {
      btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span class="sr-only">Loading</span>';
      btn.disabled = true;
      const { data: urlData, error: urlError } = await sb
        .storage
        .from('statements')
        .createSignedUrl(filePath, 3600);
      if (urlData?.signedUrl) {
        window.open(urlData.signedUrl, '_blank', 'noopener');
      } else {
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = 'Download'; btn.disabled = false; }, 2000);
        return;
      }
      btn.textContent = 'Download';
      btn.disabled = false;
    });

    list.appendChild(row);
  }

  containerEl.appendChild(list);

  if (folders.length === 0 && files.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = isSubfolder ? 'This folder is empty.' : emptyMessage;
    containerEl.appendChild(empty);
  }

  // Show search only inside subfolders with files
  if (searchEl && wrapEl && isSubfolder && files.length > 0) {
    wrapEl.style.display = '';

    if (searchEl._filterHandler) {
      searchEl.removeEventListener('input', searchEl._filterHandler);
    }

    searchEl._filterHandler = () => {
      const q = searchEl.value.trim().toLowerCase();
      const currentList = containerEl.querySelector('.doc-list');
      if (!currentList) return;

      const rows = currentList.querySelectorAll('.doc-row:not(.doc-row--skeleton)');
      let visibleCount = 0;

      rows.forEach(row => {
        const nameEl = row.querySelector('.doc-name');
        const text = (nameEl ? nameEl.textContent : '').toLowerCase();
        const show = !q || text.includes(q);
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      let emptyMsg = currentList.querySelector('.search-empty');
      if (visibleCount === 0 && q) {
        if (!emptyMsg) {
          emptyMsg = document.createElement('div');
          emptyMsg.className = 'empty-state search-empty';
          currentList.appendChild(emptyMsg);
        }
        emptyMsg.textContent = `No results for "${searchEl.value.trim()}".`;
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    };

    searchEl.addEventListener('input', searchEl._filterHandler);
  }

  return files.length;
}

// ============================================================
// Inactivity auto-logout — signs out after 180 minutes without
// activity and shows a notice with a sign-back-in button.
// ============================================================
const INACTIVITY_LIMIT_MS = 180 * 60 * 1000;
let lastActivity = Date.now();
let inactivityTimedOut = false;

['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach((evt) => {
  window.addEventListener(evt, () => {
    if (!inactivityTimedOut) lastActivity = Date.now();
  }, { passive: true });
});

function showTimeoutNotice() {
  if (document.getElementById('timeout-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'timeout-overlay';
  overlay.className = 'timeout-overlay';
  overlay.innerHTML = `
    <div class="timeout-card" role="alertdialog" aria-labelledby="timeout-title" aria-describedby="timeout-desc">
      <h2 id="timeout-title">Signed out due to inactivity</h2>
      <p id="timeout-desc">For your security, you were signed out after a period of inactivity.</p>
      <a href="/login" class="auth-btn timeout-btn">Sign Back In</a>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function inactivitySignOut() {
  if (inactivityTimedOut) return;
  inactivityTimedOut = true;
  await sb.auth.signOut();
  showTimeoutNotice();
}

// Check once a minute; also check immediately when the tab regains focus
// (covers a laptop reopened hours later).
setInterval(() => {
  if (Date.now() - lastActivity > INACTIVITY_LIMIT_MS) inactivitySignOut();
}, 60000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) inactivitySignOut();
});

// ============================================================
// MAIN
// ============================================================
(async function init() {
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    window.location.href = '/login';
    return;
  }

  const user = session.user;
  document.getElementById('welcome-text').textContent = `Signed in as ${user.email}`;

  // Load investor info (optional)
  try {
    const { data: investor, error } = await sb
      .from('investors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const cardName  = document.getElementById('card-name');
    const cardSince = document.getElementById('card-since');
    const cardUnits = document.getElementById('card-units');

    if (investor && !error) {
      cardName.textContent  = investor.full_name || user.email;
      cardSince.textContent = investor.member_since || '—';
      const units = investor.units_owned;
      cardUnits.textContent = (units != null)
        ? Number(units).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—';
    } else {
      cardName.textContent  = user.email;
      cardSince.textContent = '—';
      cardUnits.textContent = '—';
    }

    // Remove skeleton shimmer once values are set
    [cardName, cardSince, cardUnits].forEach(el => el.classList.remove('skeleton'));
  } catch (e) {
    document.querySelectorAll('.card-value.skeleton').forEach(el => {
      el.textContent = '—';
      el.classList.remove('skeleton');
    });
  }

  // Remove loading indicators
  const sl = document.getElementById('shared-loading');
  const pl = document.getElementById('private-loading');
  if (sl) sl.remove();
  if (pl) pl.remove();

  // Render shared folder (clickable navigation)
  await renderFolder(
    'shared',
    document.getElementById('shared-doc-list'),
    'Shared',
    'No letters or reports have been published yet.',
    document.getElementById('shared-search'),
    document.getElementById('shared-search-wrap')
  );

  // Render private folder (clickable navigation)
  await renderFolder(
    user.id,
    document.getElementById('private-doc-list'),
    'Personal',
    'Your personal documents — K-1s, statements, and ownership records — will appear here when available.',
    document.getElementById('private-search'),
    document.getElementById('private-search-wrap')
  );
})();

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = '/login';
});
