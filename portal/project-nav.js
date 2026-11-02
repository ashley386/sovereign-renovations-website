/* Keeps every portal page on the right project.
   - Admins pick a project with ?project=ID (remembered for this browser tab); links between portal pages carry it along.
   - If the project changed since this browser last loaded portal data, the old copy is cleared before the page reads it.
   - Pages were first designed around the Rusk sample, so names written into the pages are swapped for this project's
     names (from the project's "meta": name, client names) once they're known.
   Loaded as the first thing in <body>, before the page's own scripts. */
(function () {
  var KEYS = ['sr-portal-choices', 'sr-portal-choice-dates', 'sr-portal-up', 'sr-portal-client-dates', 'sr-portal-client-files', 'sr-portal-hidden',
    'sr-portal-contract', 'sr-portal-boards', 'sr-portal-contract-sig', 'sr-portal-messages', 'sr-portal-meta', 'sr-portal-dates', 'sr-portal-files', 'sr-portal-invoices'];
  var q = new URLSearchParams(location.search).get('project');
  var pick = q ? q.replace(/[^a-z0-9-]/gi, '').toLowerCase() : null;
  try { if (pick) sessionStorage.setItem('sr-project', pick); else pick = sessionStorage.getItem('sr-project'); } catch (e) {}
  window.SRProjectPick = pick || null;

  // A different project than the data in this browser: clear it so nothing from the last project shows, even for a moment.
  var want = pick || localStorage.getItem('sr-portal-project-hint');
  try {
    var have = localStorage.getItem('sr-portal-project');
    if (want && have && have !== want) { KEYS.forEach(function (k) { localStorage.removeItem(k); }); localStorage.setItem('sr-portal-project', want); }
  } catch (e) {}

  function meta() { try { return JSON.parse(localStorage.getItem('sr-portal-meta')) || null; } catch (e) { return null; } }

  function carry() {
    var p = window.SRProjectPick; if (!p) return;
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!/^(admin-[a-z-]+|index|selections|sign)(\.html)?([#?].*)?$/.test(h) || /^admin-(home|setup|library|photos)/.test(h) || /[?&]project=/.test(h)) return;
      var hash = h.indexOf('#') > -1 ? h.slice(h.indexOf('#')) : '', base = hash ? h.slice(0, h.indexOf('#')) : h;
      a.setAttribute('href', base + (base.indexOf('?') > -1 ? '&' : '?') + 'project=' + encodeURIComponent(p) + hash);
    });
  }

  function rename() {
    var m = meta(); if (!m || !m.name) return;
    var people = (m.clients || []).map(function (c) { return c.name || ''; }).filter(Boolean);
    var firsts = people.map(function (n) { return n.split(' ')[0]; });
    var join = function (a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1] : (a[0] || ''); };
    var full = join(people) || m.name, first = join(firsts) || 'there';
    var surname = (people[0] || m.name).split(' ').slice(-1)[0];
    var pairs = [[/Rusk Kitchen/g, m.name], [/Janet Rusk/g, full], [/\bJanet\b/g, first], [/\bRusk\b/g, surname], [/\bJR\b/g, (people[0] || m.name).split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()]];
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentNode && n.parentNode.nodeName; return p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var n; while ((n = walk.nextNode())) {
      var t = n.nodeValue; if (!/Rusk|Janet|\bJR\b/.test(t)) continue;
      pairs.forEach(function (p) { t = t.replace(p[0], p[1]); }); n.nodeValue = t;
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (el) { el.placeholder = el.placeholder.replace(/Janet Rusk/g, full).replace(/\bJanet\b/g, first); });
    if (/Rusk|Janet/.test(document.title)) document.title = document.title.replace(/Rusk Kitchen/g, m.name).replace(/Janet/g, first);
  }

  function run() { carry(); rename(); }
  window.SRProjectRename = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  document.addEventListener('sr-portal-ready', function () { run(); setTimeout(run, 400); });
})();
