const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');

const addressInput = document.getElementById('address-input');
const securityIcon = document.getElementById('security-icon');
const addressWrapper = document.querySelector('.address-bar-wrapper');
const copylinkBtn = document.getElementById('copylink-btn');

const favoritesContainer = document.getElementById('favorites-container');
const tabsContainer = document.getElementById('tabs-container');
const webviewsContainer = document.getElementById('webviews-container');
const newTabBtn = document.getElementById('new-tab-btn');

const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const toggleSidebarIcon = document.getElementById('toggle-sidebar-icon');
const sidebar = document.getElementById('sidebar');
const hoverZone = document.getElementById('sidebar-hover-zone');

const appContainer = document.getElementById('app-container');
const textMeasurer = document.getElementById('text-measurer');

let tabs = [];
let activeTabId = null;
let currentUrl = 'https://www.google.com/';
let isSplitView = false;
let splitSecondaryTabId = null;

// ─────────────────────────────────────────────
// URL SANITIZATION
// ─────────────────────────────────────────────

const BLOCKED_PROTOCOLS = [
  'file:',
  'javascript:',
  'data:',
  'vbscript:',
  'about:'
];

function sanitizeUrl(url) {

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  for (const proto of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      return null;
    }
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  ) {

    try {

      new URL(trimmed);
      return trimmed;

    } catch {

      return null;

    }

  }

  if (
    trimmed.includes('.') &&
    !trimmed.includes(' ')
  ) {

    return 'https://' + trimmed;

  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;

}

function handleBlockedUrl(url) {

  addressWrapper.style.borderColor = '#ef4444';
  addressInput.style.color = '#ef4444';

  const originalVal = addressInput.value;

  addressInput.value = `Blocked: ${url}`;

  setTimeout(() => {

    addressWrapper.style.borderColor = '';
    addressInput.style.color = '';
    addressInput.value = originalVal;

  }, 2500);

}

// ─────────────────────────────────────────────
// WINDOW CONTROLS
// ─────────────────────────────────────────────

const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');
const splitViewBtn = document.getElementById('split-view-btn');

minBtn?.addEventListener('click', () => {
  window.browserAPI.windowMinimize();
});

maxBtn?.addEventListener('click', () => {
  window.browserAPI.windowMaximize();
});

splitViewBtn?.addEventListener('click', () => {
  toggleSplitView();
});

