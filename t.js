// ISSUE-267 匿名流量追蹤：進站、按鈕點擊、離開時停留秒數與捲動深度
// 收集端：lineshop/card_analytics/worker.js
(function () {
  var END = 'https://card-analytics.jjahao.workers.dev/e';
  var ls = {};
  try { ls = window.localStorage; } catch (e) { ls = null; }
  function get(k) { try { return ls && ls.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { ls && ls.setItem(k, v); } catch (e) {} }

  var q = new URLSearchParams(location.search);
  if (q.get('notrack') === '1') set('ca_notrack', '1');
  if (q.get('notrack') === '0') set('ca_notrack', '');
  if (get('ca_notrack') === '1') return;

  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  var vid = get('ca_vid');
  var isNew = !vid;
  if (!vid) { vid = rid(); set('ca_vid', vid); }
  var sid = rid();
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');

  function send(o) {
    o.v = vid; o.s = sid; o.p = page;
    var body = JSON.stringify(o);
    if (navigator.sendBeacon && navigator.sendBeacon(END, new Blob([body], { type: 'text/plain' }))) return;
    try { fetch(END, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  send({ t: 'pv', n: isNew, r: document.referrer, us: q.get('utm_source'), um: q.get('utm_medium'), uc: q.get('utm_campaign') });

  // 只算畫面真的在前景的時間
  var active = 0, since = document.visibilityState === 'visible' ? Date.now() : 0, maxScroll = 0;
  function tick() { if (since) { active += Date.now() - since; since = Date.now(); } }
  window.addEventListener('scroll', function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    var p = h > 0 ? Math.round((scrollY / h) * 100) : 100;
    if (p > maxScroll) maxScroll = p;
  }, { passive: true });
  function leave() { tick(); send({ t: 'leave', a: Math.round(active / 1000), sc: maxScroll }); }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { leave(); since = 0; }
    else { since = Date.now(); }
  });
  window.addEventListener('pagehide', function () { if (since) leave(); });

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a,button,[data-track]');
    if (!el) return;
    var label = el.getAttribute('data-track') || (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    tick();
    send({ t: 'click', l: label.slice(0, 80), h: el.href || '', a: Math.round(active / 1000) });
  }, true);
})();
