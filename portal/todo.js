/* Admin dashboard to-do list, grouped by job.
   Signed in: saved on the server (shared by Ashley and Greg). Preview mode: saved in this browser. */
(function () {
  var box = document.getElementById('td'); if (!box) return;
  var KEY = 'sr-admin-todos', items = null, live = false, showDone = {};
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var SEED = [
    ['rusk', 'Write up the 2 client upgrades'], ['rusk', 'Get cabinet quote from Rosie'], ['rusk', 'Answer Janet’s backsplash suggestion'],
    ['kimsey', 'Cabinets with Rosie'], ['kimsey', 'Tile selection with Nina'],
    ['lofquist', 'Countertop selection at Cary Granite'],
    ['ahart', 'Get cabinet package approved (Sonata vs Tavis door)'],
    ['martha', 'Order toilet'], ['martha', 'Order bath fans']
  ];
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function jobs() {
    var list = [];
    document.querySelectorAll('.ah-projects .ah-proj').forEach(function (c) {
      if (c.classList.contains('is-closed') || c.classList.contains('is-hidden')) return;
      var h = c.querySelector('h2'); if (h) list.push({ id: c.dataset.id, name: h.textContent.trim() });
    });
    list.push({ id: 'general', name: 'Office & general' });
    return list;
  }
  function nice(iso) { var p = (iso || '').split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) : ''; }
  function overdue(iso) { if (!iso) return false; var t = new Date(); t.setHours(0, 0, 0, 0); return new Date(iso + 'T00:00:00') < t; }

  function save() {
    if (live) window.SRPortal.api('project/company/todos', { method: 'PUT', body: JSON.stringify(items) }).catch(function (e) { console.warn('to-do save failed', e); });
    else { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  }

  function render() {
    var js = jobs(), sel = document.getElementById('td-job'), cur = sel.value;
    sel.innerHTML = js.map(function (j) { return '<option value="' + j.id + '">' + esc(j.name) + '</option>'; }).join('');
    if (cur) sel.value = cur;
    var open = items.filter(function (t) { return !t.done && js.some(function (j) { return j.id === t.job; }); }).length;
    document.getElementById('td-count').textContent = open + ' open';
    document.getElementById('td-list').innerHTML = js.map(function (j) {
      var mine = items.filter(function (t) { return t.job === j.id; });
      var todo = mine.filter(function (t) { return !t.done; }).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
      var done = mine.filter(function (t) { return t.done; });
      if (!todo.length && !done.length) return '';
      return '<section class="td-group"><h3><span>' + esc(j.name) + '</span><i>' + todo.length + '</i></h3><ul>' +
        todo.map(row).join('') + (showDone[j.id] ? done.map(row).join('') : '') + '</ul>' +
        (done.length ? '<button type="button" class="td-done-t" data-job="' + j.id + '">' + (showDone[j.id] ? 'Hide' : 'Show') + ' done (' + done.length + ')</button>' : '') + '</section>';
    }).join('') || '<p class="td-empty">Nothing on the list. Add a to-do above.</p>';
  }
  function row(t) {
    return '<li class="' + (t.done ? 'done' : '') + '"><label><input type="checkbox" data-id="' + t.id + '"' + (t.done ? ' checked' : '') + '><span>' + esc(t.text) + '</span></label>' +
      (t.due ? '<em class="' + (!t.done && overdue(t.due) ? 'late' : '') + '">' + nice(t.due) + '</em>' : '') +
      '<button type="button" class="td-x" data-del="' + t.id + '" aria-label="Delete">&times;</button></li>';
  }

  document.getElementById('td-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, text = f.text.value.trim(); if (!text) { f.text.focus(); return; }
    items.push({ id: uid(), job: f.job.value, text: text, due: f.due.value || '', done: false, added: new Date().toISOString() });
    f.text.value = ''; f.due.value = ''; f.text.focus(); save(); render();
  });
  document.getElementById('td-list').addEventListener('click', function (e) {
    var cb = e.target.closest('input[type=checkbox][data-id]'), del = e.target.closest('[data-del]'), tg = e.target.closest('.td-done-t');
    if (cb) { items.forEach(function (t) { if (t.id === cb.dataset.id) { t.done = cb.checked; t.doneAt = cb.checked ? new Date().toISOString() : null; } }); save(); setTimeout(render, 250); }
    if (del) { items = items.filter(function (t) { return t.id !== del.dataset.del; }); save(); render(); }
    if (tg) { showDone[tg.dataset.job] = !showDone[tg.dataset.job]; render(); }
  });
  // re-group when a project is closed, hidden or reopened
  new MutationObserver(function () { if (items) render(); }).observe(document.querySelector('.ah-projects'), { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });

  function seed() { return SEED.map(function (s) { return { id: uid(), job: s[0], text: s[1], due: '', done: false }; }); }
  function start() {
    live = !!(window.SRPortal && window.SRPortal.mode === 'live');
    if (live) {
      window.SRPortal.api('project/company').then(function (doc) {
        items = Array.isArray(doc.todos) ? doc.todos : seed();
        if (!Array.isArray(doc.todos)) save();
        render();
      }).catch(function () { items = []; render(); });
    } else {
      try { items = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      if (!Array.isArray(items)) items = seed();
      render();
    }
  }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