closeBtn?.addEventListener('click', () => {
  window.browserAPI.windowClose();
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getActiveTab() {

  return tabs.find(tab => tab.id === activeTabId);

}

function updateInputWidth() {

  if (!textMeasurer || !addressInput) {
    return;
  }

  textMeasurer.textContent =
    addressInput.value ||
    addressInput.placeholder;

  const newWidth = Math.min(
    260,
    textMeasurer.offsetWidth + 2
  );

  addressInput.style.width = `${newWidth}px`;

}

function syncUrl(url) {

  currentUrl = url;

  addressInput.value = url;

  updateInputWidth();

  const isHttps = url.startsWith('https://');

  if (isHttps) {

    securityIcon.style.color = '#38bdf8';
    securityIcon.style.opacity = '1';
    securityIcon.title = 'Connection is secure';

  }

  else {

    securityIcon.style.color = '#f59e0b';
    securityIcon.style.opacity = '0.7';
    securityIcon.title = 'Connection is not secure';

  }

}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────

backBtn?.addEventListener('click', () => {

  const activeTab = getActiveTab();

  if (
    activeTab &&
    activeTab.webviewEl.canGoBack()
  ) {

    activeTab.webviewEl.goBack();

  }

});

forwardBtn?.addEventListener('click', () => {

  const activeTab = getActiveTab();

  if (
    activeTab &&
    activeTab.webviewEl.canGoForward()
  ) {

    activeTab.webviewEl.goForward();

  }

});

reloadBtn?.addEventListener('click', () => {

  const activeTab = getActiveTab();

  if (activeTab) {

    activeTab.webviewEl.reload();

  }

});

// ─────────────────────────────────────────────
// COPY LINK
// ─────────────────────────────────────────────

copylinkBtn?.addEventListener('click', async () => {

  if (!addressInput.value) {
    return;
  }

  try {

    await navigator.clipboard.writeText(addressInput.value);

    const icon = copylinkBtn.querySelector('img');

    if (icon) {

      icon.style.filter = 'brightness(0) invert(1)';

      setTimeout(() => {

        icon.style.filter = '';

      }, 200);

    }

  }

  catch (err) {

    console.error('Failed to copy URL', err);

  }

});

// ─────────────────────────────────────────────
// ADDRESS BAR
// ─────────────────────────────────────────────

addressInput.addEventListener('input', updateInputWidth);

addressInput.addEventListener('focus', () => {
  addressInput.select();
});

addressInput.addEventListener('blur', () => {

  if (addressInput.value !== currentUrl) {

    addressInput.value = currentUrl;

    updateInputWidth();

  }

});

addressInput.addEventListener('keydown', (e) => {

  if (e.key === 'Escape') {

    addressInput.value = currentUrl;

    updateInputWidth();

    addressInput.blur();

    return;

  }

  if (e.key !== 'Enter') {
    return;
  }

  const rawUrl = addressInput.value.trim();

  if (!rawUrl) {
    return;
  }

  const safe = sanitizeUrl(rawUrl);

  if (!safe) {

    handleBlockedUrl(rawUrl);

    return;

  }

  const activeTab = getActiveTab();

  if (activeTab) {

    activeTab.webviewEl.loadURL(safe);

  }

  addressInput.blur();

});

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

const DEFAULT_FAVICON =
  'data:image/svg+xml;utf8,' +
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%23868686" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="8" cy="8" r="7"></circle>' +
  '<line x1="2" y1="8" x2="14" y2="8"></line>' +
  '<path d="M12 2a15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10"></path>' +
  '</svg>';

// INICIO DE PERSISTENCIA DE PESTANAS
const DEFAULT_TAB_URL = 'https://www.digiapps.com.co';
const FAVORITES_STORAGE_KEY = 'digi-browser:favorites';

let isRestoringTabs = false;

function saveTabSession() {

  if (isRestoringTabs) {
    return;
  }

  try {

    const session = {
      activeIndex: tabs.findIndex(tab => tab.id === activeTabId),
      tabs: tabs
        .filter(tab => tab.url)
        .map(tab => ({
          url: tab.url,
          title: tab.titleSpan.textContent || 'New Tab',
          favicon: tab.faviconImg.src || DEFAULT_FAVICON,
          pinned: Boolean(tab.pinned),
          favorite: Boolean(tab.favorite)
        }))
    };

    window.browserAPI?.saveTabsSession?.(session);

  }

  catch (err) {
    console.error('Failed to save tabs session', err);
  }

}

function getValidTabSession(session) {

  if (
    !session ||
    !Array.isArray(session.tabs)
  ) {
    return null;
  }

  const restoredTabs = session.tabs
    .map(tab => ({
      url: typeof tab.url === 'string' ? sanitizeUrl(tab.url) : null,
      title: typeof tab.title === 'string' && tab.title.trim()
        ? tab.title
        : 'New Tab',
      favicon: typeof tab.favicon === 'string' && tab.favicon.trim()
        ? tab.favicon
        : DEFAULT_FAVICON,
      pinned: Boolean(tab.pinned) && !Boolean(tab.favorite),
      favorite: Boolean(tab.favorite)
    }))
    .filter(tab => tab.url);

  if (restoredTabs.length === 0) {
    return null;
  }

  return {
    activeIndex: Number.isInteger(session.activeIndex)
      ? session.activeIndex
      : 0,
    tabs: restoredTabs
  };

}

async function restoreTabs() {

  const savedSession = await window.browserAPI?.loadTabsSession?.();
  const session = getValidTabSession(savedSession);

  if (!session) {
    createTab();
    return;
  }

  isRestoringTabs = true;

  const restoredTabs = session.tabs.map(tab => createTab(
    tab.url,
    {
      activate: false,
      title: tab.title,
      favicon: tab.favicon,
      pinned: tab.pinned,
      favorite: tab.favorite
    }
  ));

  isRestoringTabs = false;

  const restoredActiveTab =
    restoredTabs[session.activeIndex] ||
    restoredTabs[0];

  switchTab(restoredActiveTab.id);

}
// FIN DE PERSISTENCIA DE PESTANAS

// const WEBVIEW_SCROLLBAR_CSS = `
//   ::-webkit-scrollbar {
//     width: 8px !important;
//     background: white !important;
//   }

//   ::-webkit-scrollbar-track {
//     background: white !important;
//   }

//   ::-webkit-scrollbar-thumb {
//     border-radius: 9999px !important;
//     background: rgba(134, 134, 134, 0.45) !important;

//     /* thinner thumb */
//     border: 2px solid white !important;
//     background-clip: content-box !important;
//   }

//   ::-webkit-scrollbar-thumb:hover {
//     background: rgba(134, 134, 134, 0.65) !important;
//     background-clip: content-box !important;
//   }
// `;

function setupWebviewEvents(tab) {

  const wv = tab.webviewEl;

  wv.addEventListener('dom-ready', () => {
    wv.insertCSS(WEBVIEW_SCROLLBAR_CSS).catch(() => { });
  });

  // INICIO DE GUARDADO DE PESTANAS AL NAVEGAR
  wv.addEventListener('did-start-navigation', (e) => {

    if (!e.isMainFrame) {
      return;
    }

    tab.url = e.url;

    tab.faviconImg.src = DEFAULT_FAVICON;

    saveTabSession();

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });

  wv.addEventListener('did-navigate', (e) => {

    tab.url = e.url;

    saveTabSession();

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });

  wv.addEventListener('did-navigate-in-page', (e) => {

    if (!e.isMainFrame) {
      return;
    }

    tab.url = e.url;

    saveTabSession();

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });
  // FIN DE GUARDADO DE PESTANAS AL NAVEGAR

  wv.addEventListener('did-start-loading', () => {

    hideTabContextMenu();

    tab.tabLoadingBorder.style.display = 'block';

  });

  wv.addEventListener('did-stop-loading', () => {

    tab.tabLoadingBorder.style.display = 'none';

  });

  // INICIO DE GUARDADO DE DATOS VISUALES DE PESTANAS
  wv.addEventListener('page-title-updated', (e) => {

    const safeTitle = e.title || 'New Tab';

    tab.titleSpan.textContent = safeTitle;

    updateTabStateStyles(tab);
    saveTabSession();

    if (tab.id === activeTabId) {

      document.title = `${safeTitle} - Digi Browser`;

    }

  });

  wv.addEventListener('page-favicon-updated', (e) => {

    if (
      e.favicons &&
      e.favicons.length > 0
    ) {

      tab.faviconImg.src = e.favicons[0];

      updateTabStateStyles(tab);
      saveTabSession();

    }

  });
  // FIN DE GUARDADO DE DATOS VISUALES DE PESTANAS

  wv.addEventListener('new-window', (e) => {

    e.preventDefault();

    if (e.url) {
      createTab(e.url);
    }

  });

}

// INICIO DE MENU CONTEXTUAL DE PESTANAS
let tabContextMenu = null;
let tabContextBackdrop = null;
let contextMenuTabId = null;
let splitPickerMenu = null;
let splitPickerBackdrop = null;

function getTabById(tabId) {

  return tabs.find(tab => tab.id === tabId);

}

function escapeHtml(value) {

  return String(value).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char])
  );

}

