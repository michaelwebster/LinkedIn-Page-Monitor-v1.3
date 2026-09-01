'use strict';

const POSTS_URL = 'https://www.linkedin.com/company/franchise-info-sponsored/posts/?feedView=all&viewAsMember=true';
const COMPANY_SLUG = 'franchise-info-sponsored';
const ALARM_NAME = 'fi-check-company-posts';
const CHECK_INTERVAL_MINUTES = 10;
const DETECTOR_VERSION = 3;

function collectIds(text) {
  const ids = new Set();
  const patterns = [
    /urn:li:activity:(\d{10,})/g,
    /activity%3A(\d{10,})/g,
    /urn:li:share:(\d{10,})/g,
    /share%3A(\d{10,})/g,
    /urn:li:ugcPost:(\d{10,})/g,
    /ugcPost%3A(\d{10,})/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) ids.add(match[1]);
  }
  return ids;
}

function newestId(ids) {
  if (!ids || !ids.size) return null;
  return [...ids].sort((a, b) => {
    const aa = BigInt(a);
    const bb = BigInt(b);
    return aa > bb ? -1 : aa < bb ? 1 : 0;
  })[0];
}

function newestCompanyActivityId(html) {
  const lower = html.toLowerCase();
  const slug = COMPANY_SLUG.toLowerCase();
  const companyIds = new Set();
  let from = 0;
  while (true) {
    const index = lower.indexOf(slug, from);
    if (index === -1) break;
    const start = Math.max(0, index - 16000);
    const end = Math.min(html.length, index + 32000);
    for (const id of collectIds(html.slice(start, end))) companyIds.add(id);
    from = index + slug.length;
  }
  return newestId(companyIds);
}

async function getNextCheckAt() {
  try {
    const alarm = await chrome.alarms.get(ALARM_NAME);
    return alarm && alarm.scheduledTime ? alarm.scheduledTime : 0;
  } catch (_) {
    return 0;
  }
}

async function setDiagnostic(status, extra = {}) {
  const fiNextCheckAt = await getNextCheckAt();
  await chrome.storage.local.set({
    fiLastCheckAt: Date.now(),
    fiLastCheckStatus: status,
    fiNextCheckAt,
    ...extra
  });
}

async function checkForNewPost() {
  try {
    const response = await fetch(POSTS_URL, {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
      headers: { 'Accept': 'text/html,application/xhtml+xml' }
    });

    const finalUrl = response.url || POSTS_URL;
    if (!response.ok) {
      await setDiagnostic(`Background HTTP ${response.status}`, { fiLastCheckUrl: finalUrl });
      return;
    }
    if (/\/login|\/checkpoint|authwall/i.test(finalUrl)) {
      await setDiagnostic('Background check returned login/checkpoint', { fiLastCheckUrl: finalUrl });
      return;
    }

    const html = await response.text();
    const latestId = newestCompanyActivityId(html);
    if (!latestId) {
      await setDiagnostic('Background check — no company activity in HTML', {
        fiLastCheckUrl: finalUrl,
        fiLastResponseBytes: html.length
      });
      return;
    }

    const state = await chrome.storage.local.get({
      fiLatestActivityId: null,
      fiHasNewPost: false,
      fiDetectorVersion: 0
    });

    if (state.fiDetectorVersion !== DETECTOR_VERSION || !state.fiLatestActivityId) {
      const fiNextCheckAt = await getNextCheckAt();
      await chrome.storage.local.set({
        fiDetectorVersion: DETECTOR_VERSION,
        fiLatestActivityId: latestId,
        fiLastCheckAt: Date.now(),
        fiLastCheckStatus: 'Background baseline established',
        fiLastCheckUrl: finalUrl,
        fiNextCheckAt
      });
      return;
    }

    if (BigInt(latestId) > BigInt(state.fiLatestActivityId)) {
      const fiNextCheckAt = await getNextCheckAt();
      await chrome.storage.local.set({
        fiLatestActivityId: latestId,
        fiHasNewPost: true,
        fiLastCheckAt: Date.now(),
        fiLastCheckStatus: 'Background check detected newer activity',
        fiLastCheckUrl: finalUrl,
        fiNextCheckAt
      });
    } else {
      await setDiagnostic('Background check — no newer activity', { fiLastCheckUrl: finalUrl });
    }
  } catch (error) {
    await setDiagnostic(`Background check failed: ${error && error.message ? error.message : String(error)}`);
    console.debug('LinkedIn Page Monitor background check skipped:', error);
  }
}

async function scheduleChecks() {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 1, periodInMinutes: CHECK_INTERVAL_MINUTES });
  const fiNextCheckAt = await getNextCheckAt();
  await chrome.storage.local.set({ fiNextCheckAt });
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleChecks();
  checkForNewPost();
});
chrome.runtime.onStartup.addListener(() => {
  scheduleChecks();
  checkForNewPost();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkForNewPost();
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'fi-check-now') {
    checkForNewPost().then(() => sendResponse({ ok: true }));
    return true;
  }
});
