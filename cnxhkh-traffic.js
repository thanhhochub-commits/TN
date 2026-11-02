/* LINK 1: analytics-only module. No quiz state, answer data or identifiers transmitted. */
(function () {
  'use strict';
  const BASE = 'https://countapi.mileshilliard.com/api/v1/hit/';
  const UNIQUE_KEY = 'tn_cnxhkh_20261102_unique_6b3c2f72';
  const VIEW_KEY = 'tn_cnxhkh_20261102_views_6b3c2f72';
  const LOCAL_MARK = 'tn_cnxhkh_traffic_seen_v1';
  function increment(key) {
    return fetch(BASE + encodeURIComponent(key), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    }).then(r => { if (!r.ok) throw new Error('counting unavailable'); return r.json(); });
  }
  // Count this page load once. Navigation inside the quiz SPA does not create a new hit.
  increment(VIEW_KEY).catch(() => {});
  try {
    if (localStorage.getItem(LOCAL_MARK) === '1') return;
    // Avoid parallel tabs causing duplicate unique counts while the request is pending.
    if (localStorage.getItem(LOCAL_MARK) === 'pending') return;
    localStorage.setItem(LOCAL_MARK, 'pending');
    increment(UNIQUE_KEY).then(() => {
      localStorage.setItem(LOCAL_MARK, '1');
    }).catch(() => {
      if (localStorage.getItem(LOCAL_MARK) === 'pending') localStorage.removeItem(LOCAL_MARK);
    });
  } catch (_) {
    // Storage-disabled browsers are not counted as unique browsers; quizzes still work.
  }
})();