// INICIO DE SPLIT VIEW
function getNextTabForSplit(primaryTabId) {

  if (tabs.length < 2) {
    return null;
  }

  const primaryIndex = tabs.findIndex(tab => tab.id === primaryTabId);
  const startIndex = primaryIndex === -1 ? 0 : primaryIndex;

  for (let offset = 1; offset < tabs.length; offset++) {

    const candidate = tabs[
      (startIndex + offset) % tabs.length
    ];

    if (candidate.id !== primaryTabId) {
      return candidate;
    }

  }

  return null;

}

function updateSplitViewButtonState() {

  splitViewBtn?.classList.toggle(
    'split-view-active',
    isSplitView
  );

}

function updateVisibleWebviews() {

  let secondaryTab = null;

  if (isSplitView) {

    secondaryTab = getTabById(splitSecondaryTabId);

    if (
      !secondaryTab ||
      secondaryTab.id === activeTabId
    ) {

      secondaryTab = getNextTabForSplit(activeTabId);
      splitSecondaryTabId = secondaryTab?.id || null;

    }

    if (!secondaryTab) {

      isSplitView = false;
      splitSecondaryTabId = null;

    }

  }

  webviewsContainer.classList.toggle(
    'is-split-view',
    Boolean(isSplitView && secondaryTab)
  );

  tabs.forEach(tab => {

    const isPrimary = tab.id === activeTabId;
    const isSecondary =
      Boolean(isSplitView && secondaryTab) &&
      tab.id === secondaryTab.id;

    tab.wrapperEl.classList.toggle(
      'hidden',
      !(isPrimary || isSecondary)
    );

    tab.wrapperEl.classList.toggle(
      'split-pane-primary',
      isPrimary && isSplitView
    );

    tab.wrapperEl.classList.toggle(
      'split-pane-secondary',
      isSecondary
    );

  });

  updateSplitViewButtonState();

}

function toggleSplitView() {

  if (isSplitView) {

    isSplitView = false;
    splitSecondaryTabId = null;
    updateVisibleWebviews();
    return;

  }

  if (!activeTabId) {
    return;
  }

  if (tabs.length < 2) {

    const newTab = createTab(
      DEFAULT_TAB_URL,
      { activate: false }
    );

    splitSecondaryTabId = newTab.id;

  }

  else {

    showSplitPicker();
    return;

  }

  isSplitView = Boolean(splitSecondaryTabId);
  updateVisibleWebviews();

}

