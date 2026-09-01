(() => {
  'use strict';

  const BUTTON_ID = 'fi-linkedin-toolbar-button';
  const TARGET_URL = 'https://www.linkedin.com/company/franchise-info-sponsored/posts/?feedView=all&viewAsMember=true';
  const COMPANY_SLUG = 'franchise-info-sponsored';
  const COMPANY_NAME = 'Franchise-Info LLC';
  const LOGO_URL = chrome.runtime.getURL('assets/toolbar-logo.png');

  let hasNewActivity = false;
  let stateLoaded = false;
  let lastCheckStatus = '';
  let lastCheckAt = 0;
  let nextCheckAt = 0;
  let lastSeenActivity = '';
  let domScanScheduled = false;

  function formatClock(value) {
    return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  }

  function applyNotificationState(item, value = hasNewActivity) {
    if (!item || !item.isConnected) return;
    const active = Boolean(value);
    item.classList.toggle('fi-has-new-post', active);
    item.dataset.fiNotificationState = active ? 'new' : 'clear';

    const link = item.querySelector('.fi-toolbar-link');
    if (link) {
      const age = lastCheckAt ? ` • last check ${formatClock(lastCheckAt)}` : '';
      const status = lastCheckStatus ? ` • ${lastCheckStatus}` : '';
      const next = nextCheckAt ? ` • next check ${formatClock(nextCheckAt)}` : '';
      const seen = lastSeenActivity ? ` • last seen ${lastSeenActivity}` : '';
      link.title = active
        ? `Franchise-Info — new post or repost${age}${status}${next}${seen}`
        : `Franchise-Info${age}${status}${next}${seen}`;
      link.setAttribute(
        'aria-label',
        active
          ? 'Open Franchise-Info Sponsored — new post or repost available'
          : 'Open Franchise-Info Sponsored'
      );
    }
  }

  async function loadNotificationState() {
    try {
      const state = await chrome.storage.local.get({
        fiHasNewPost: false,
        fiLastCheckStatus: '',
        fiLastCheckAt: 0,
        fiNextCheckAt: 0,
        fiLastSeenActivity: ''
      });
      hasNewActivity = Boolean(state.fiHasNewPost);
      lastCheckStatus = state.fiLastCheckStatus || '';
      lastCheckAt = state.fiLastCheckAt || 0;
      nextCheckAt = state.fiNextCheckAt || 0;
      lastSeenActivity = state.fiLastSeenActivity || '';
      stateLoaded = true;
      applyNotificationState(document.getElementById(BUTTON_ID));
    } catch (error) {
      console.debug('LinkedIn Page Monitor state load skipped:', error);
    }
  }

  function createButton() {
    const item = document.createElement('li');
    item.id = BUTTON_ID;
    item.className = 'fi-toolbar-item';
    item.dataset.fiOwned = 'true';

    const link = document.createElement('a');
    link.className = 'fi-toolbar-link';
    link.href = TARGET_URL;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'fi-toolbar-icon-wrap';

    const img = document.createElement('img');
    img.className = 'fi-toolbar-logo';
    img.src = LOGO_URL;
    img.alt = '';

    iconWrap.appendChild(img);

    const label = document.createElement('span');
    label.className = 'fi-toolbar-label';
    label.textContent = 'Franchise-Info';

    link.append(iconWrap, label);
    item.appendChild(link);
    applyNotificationState(item);

    link.addEventListener('click', () => {
      hasNewActivity = false;
      applyNotificationState(item, false);
      chrome.storage.local.set({ fiHasNewPost: false });
      try { chrome.runtime.sendMessage({ type: 'fi-check-now' }); } catch (_) {}
    });

    return item;
  }

  function findToolbar() {
    const selectors = [
      'ul.global-nav__primary-items',
      '.global-nav__primary-items',
      'header nav ul',
      'nav[aria-label*="Primary"] ul',
      'nav[aria-label*="Global"] ul'
    ];

    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        if (node.offsetParent !== null) return node;
      }
    }
    return null;
  }

  function ensureButton() {
    const toolbar = findToolbar();
    if (!toolbar) return;

    const existing = document.getElementById(BUTTON_ID);
    if (existing && existing.parentElement === toolbar && existing.isConnected) {
      applyNotificationState(existing);
      return;
    }

    if (existing) existing.remove();
    toolbar.appendChild(createButton());
    if (!stateLoaded) loadNotificationState();
  }

  function isCompanyPostsPage() {
    return location.pathname.includes(`/company/${COMPANY_SLUG}/posts`);
  }

  function companyHref(link) {
    if (!link) return false;
    try {
      return new URL(link.href, location.href).pathname.includes(`/company/${COMPANY_SLUG}`);
    } catch (_) {
      return false;
    }
  }

  function closestPostContainer(node) {
    if (!node) return null;
    return node.closest('[data-urn], .feed-shared-update-v2, .occludable-update, article') || node.parentElement;
  }

  function stablePostId(container) {
    if (!container) return '';
    const values = [
      container.getAttribute('data-urn'),
      container.dataset ? container.dataset.urn : '',
      container.getAttribute('data-id')
    ].filter(Boolean);

    for (const value of values) {
      const match = String(value).match(/(?:activity|share|ugcPost)[:%3A]+(\d{10,})/i);
      if (match) return `${match[1]}`;
      if (value) return String(value);
    }
    return '';
  }

  function actorName(container) {
    if (!container) return '';

    // Prefer the visible actor name only. LinkedIn's title wrapper can also
    // contain Premium / connection-degree text, so avoid reading the whole
    // wrapper when a name span is available.
    const name = container.querySelector('.update-components-actor__title span[dir="ltr"]');
    if (name) return name.textContent.replace(/\s+/g, ' ').trim();

    const meta = container.querySelector('.update-components-actor__meta-link');
    if (meta) {
      const aria = meta.getAttribute('aria-label') || '';
      const match = aria.match(/^View:\s*([^•]+?)(?:\s+Premium)?\s*(?:•|$)/i);
      if (match) return match[1].replace(/\s+/g, ' ').trim();
    }

    const title = container.querySelector('.update-components-actor__title');
    return title ? title.textContent.replace(/\s+/g, ' ').trim().replace(/\s+Premium(?:\s*•.*)?$/i, '') : '';
  }

  function timeLabel(container) {
    const sub = container && container.querySelector('.update-components-actor__sub-description');
    return sub ? sub.textContent.replace(/\s+/g, ' ').trim().replace(/\s*•.*$/, '') : '';
  }

  function activityFingerprint(activity) {
    if (activity.id) return `${activity.type}:${activity.id}`;
    return [activity.type, activity.actor, activity.time, activity.sourceText]
      .map(value => (value || '').replace(/\s+/g, ' ').trim().slice(0, 160))
      .join('|');
  }

  function findRenderedActivities() {
    const activities = [];
    const seen = new Set();

    // Reposts: LinkedIn places the reposting company in the header while the
    // main actor remains the original author. This is the structure supplied
    // from the 10:44 Franchise-Info repost.
    for (const header of document.querySelectorAll('.update-components-header__text-view')) {
      const text = header.textContent.replace(/\s+/g, ' ').trim();
      if (!/reposted this/i.test(text)) continue;
      const wrapper = header.closest('.update-components-header') || header.parentElement;
      const companyLink = wrapper && [...wrapper.querySelectorAll('a[href]')].find(companyHref);
      if (!companyLink) continue;

      const container = closestPostContainer(header);
      const activity = {
        type: 'repost',
        id: stablePostId(container),
        actor: actorName(container),
        time: timeLabel(container),
        sourceText: text
      };
      const fp = activityFingerprint(activity);
      if (!seen.has(fp)) {
        seen.add(fp);
        activities.push(activity);
      }
    }

    // Original company posts: the main actor points to the monitored company.
    for (const actorLink of document.querySelectorAll('.update-components-actor__meta-link[href], .update-components-actor__image[href]')) {
      if (!companyHref(actorLink)) continue;
      const container = closestPostContainer(actorLink);
      if (!container) continue;
      const activity = {
        type: 'post',
        id: stablePostId(container),
        actor: COMPANY_NAME,
        time: timeLabel(container),
        sourceText: actorLink.textContent.replace(/\s+/g, ' ').trim()
      };
      const fp = activityFingerprint(activity);
      if (!seen.has(fp)) {
        seen.add(fp);
        activities.push(activity);
      }
    }

    return activities;
  }

  async function scanRenderedCompanyFeed() {
    const onCompanyPage = isCompanyPostsPage();
    const activities = findRenderedActivities();
    if (!activities.length) {
      if (onCompanyPage) {
        await chrome.storage.local.set({
          fiLastCheckAt: Date.now(),
          fiLastCheckStatus: 'Rendered feed open — no company activity found'
        });
      }
      return;
    }

    // LinkedIn renders the company feed newest-first, so the first matching card
    // is treated as the current visible activity.
    const latest = activities[0];
    const fingerprint = activityFingerprint(latest);
    const description = `${latest.type === 'repost' ? 'repost' : 'post'}${latest.actor && latest.actor !== COMPANY_NAME ? ` · ${latest.actor}` : ''}${latest.time ? ` · ${latest.time}` : ''}`;
    const state = await chrome.storage.local.get({
      fiDomLatestFingerprint: '',
      fiHasNewPost: false,
      fiDomDetectorVersion: 0
    });

    // Relevant Franchise-Info cards can also appear in LinkedIn's Home feed.
    // Use those cards to enrich an existing notification with human-readable
    // details (for example "repost · Fred Copestake · 1d") without treating
    // feed ordering as authoritative evidence of a new company-page event.
    if (!onCompanyPage) {
      if (state.fiHasNewPost) {
        await chrome.storage.local.set({ fiLastSeenActivity: description });
      }
      return;
    }

    const base = {
      fiDomDetectorVersion: 1,
      fiDomLatestFingerprint: fingerprint,
      fiLastCheckAt: Date.now(),
      fiLastCheckStatus: `Rendered feed — ${activities.length} company ${activities.length === 1 ? 'activity' : 'activities'} found`,
      fiLastSeenActivity: description
    };

    // First rendered scan establishes a DOM baseline. Subsequent changes are
    // authoritative and raise the toolbar notification.
    if (state.fiDomDetectorVersion !== 1 || !state.fiDomLatestFingerprint) {
      await chrome.storage.local.set({ ...base, fiHasNewPost: state.fiHasNewPost });
      return;
    }

    if (fingerprint !== state.fiDomLatestFingerprint) {
      await chrome.storage.local.set({ ...base, fiHasNewPost: true });
    } else {
      await chrome.storage.local.set(base);
    }
  }

  function scheduleDomScan() {
    if (domScanScheduled) return;
    domScanScheduled = true;
    setTimeout(() => {
      domScanScheduled = false;
      scanRenderedCompanyFeed().catch(error => console.debug('LinkedIn Page Monitor DOM scan skipped:', error));
    }, 700);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.fiHasNewPost) hasNewActivity = Boolean(changes.fiHasNewPost.newValue);
    if (changes.fiLastCheckStatus) lastCheckStatus = changes.fiLastCheckStatus.newValue || '';
    if (changes.fiLastCheckAt) lastCheckAt = changes.fiLastCheckAt.newValue || 0;
    if (changes.fiNextCheckAt) nextCheckAt = changes.fiNextCheckAt.newValue || 0;
    if (changes.fiLastSeenActivity) lastSeenActivity = changes.fiLastSeenActivity.newValue || '';
    stateLoaded = true;
    applyNotificationState(document.getElementById(BUTTON_ID));
  });

  loadNotificationState();
  ensureButton();
  scheduleDomScan();

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        ensureButton();
      });
    }
    scheduleDomScan();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    ensureButton();
    scheduleDomScan();
  }, 1500);
})();
