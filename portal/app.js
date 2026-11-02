/* Makes the portal work like an app on a phone:
   - registers the service worker (only used for an "offline" page; no project data is stored)
   - on admin pages, adds a bottom tab bar on phone screens: Projects · Leads · To do · More
   - on the All projects page, each tab shows just that section
   - on an iPhone in Safari, shows a one-time tip for adding the app to the home screen */
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/portal/sw.js', { scope: '/portal/' }).catch(function () {});
  var admin = document.body.dataset.auth === 'admin';
  var page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('app-standalone');

  var css = document.createElement('style');
  css.textContent =
    '.app-tabs{display:none}' +
    '@media (max-width:760px){' +
      '.app-tabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:900;background:#fff;border-top:1px solid #e3ddd2;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}' +
      '.app-tabs a,.app-tabs button{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;font:inherit;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8f897e;text-decoration:none;padding:6px 0}' +
      '.app-tabs .on{color:#181611}.app-tabs svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.6}' +
      '.app-tabs i{font-style:normal;background:#c8a97e;color:#fff;border-radius:9px;font-size:10px;padding:0 5px;margin-left:2px;letter-spacing:0}' +
      'body.has-app-tabs{padding-bottom:calc(74px + env(safe-area-inset-bottom))}' +
      'body.tab-projects .ah-leads,body.tab-projects .td{display:none!important}' +
      'body.tab-leads .ah-filters,body.tab-leads .ah-projects,body.tab-leads .ah-archive,body.tab-leads .td,body.tab-leads .ah-stats{display:none!important}' +
      'body.tab-todo .ah-left,body.tab-todo .ah-stats{display:none!important}' +
      'body.tab-leads .ah-leads{margin-top:0}body.tab-leads .ah-leads .ab-card-head h2,body.tab-todo .td-head h2{display:none}' +
      '.app-sheet{position:fixed;inset:0;z-index:950;background:rgba(24,22,17,.45);display:flex;align-items:flex-end}' +
      '.app-sheet div{background:#fff;width:100%;padding:10px 0 calc(16px + env(safe-area-inset-bottom))}' +
      '.app-sheet a{display:block;padding:15px 24px;font-size:16px;color:#181611;text-decoration:none;border-bottom:1px solid #f0ebe3}' +
      '.app-sheet a.out{color:#9a4b3c;border:0}' +
      '.app-standalone .pt-demo{display:none}' +
    '}' +
    '.app-tip{background:#181611;color:#f6f4ee;padding:12px 16px;font-size:14px;display:flex;gap:12px;align-items:center}' +
    '.app-tip b{font-weight:500}.app-tip button{margin-left:auto;background:none;border:1px solid #f6f4ee;color:#f6f4ee;padding:5px 10px;font-size:12px}';
  document.head.appendChild(css);

  var ICON = {
    projects: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    leads: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
    todo: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></svg>'
  };

  function tabs() {
    var bar = document.createElement('nav'); bar.className = 'app-tabs'; bar.setAttribute('aria-label', 'App');
    var home = page === 'admin-home';
    bar.innerHTML =
      '<a href="admin-home.html#projects" data-tab="projects">' + ICON.projects + 'Projects</a>' +
      '<a href="admin-home.html#leads" data-tab="leads">' + ICON.leads + '<span>Leads<i id="app-leads-n" hidden></i></span></a>' +
      '<a href="admin-home.html#todo" data-tab="todo">' + ICON.todo + 'To do</a>' +
      '<button type="button" data-tab="more">' + ICON.more + 'More</button>';
    document.body.appendChild(bar); document.body.classList.add('has-app-tabs');

    function show(t) {
      ['projects', 'leads', 'todo'].forEach(function (k) { document.body.classList.toggle('tab-' + k, k === t); });
      bar.querySelectorAll('[data-tab]').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === t); });
      var h = document.querySelector('.ab-head h1'); if (h) h.textContent = { projects: 'Open projects', leads: 'Leads', todo: 'To do' }[t];
      window.scrollTo(0, 0);
    }
    if (home) {
      var small = window.matchMedia('(max-width:760px)');
      var start = (location.hash || '').replace('#', ''); if (['projects', 'leads', 'todo'].indexOf(start) < 0) start = 'projects';
      if (small.matches) show(start);
      bar.querySelectorAll('a[data-tab]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); history.replaceState(null, '', '#' + a.dataset.tab); show(a.dataset.tab); }); });
      small.addEventListener('change', function () { if (!small.matches) ['projects', 'leads', 'todo'].forEach(function (k) { document.body.classList.remove('tab-' + k); }); else show('projects'); });
    }
    bar.querySelector('[data-tab=more]').addEventListener('click', function () {
      var s = document.createElement('div'); s.className = 'app-sheet';
      s.innerHTML = '<div><a href="admin-setup.html">+ New project</a><a href="admin-library.html">Selections library</a><a href="admin-photos.html">Website photos</a><a href="../index.html">Public website</a><a href="login.html?signout=1" class="out">Sign out</a></div>';
      s.addEventListener('click', function (e) { if (e.target === s) s.remove(); });
      document.body.appendChild(s);
    });
    // New-lead count on the Leads tab
    function count() {
      var P = window.SRPortal; if (!P || P.mode !== 'live') return;
      P.api('leads').then(function (j) { var n = (j.leads || []).filter(function (l) { return l.status === 'new'; }).length; var i = document.getElementById('app-leads-n'); if (i) { i.hidden = !n; i.textContent = n; } }).catch(function () {});
    }
    if (window.SRPortal) count(); else document.addEventListener('sr-portal-ready', count);
  }

  function tip() {
    var ua = navigator.userAgent, iOS = /iPhone|iPad|iPod/.test(ua), chrome = /CriOS/.test(ua), safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (!iOS || !(safari || chrome) || standalone) return;
    try { if (localStorage.getItem('sr-app-tip')) return; } catch (e) { return; }
    var t = document.createElement('div'); t.className = 'app-tip';
    t.innerHTML = '<span><b>Get the app:</b> tap Share' + (chrome ? ' (top right)' : '') + ' <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:-3px;stroke:#f6f4ee;fill:none;stroke-width:1.8"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/></svg>, then &ldquo;Add to Home Screen.&rdquo;' + (chrome ? ' Don&rsquo;t see it? Tap More.' : '') + '</span><button type="button">Got it</button>';
    t.querySelector('button').onclick = function () { try { localStorage.setItem('sr-app-tip', '1'); } catch (e) {} t.remove(); };
    var bar = document.querySelector('.pt-bar'); if (bar) bar.insertAdjacentElement('afterend', t); else document.body.insertBefore(t, document.body.firstChild);
  }

  function init() { if (admin) tabs(); if (page === 'admin-home' || page === 'index') tip(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