function createSplitPicker() {

  const backdrop = document.createElement('div');

  backdrop.id = 'split-picker-backdrop';
  backdrop.className = 'tab-context-backdrop hidden';
  backdrop.addEventListener('pointerdown', hideSplitPicker);
  backdrop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    hideSplitPicker();
  });

  const menu = document.createElement('div');

  menu.id = 'split-picker-menu';
  menu.className = 'tab-context-menu split-picker-menu hidden';

  menu.addEventListener('click', (e) => {

    const item = e.target.closest('.split-picker-item');

    if (!item) {
      return;
    }

    splitSecondaryTabId = item.dataset.tabId;
    isSplitView = Boolean(splitSecondaryTabId);
    hideSplitPicker();
    updateVisibleWebviews();

  });

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);

  splitPickerBackdrop = backdrop;

  return menu;

}

function hideSplitPicker() {

  if (!splitPickerMenu) {
    return;
  }

  splitPickerMenu.classList.add('hidden');
  splitPickerBackdrop?.classList.add('hidden');

}

function showSplitPicker() {

  splitPickerMenu ||= createSplitPicker();

  const candidates = tabs.filter(tab => tab.id !== activeTabId);

  if (candidates.length === 0) {
    return;
  }

  splitPickerMenu.innerHTML = candidates.map(tab => `
    <button type="button" class="tab-context-menu-item split-picker-item" data-tab-id="${tab.id}">
      <img src="${tab.faviconImg.src || DEFAULT_FAVICON}" alt="" class="split-picker-favicon">
      <span>${escapeHtml(tab.titleSpan.textContent || 'New Tab')}</span>
    </button>
  `).join('');

  const rect = splitViewBtn.getBoundingClientRect();

  splitPickerMenu.classList.remove('hidden');
  splitPickerBackdrop?.classList.remove('hidden');

  const { width, height } = splitPickerMenu.getBoundingClientRect();
  const left = Math.min(rect.left, window.innerWidth - width - 8);
  const top = Math.min(rect.bottom + 8, window.innerHeight - height - 8);

  splitPickerMenu.style.left = `${Math.max(8, left)}px`;
  splitPickerMenu.style.top = `${Math.max(8, top)}px`;

}
// FIN DE SPLIT VIEW

function updateTabStateStyles(tab) {

  tab.tabEl.classList.toggle('is-pinned', Boolean(tab.pinned));
  tab.tabEl.classList.toggle('is-favorite', Boolean(tab.favorite));

  const pinLabel = tab.pinned ? 'Soltar tab' : 'Fijar tab';
  const favoriteLabel = tab.favorite ? 'Ya esta en favoritos' : 'Agregar a favoritos';

  tab.tabEl.title = `${tab.titleSpan.textContent || 'New Tab'} - ${pinLabel}, ${favoriteLabel}`;

}

function renderTabLists() {

  const favoriteTabs = tabs.filter(tab => tab.favorite);
  const regularTabs = tabs.filter(tab => !tab.favorite);

  const sortedRegularTabs = [
    ...regularTabs.filter(tab => tab.pinned),
    ...regularTabs.filter(tab => !tab.pinned)
  ];

  favoriteTabs.forEach(tab => {
    favoritesContainer.appendChild(tab.tabEl);
  });

  sortedRegularTabs.forEach(tab => {
    tabsContainer.appendChild(tab.tabEl);
  });

}

function orderTabsForPinnedState(tab) {

  const currentIndex = tabs.findIndex(item => item.id === tab.id);

  if (currentIndex === -1) {
    return;
  }

  tabs.splice(currentIndex, 1);

  if (tab.pinned) {

    const firstUnpinnedIndex = tabs.findIndex(item => !item.pinned);
    const nextIndex = firstUnpinnedIndex === -1
      ? tabs.length
      : firstUnpinnedIndex;

    tabs.splice(nextIndex, 0, tab);

  }

  else {

    const lastPinnedIndex = tabs.reduce(
      (lastIndex, item, index) => item.pinned ? index : lastIndex,
      -1
    );

    tabs.splice(lastPinnedIndex + 1, 0, tab);

  }

  renderTabLists();

}

function togglePinnedTab(tabId) {

  const tab = getTabById(tabId);

  if (!tab || tab.favorite) {
    return;
  }

  tab.pinned = !tab.pinned;

  updateTabStateStyles(tab);
  orderTabsForPinnedState(tab);
  saveTabSession();

}

