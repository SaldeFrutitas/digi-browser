const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');

const addressInput = document.getElementById('address-input');
const securityIcon = document.getElementById('security-icon');
const addressWrapper = document.querySelector('.address-bar-wrapper');
const copylinkBtn = document.getElementById('copylink-btn');

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

minBtn?.addEventListener('click', () => {
  window.browserAPI.windowMinimize();
});

maxBtn?.addEventListener('click', () => {
  window.browserAPI.windowMaximize();
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

const WEBVIEW_SCROLLBAR_CSS = `
  ::-webkit-scrollbar {
    width: 8px !important;
    background: white !important;
  }

  ::-webkit-scrollbar-track {
    background: white !important;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 9999px !important;
    background: rgba(134, 134, 134, 0.45) !important;

    /* thinner thumb */
    border: 2px solid white !important;
    background-clip: content-box !important;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(134, 134, 134, 0.65) !important;
    background-clip: content-box !important;
  }
`;

function setupWebviewEvents(tab) {

  const wv = tab.webviewEl;

  wv.addEventListener('dom-ready', () => {
    wv.insertCSS(WEBVIEW_SCROLLBAR_CSS).catch(() => {});
  });

  wv.addEventListener('did-start-navigation', (e) => {

    if (!e.isMainFrame) {
      return;
    }

    tab.url = e.url;

    tab.faviconImg.src = DEFAULT_FAVICON;

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });

  wv.addEventListener('did-navigate', (e) => {

    tab.url = e.url;

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });

  wv.addEventListener('did-navigate-in-page', (e) => {

    if (!e.isMainFrame) {
      return;
    }

    tab.url = e.url;

    if (tab.id === activeTabId) {

      syncUrl(e.url);

    }

  });

  wv.addEventListener('did-start-loading', () => {

    tab.tabLoadingBar.style.display = 'block';

  });

  wv.addEventListener('did-stop-loading', () => {

    tab.tabLoadingBar.style.display = 'none';

  });

  wv.addEventListener('page-title-updated', (e) => {

    const safeTitle = e.title || 'New Tab';

    tab.titleSpan.textContent = safeTitle;

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

    }

  });

  wv.addEventListener('new-window', (e) => {

    e.preventDefault();

    if (e.url) {
      createTab(e.url);
    }

  });

}

function createTab(
  url = 'https://www.digiapps.com.co'
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

  faviconImg.src = DEFAULT_FAVICON;

  tabEl.appendChild(faviconImg);

  // TITLE

  const titleSpan = document.createElement('span');

  titleSpan.className =
    'tab-title whitespace-nowrap overflow-hidden text-ellipsis flex-1 font-medium';

  titleSpan.textContent = 'New Tab';

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

  // LOADING BAR

  const tabLoadingBar = document.createElement('div');

  tabLoadingBar.className =
    'absolute bottom-0 left-0 h-0.5 bg-[#F83B66] animate-pulse w-full rounded-b-lg';

  tabLoadingBar.style.display = 'none';

  tabEl.appendChild(tabLoadingBar);

  tabEl.addEventListener('click', () => {

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
    tabLoadingBar,
    wrapperEl,
    webviewEl,
    url
  };

  tabs.push(tabObj);

  setupWebviewEvents(tabObj);

  switchTab(tabId);

  return tabObj;

}

function switchTab(tabId) {

  const targetTab = tabs.find(
    tab => tab.id === tabId
  );

  if (!targetTab) {
    return;
  }

  activeTabId = tabId;

  tabs.forEach(tab => {

    const isActive = tab.id === tabId;

    tab.tabEl.className = isActive
      ? 'tab active group w-full rounded-xl flex items-center px-1 py-1 gap-3 text-xs cursor-pointer transition-all duration-300 relative border border-[#3d3d3d]/10 [-webkit-app-region:no-drag] bg-white text-[#1d1d1d]'
      : 'tab group w-full rounded-xl flex items-center px-1 py-1 gap-3 text-xs cursor-pointer transition-all duration-300 relative border border-transparent text-[#868686] hover:bg-[#868686]/10 [-webkit-app-region:no-drag]';

    tab.wrapperEl.classList.toggle(
      'hidden',
      !isActive
    );

  });

  if (SIDEBAR_STATES[currentSidebarState] === 'icons-only') {
    applySidebarState('icons-only');
  }

  syncUrl(targetTab.url);

  document.title =
    `${targetTab.titleSpan.textContent} - Digi Browser`;

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
  'left-2',
  'top-2',
  'z-40',
  'w-40',
  'h-[calc(100%-16px)]',
  'opacity-100',
  'pointer-events-auto',
  'px-2',
  'py-3',
  'shadow-[0_10px_25px_-5px_rgba(248,59,102,0.4),0_8px_10px_-6px_rgba(248,59,102,0.4)]',
  'bg-brand',
  'rounded-2xl',
  'border',
  'border-white/15'
];

hoverZone?.addEventListener('mouseenter', () => {

  if (
    SIDEBAR_STATES[currentSidebarState] !==
    'hidden'
  ) {

    return;

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

});

sidebar?.addEventListener('mouseleave', () => {

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

applySidebarState('expanded');

createTab();