function duplicateTab(tabId) {

  const tab = getTabById(tabId);

  if (!tab) {
    return;
  }

  createTab(tab.url);

}

function getSavedFavorites() {

  try {

    const rawFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const favorites = JSON.parse(rawFavorites || '[]');

    return Array.isArray(favorites) ? favorites : [];

  }

  catch {
    return [];
  }

}

function isFavoriteUrl(url) {

  return getSavedFavorites().some(item => item.url === url);

}

function saveFavoriteTab(tabId) {

  const tab = getTabById(tabId);

  if (!tab) {
    return;
  }

  const title = tab.titleSpan.textContent || 'New Tab';
  const favorite = {
    url: tab.url,
    title,
    favicon: tab.faviconImg.src || DEFAULT_FAVICON
  };

  const favorites = getSavedFavorites();
  const existingIndex = favorites.findIndex(item => item.url === tab.url);

  if (existingIndex === -1) {
    favorites.push(favorite);
  }
  else {
    favorites[existingIndex] = favorite;
  }

  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify(favorites)
  );

  tab.favorite = true;
  tab.pinned = false;

  updateTabStateStyles(tab);
  renderTabLists();
  saveTabSession();

}

function removeFavoriteTab(tabId) {

  const tab = getTabById(tabId);

  if (!tab) {
    return;
  }

  const favorites = getSavedFavorites().filter(
    item => item.url !== tab.url
  );

  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify(favorites)
  );

  tab.favorite = false;

  updateTabStateStyles(tab);
  renderTabLists();
  saveTabSession();

}

function createTabContextMenu() {

  const backdrop = document.createElement('div');

  backdrop.id = 'tab-context-backdrop';
  backdrop.className = 'tab-context-backdrop hidden';
  backdrop.addEventListener('pointerdown', hideTabContextMenu);
  backdrop.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    hideTabContextMenu();
  });

  const menu = document.createElement('div');

  menu.id = 'tab-context-menu';
  menu.className = 'tab-context-menu hidden';
  menu.innerHTML = `
    <button type="button" class="tab-context-menu-item" data-action="pin">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
        <path d="M12 17v5" />
        <path d="M5 17h14" />
        <path d="M8 3h8l-1 9 4 5H5l4-5L8 3z" />
      </svg>
      <span>Fijar tab</span>
    </button>
    <button type="button" class="tab-context-menu-item" data-action="duplicate">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
      </svg>
      <span>Duplicar tab</span>
    </button>
    <button type="button" class="tab-context-menu-item" data-action="favorite">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
        <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span>Agregar a favoritos</span>
    </button>
  `;

  menu.addEventListener('click', (e) => {

    const item = e.target.closest('.tab-context-menu-item');

    if (!item || !contextMenuTabId) {
      return;
    }

    const action = item.dataset.action;

    if (action === 'pin') {
      togglePinnedTab(contextMenuTabId);
    }

    else if (action === 'duplicate') {
      duplicateTab(contextMenuTabId);
    }

    else if (action === 'favorite') {

      const tab = getTabById(contextMenuTabId);

      if (tab?.favorite) {
        removeFavoriteTab(contextMenuTabId);
      }

      else {
        saveFavoriteTab(contextMenuTabId);
      }

    }

    hideTabContextMenu();

  });

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);

  tabContextBackdrop = backdrop;

  return menu;

}

function hideTabContextMenu() {

  if (!tabContextMenu) {
    return;
  }

  tabContextMenu.classList.add('hidden');
  tabContextBackdrop?.classList.add('hidden');
  contextMenuTabId = null;

}

function showTabContextMenu(tab, x, y) {

  tabContextMenu ||= createTabContextMenu();
  contextMenuTabId = tab.id;

  const pinLabel = tab.pinned ? 'Soltar tab' : 'Fijar tab';
  const favoriteLabel = tab.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos';

  tabContextMenu.querySelector('[data-action="pin"] span').textContent = pinLabel;
  tabContextMenu.querySelector('[data-action="pin"]').disabled = Boolean(tab.favorite);
  tabContextMenu.querySelector('[data-action="favorite"] span').textContent = favoriteLabel;
  tabContextMenu.querySelector('[data-action="favorite"]').disabled = false;

  tabContextMenu.classList.remove('hidden');
  tabContextBackdrop?.classList.remove('hidden');

  const { width, height } = tabContextMenu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - height - 8);

  tabContextMenu.style.left = `${Math.max(8, left)}px`;
  tabContextMenu.style.top = `${Math.max(8, top)}px`;

}

function handlePointerOutsideTabContextMenu(e) {

  if (
    tabContextMenu &&
    !tabContextMenu.classList.contains('hidden') &&
    !tabContextMenu.contains(e.target)
  ) {
    hideTabContextMenu();
  }

}

document.addEventListener('pointerdown', handlePointerOutsideTabContextMenu, true);
document.addEventListener('contextmenu', handlePointerOutsideTabContextMenu, true);

document.addEventListener('keydown', (e) => {

  if (e.key === 'Escape') {
    hideTabContextMenu();
    hideSplitPicker();
  }

});
// FIN DE MENU CONTEXTUAL DE PESTANAS

// INICIO DE CREACION Y RESTAURACION DE PESTANAS
function createTab(
  url = DEFAULT_TAB_URL,
  options = {}
) {

  const tabId =
    'tab-' +
    Date.now() +
    '-' +
    Math.random().toString(36).slice(2, 9);

  // TAB BUTTON

  const tabEl = document.createElement('div');

  tabEl.id = tabId;

  tabEl.className =
    'tab group w-full rounded-xl flex items-center px-1 py-1 gap-3 text-xs cursor-pointer transition-all duration-300 relative border border-transparent bg-transparent text-[#868686] hover:bg-[#868686]/10 [-webkit-app-region:no-drag]';

  // FAVICON

  const faviconImg = document.createElement('img');

  faviconImg.className =
    'shrink-0 w-4 h-4 object-contain';

  faviconImg.src = options.favicon || DEFAULT_FAVICON;

  tabEl.appendChild(faviconImg);

  // TITLE

  const titleSpan = document.createElement('span');

  titleSpan.className =
    'tab-title whitespace-nowrap overflow-hidden text-ellipsis flex-1 font-medium';

  titleSpan.textContent = options.title || 'New Tab';

  tabEl.appendChild(titleSpan);

  // CLOSE BUTTON

  const closeTabBtn = document.createElement('button');

  closeTabBtn.className =
    'close-tab opacity-0 group-hover:opacity-100 hover:bg-[#FF242C]/90 hover:text-white rounded-lg flex items-center justify-center transition-opacity';

  closeTabBtn.title = 'Close tab';

  closeTabBtn.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="10"
      stroke="currentColor"
      stroke-width="2.5"
      fill="none"
      class="w-4 h-4 m-0.5"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  `;

  closeTabBtn.addEventListener('click', (e) => {

    e.stopPropagation();

    closeTab(tabId);

  });

  tabEl.appendChild(closeTabBtn);

  // LOADING BORDER ANIMATION

  const tabLoadingBorder = document.createElement('div');

  tabLoadingBorder.className =
    'absolute inset-0 rounded-xl pointer-events-none overflow-hidden';

  tabLoadingBorder.style.display = 'none';

  // Create the rotating gradient border effect
  const gradientRing = document.createElement('div');
  gradientRing.className = 'absolute inset-0 rounded-xl';
  gradientRing.style.background = 'conic-gradient(from 0deg, transparent, #F83B66, transparent, #0A77F3, transparent)';
  gradientRing.style.animation = 'spin 1.5s linear infinite';
  gradientRing.style.padding = '2px';
  gradientRing.style.mask = 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)';
  gradientRing.style.maskComposite = 'exclude';
  gradientRing.style.webkitMaskComposite = 'xor';

  tabLoadingBorder.appendChild(gradientRing);
  tabEl.appendChild(tabLoadingBorder);

  // Add CSS animation for spinning effect
  if (!document.getElementById('loading-border-style')) {
    const style = document.createElement('style');
    style.id = 'loading-border-style';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  tabEl.addEventListener('click', () => {

    hideTabContextMenu();
    switchTab(tabId);

  });

  tabsContainer.appendChild(tabEl);

  // WEBVIEW WRAPPER

  const wrapperEl = document.createElement('div');

  wrapperEl.id = `wrapper-${tabId}`;

  wrapperEl.className =
    'w-full h-full rounded-2xl overflow-hidden border-[2px] border-[#868686]/10 bg-[#f5f5f5] relative isolate hidden';

  const webviewEl = document.createElement('webview');

  webviewEl.id = `webview-${tabId}`;

  webviewEl.src = url;

  webviewEl.className = 'w-full h-full';

  webviewEl.setAttribute('allowpopups', '');

  webviewEl.setAttribute(
    'partition',
    'persist:webcontent'
  );

  wrapperEl.appendChild(webviewEl);

  webviewsContainer.appendChild(wrapperEl);

  const tabObj = {
    id: tabId,
    tabEl,
    faviconImg,
    titleSpan,
    tabLoadingBorder,
    wrapperEl,
    webviewEl,
    url,
    pinned: Boolean(options.pinned),
    favorite: Boolean(options.favorite) || isFavoriteUrl(url)
  };

  tabs.push(tabObj);

  updateTabStateStyles(tabObj);
  renderTabLists();

  tabEl.addEventListener('contextmenu', (e) => {

    e.preventDefault();
    e.stopPropagation();

    showTabContextMenu(tabObj, e.clientX, e.clientY);

  });

  setupWebviewEvents(tabObj);

  if (options.activate !== false) {
    switchTab(tabId);
  }
  else {
    saveTabSession();
  }

  return tabObj;

}

function switchTab(tabId) {

  const targetTab = tabs.find(
    tab => tab.id === tabId
  );

  if (!targetTab) {
    return;
  }

  const previousActiveTabId = activeTabId;

  activeTabId = tabId;

  if (
    isSplitView &&
    previousActiveTabId &&
    previousActiveTabId !== tabId &&
    tabs.some(tab => tab.id === previousActiveTabId)
  ) {
    splitSecondaryTabId = previousActiveTabId;
  }

  tabs.forEach(tab => {

    const isActive = tab.id === tabId;

    tab.tabEl.className = isActive
      ? 'tab active group w-full rounded-xl flex items-center px-1 py-1 gap-3 text-xs cursor-pointer transition-all duration-300 relative border border-[#3d3d3d]/10 [-webkit-app-region:no-drag] bg-white text-[#1d1d1d]'
      : 'tab group w-full rounded-xl flex items-center px-1 py-1 gap-3 text-xs cursor-pointer transition-all duration-300 relative border border-transparent text-[#868686] hover:bg-[#868686]/10 [-webkit-app-region:no-drag]';

    updateTabStateStyles(tab);

  });

  updateVisibleWebviews();

  if (SIDEBAR_STATES[currentSidebarState] === 'icons-only') {
    applySidebarState('icons-only');
  }

  syncUrl(targetTab.url);

  document.title =
    `${targetTab.titleSpan.textContent} - Digi Browser`;

  targetTab.tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveTabSession();

}

function closeTab(tabId) {

  const index = tabs.findIndex(
    tab => tab.id === tabId
  );

  if (index === -1) {
    return;
  }

  const tab = tabs[index];

  tab.tabEl.remove();
  tab.wrapperEl.remove();

  tabs.splice(index, 1);

  if (activeTabId !== tabId) {

    if (splitSecondaryTabId === tabId) {
      splitSecondaryTabId = getNextTabForSplit(activeTabId)?.id || null;
    }

    updateVisibleWebviews();
    saveTabSession();
    return;
  }

  if (tabs.length === 0) {

    createTab();

    return;

  }

  const nextIndex = Math.min(
    index,
    tabs.length - 1
  );

  switchTab(tabs[nextIndex].id);

}

// FIN DE CREACION Y RESTAURACION DE PESTANAS

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

const SIDEBAR_STATES = [
  'expanded',
  'icons-only',
  'hidden'
];

let currentSidebarState = 0;

function applySidebarState(state) {

  sidebar.classList.remove(
    'w-[165px]',
    'w-8',
    'w-0',
    'h-full',
    'pl-2',
    'pl-0',
    'opacity-0',
    'pointer-events-none'
  );

  if (state === 'expanded') {

    sidebar.classList.add(
      'w-[165px]',
      'h-full',
      'pl-0',
      'ml-1'
    );

  }

  else if (state === 'icons-only') {

    sidebar.classList.add(
      'w-8',
      'h-full',
      'pl-0',
      'ml-1'
    );

  }

  else {

    sidebar.classList.add(
      'w-0',
      'pl-0',
      'opacity-0',
      'pointer-events-none'
    );

  }

  hoverZone.classList.toggle(
    'hidden',
    state !== 'hidden'
  );

  const iconsOnly =
    state === 'icons-only';

  sidebar.querySelectorAll(
    '.tab-title, .close-tab'
  ).forEach(el => {

    el.classList.toggle(
      'hidden',
      iconsOnly
    );

  });

  sidebar.querySelectorAll('.tab').forEach(tab => {

    tab.classList.toggle(
      'justify-center',
      iconsOnly
    );

    tab.classList.toggle(
      'p-1',
      iconsOnly
    );

    tab.classList.toggle(
      'w-8',
      iconsOnly
    );

    tab.classList.toggle(
      'h-8',
      iconsOnly
    );


    const img = tab.querySelector('img');

    if (img) {

      img.classList.toggle(
        'ml-0',
        iconsOnly
      );

    }

  });

  const newTabSpan =
    newTabBtn.querySelector('span');

  newTabSpan?.classList.toggle(
    'hidden',
    iconsOnly
  );

  newTabBtn.classList.toggle(
    'justify-center',
    iconsOnly
  );

  newTabBtn.classList.toggle(
    'p-1',
    iconsOnly
  );

  newTabBtn.classList.toggle(
    'w-8',
    iconsOnly
  );

  newTabBtn.classList.toggle(
    'h-8',
    iconsOnly
  );

  if (toggleSidebarIcon) {

    if (state === 'expanded') {

      toggleSidebarIcon.style.transform =
        'rotate(0deg)';

    }

    else if (state === 'icons-only') {

      toggleSidebarIcon.style.transform =
        'rotate(-90deg)';

    }

    else {

      toggleSidebarIcon.style.transform =
        'rotate(180deg)';

    }

  }

}

toggleSidebarBtn?.addEventListener('click', () => {

  currentSidebarState =
    (currentSidebarState + 1) %
    SIDEBAR_STATES.length;

  applySidebarState(
    SIDEBAR_STATES[currentSidebarState]
  );

});

// FLOATING SIDEBAR

const FLOATING_CLASSES = [
  'is-floating',
  'absolute',
  'left-0',
  'top-0',
  'z-40',
  'w-40',
  'h-full',
  'opacity-100',
  'pointer-events-auto',
  'px-2',
  'py-3',
  'shadow-[4px_0_24px_rgba(0,0,0,0.12)]',
  'bg-white/70',
  'backdrop-blur-md',
  'rounded-r-2xl',
  'border-r',
  'border-black/5'
];

let floatingTimeout = null;
let closeTimeout = null;

function closeFloatingSidebar() {

  if (
    !sidebar.classList.contains(
      'is-floating'
    )
  ) {
    return;
  }

  sidebar.classList.remove(
    ...FLOATING_CLASSES
  );

  sidebar.classList.add(
    'w-0',
    'pl-0',
    'opacity-0',
    'pointer-events-none'
  );

  if (floatingTimeout) {
    clearTimeout(floatingTimeout);
    floatingTimeout = null;
  }

  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }

}

hoverZone?.addEventListener('mouseenter', () => {

  if (
    SIDEBAR_STATES[currentSidebarState] !==
    'hidden'
  ) {
    return;
  }

  if (floatingTimeout) {
    clearTimeout(floatingTimeout);
  }
  
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }

  sidebar.classList.remove(
    'w-0',
    'pl-0',
    'opacity-0',
    'pointer-events-none'
  );

  sidebar.classList.add(
    ...FLOATING_CLASSES
  );

  // Close sidebar if mouse doesn't enter it within 800ms
  floatingTimeout = setTimeout(() => {
    closeFloatingSidebar();
  }, 800);

});

sidebar?.addEventListener('mouseenter', () => {

  if (
    !sidebar.classList.contains(
      'is-floating'
    )
  ) {
    return;
  }

  // Clear timeouts since user successfully hovered inside the sidebar!
  if (floatingTimeout) {
    clearTimeout(floatingTimeout);
    floatingTimeout = null;
  }

  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }

});

sidebar?.addEventListener('mouseleave', () => {

  if (
    !sidebar.classList.contains(
      'is-floating'
    )
  ) {
    return;
  }

  // Accidental leave buffer of 400ms
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }
  
  closeTimeout = setTimeout(() => {
    closeFloatingSidebar();
  }, 400);

});

// ─────────────────────────────────────────────
// WINDOW STATE
// ─────────────────────────────────────────────

if (
  appContainer &&
  window.browserAPI?.onWindowState
) {

  window.browserAPI.onWindowState(
    (state) => {

      if (state === 'maximized') {

        appContainer.classList.remove(
          'rounded-2xl'
        );

        appContainer.classList.add(
          'rounded-none'
        );

      }

      else {

        appContainer.classList.remove(
          'rounded-none'
        );

        appContainer.classList.add(
          'rounded-2xl'
        );

      }

    }
  );

}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

newTabBtn?.addEventListener('click', () => {
  createTab();
});

window.browserAPI?.onOpenNewTab?.((url) => {
  createTab(url);
});

// INICIO DE GUARDADO Y RESTAURACION DE PESTANAS AL ABRIR/CERRAR
window.addEventListener('beforeunload', saveTabSession);

applySidebarState('expanded');

restoreTabs();
// FIN DE GUARDADO Y RESTAURACION DE PESTANAS AL ABRIR/CERRAR
