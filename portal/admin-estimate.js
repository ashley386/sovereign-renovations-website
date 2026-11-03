/* Admin: Design & Estimate editor (admin-estimate.html). Builds what the client sees on estimate.html:
   estimate link/PDF, design plans, the scope lines with prices, and handles the client's take-off requests and notes.
   Saves as you go. The page stays hidden from the client until "Share with client". */
(function () {
  var E = window.SREst, esc = E.esc, money = E.money;
  function $(id) { return document.getElementById(id); }
  function P() { var p = window.SRPortal; return p && p.mode === 'live' ? p : null; }
  var meta = {}; try { meta = JSON.parse(localStorage.getItem('sr-portal-meta')) || {}; } catch (e) {}
  var est, req, timer;
  function client() { var c = (meta.clients || [])[0]; return c && c.name ? c.name.split(' ')[0] : 'the client'; }

  function init() {
    est = E.load('est'); base = est ? est.updatedAt || '' : '';
    if (!est) {
      est = P() ? { status: 'draft', intro: '', qbLink: '', pdf: null, plans: [], items: E.fromTpl(meta.type === 'Laundry' ? 'Laundry room' : meta.type || ''), updatedAt: '' } : E.sample();
      if (!P()) est.status = 'draft';
    }
    delete est.sample;
    ['plans', 'items'].forEach(function (k) { if (!Array.isArray(est[k])) est[k] = []; });
    req = E.load('req') || {}; if (!req.items) req.items = {};
  }
  // The saved version this page started from. If the saved copy changes somewhere else (another tab, Greg, or a QuickBooks fill),
  // this page stops saving and asks for a reload instead of writing its older copy over it.
  var base = null, stale = false;
  function showStale() {
    stale = true;
    var bar = $('ae-stale');
    if (!bar) { bar = document.createElement('div'); bar.id = 'ae-stale'; bar.className = 'ae-stale'; document.querySelector('.ab-head').insertAdjacentElement('afterend', bar); }
    bar.innerHTML = '<div class="sr-wrap"><b>This estimate was updated somewhere else.</b> Reload to see the latest before making changes. Nothing on this page was saved over it. <button type="button" class="ae-mini dark" onclick="location.reload()">Reload</button></div>';
    var s = $('ae-saved'); if (s) s.textContent = 'Not saved';
  }
  function serverStamp() {
    var p = P(); if (!p) return Promise.resolve(base);
    return p.api('project/' + p.project).then(function (d) { return d.estimate ? d.estimate.updatedAt || '' : ''; });
  }
  function save(now) {
    clearTimeout(timer);
    if (stale) { showStale(); return; }
    var go = function () {
      serverStamp().then(function (srv) {
        if (P() && srv !== base && srv !== '' ) { showStale(); return; }
        est.updatedAt = new Date().toISOString(); base = est.updatedAt; E.save('est', est); var s = $('ae-saved'); if (s) s.textContent = 'Saved';
      }).catch(function () { var s = $('ae-saved'); if (s) s.textContent = 'Not saved. Check your connection.'; });
    };
    var s = $('ae-saved'); if (s) s.textContent = 'Saving…';
    if (now) go(); else timer = setTimeout(go, 600);
  }
  function saveReq() { E.save('req', req); }
  // Change the client's requests starting from the latest saved copy, so a note they just sent isn't overwritten.
  function changeReq(fn) {
    var p = P();
    var go = function (fresh) { req = fresh || req; if (!req.items) req.items = {}; fn(req); saveReq(); delete req.resetApproval; render(); };
    if (!p) { go(); return; }
    p.api('project/' + p.project).then(function (d) { go(d.estimateRequests || {}); }).catch(function () { go(); });
  }

  function status() {
    var a = req.approved, shared = est.status === 'shared';
    $('ae-status').innerHTML = (a ? '<span class="es-pill ok">Approved by ' + esc(a.name) + ' &middot; ' + esc(a.stamp || '') + '</span><button type="button" class="ae-mini" id="ae-clear">Clear approval</button>'
      : '<span class="es-pill' + (shared ? ' ok' : '') + '">' + (shared ? 'Shared with ' + esc(client()) : 'Draft &middot; ' + esc(client()) + ' can&rsquo;t see it yet') + '</span>' +
        (shared ? '<button type="button" class="ae-mini" id="ae-unshare">Back to draft</button>' : '<button type="button" class="ae-mini dark" id="ae-share">Share with ' + esc(client()) + '</button>')) +
      '<a class="ae-mini" href="estimate.html" target="_blank" rel="noopener">Preview</a><span class="ae-saved" id="ae-saved"></span>';
  }

  function requests() {
    var box = $('ae-requests'), rows = [];
    est.items.forEach(function (x) {
      var r = req.items[x.id]; if (!r) return;
      if (r.remove && !x.removed) rows.push('<li><b>Take off:</b> ' + esc(E.label(x)) + (Number(x.price) ? ' (' + money(x.price) + ')' : '') + (r.note ? '<br><span class="es-mynote" style="display:block"><span>Note:</span> ' + esc(r.note) + '</span>' : '') +
        '<div class="es-btns" style="margin-top:8px"><button type="button" class="ae-mini dark" data-approve="' + x.id + '">Take it off</button><button type="button" class="ae-mini" data-keep="' + x.id + '">Keep it in</button></div></li>');
      else if (r.note) rows.push('<li><b>Note on</b> ' + esc(E.label(x)) + ':<br><span class="es-mynote" style="display:block">' + esc(r.note) + '</span></li>');
    });
    var dz = req.design || {}, MK = { yes: 'Yes, this is the look they were going for', close: 'Close, with a few changes', steer: 'Not quite: steer in another direction' };
    if (dz.mark) rows.push('<li><b>Did we hit the mark?</b> ' + MK[dz.mark] + '</li>');
    if (dz.colors) rows.push('<li><b>Colors to add or try:</b> ' + esc(dz.colors) + '</li>');
    if (dz.change) rows.push('<li><b>What feels off / what they&rsquo;d change:</b><br><span class="es-mynote" style="display:block">' + esc(dz.change) + '</span></li>');
    if (dz.explore) rows.push('<li><b>To explore / another direction:</b><br><span class="es-mynote" style="display:block">' + esc(dz.explore) + '</span></li>');
    if (req.general) rows.push('<li><b>General note:</b><br><span class="es-mynote" style="display:block">' + esc(req.general) + '</span></li>');
    box.hidden = !rows.length;
    box.innerHTML = '<div class="ab-card-head"><h2>From ' + esc(client()) + '</h2><span class="ci-src">Taking an item off crosses it out on ' + esc(client()) + '&rsquo;s page. Update the QuickBooks estimate to match.</span></div><ul class="ae-items">' + rows.map(function (r) { return '<li class="ae-item" style="display:block">' + r.slice(4); }).join('') + '</ul>';
  }

  function items() {
    var list = $('ae-items');
    list.innerHTML = est.items.map(function (x, i) {
      var r = req.items[x.id] || {}, n = est.items.length;
      var tools = '<div class="ae-tools"><button type="button" data-act="up" aria-label="Move up"' + (i ? '' : ' disabled') + '>&uarr;</button><button type="button" data-act="down" aria-label="Move down"' + (i < n - 1 ? '' : ' disabled') + '>&darr;</button>' +
        (x.heading ? '' : '<button type="button" data-act="fixed" title="Locked lines can&rsquo;t be taken off by the client">' + (x.fixed ? 'Locked' : 'Lock') + '</button><button type="button" data-act="off">' + (x.removed ? 'Put back' : 'Off') + '</button>') +
        '<button type="button" data-act="del" aria-label="Delete">&times;</button></div>';
      if (x.heading) return '<li class="ae-item head" data-i="' + i + '"><input type="text" class="ae-text" data-f="title" value="' + esc(x.title || x.text) + '" aria-label="Heading">' + tools + '</li>';
      var tag = r.remove && !x.removed ? '<span class="es-tag ask">' + esc(client()) + ' asked to take this off</span>' : r.declined ? '<span class="es-tag kept">Kept in after ' + esc(client()) + ' asked</span>' : '';
      return '<li class="ae-item' + (x.removed ? ' removed' : '') + '" data-i="' + i + '">' +
        '<div><input type="text" class="ae-text" data-f="title" value="' + esc(x.title || '') + '" placeholder="Line title (e.g. Electrical)" aria-label="Title">' +
        '<textarea data-f="text" rows="' + Math.min(8, Math.max(2, String(x.text || '').split('\n').length)) + '" placeholder="What&rsquo;s included" aria-label="Details">' + esc(x.text || '') + '</textarea>' +
        (x.fixed ? '<span class="ae-fixed">Locked: the client can add a note but can&rsquo;t take it off</span>' : '') + '</div>' +
        '<input type="text" inputmode="decimal" data-f="price" value="' + (x.price != null && x.price !== '' ? esc(x.price) : '') + '" placeholder="$ price" aria-label="Price">' + tools +
        (tag || r.note ? '<div class="ae-req">' + tag + (r.note ? '<span class="es-mynote" style="margin:0"><span>' + esc(client()) + ':</span> ' + esc(r.note) + '</span>' : '') + '</div>' : '') + '</li>';
    }).join('') || '<li class="ae-item" style="display:block"><span class="ci-src">No lines yet. Start from a list above or add a line.</span></li>';
    list.querySelectorAll('textarea').forEach(grow);
    $('ae-total').textContent = money(E.priced(est.items));
    $('ae-tpl').innerHTML = (est.source && est.source.from === 'quickbooks' ? 'From QuickBooks estimate ' + esc(est.source.doc || '') + (est.source.at ? ' &middot; ' + esc(new Date(est.source.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : '') + ' &middot; ' : '') +
      'Start from: ' + Object.keys(E.TPL).map(function (k) { return '<button type="button" class="ae-mini" data-tpl="' + esc(k) + '">' + esc(k) + '</button>'; }).join(' ');
  }

  function grow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function fileRow(f, kind, i) {
    return '<li><div class="pt-doc-icon' + (E.isImg(f) ? ' img' : '') + '">' + esc((f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)) + '</div>' +
      '<div>' + (kind === 'plan' ? '<input type="text" data-plan="' + i + '" value="' + esc(f.name.replace(/\.[a-z0-9]{2,4}$/i, '')) + '" aria-label="Plan name">' : '<b>' + esc(f.name) + '</b>') +
      (f.url ? ' <a class="pt-dl" href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a>' : ' <span class="ci-src">(preview only &middot; uploads work when signed in)</span>') + '</div>' +
      '<div class="ae-tools">' + (kind === 'plan' ? (E.coverOf(est) === f ? '<span class="es-tag ok-cover">Cover</span>' : '<button type="button" class="ae-mini" data-cover="' + i + '">Make cover</button>') : '') +
      '<button type="button" class="ae-mini" data-rmfile="' + kind + '" data-i="' + i + '">Remove</button></div></li>';
  }
  function files() {
    $('ae-pdf').innerHTML = est.pdf && est.pdf.name ? fileRow(est.pdf, 'pdf', 0) : '';
    $('ae-plans').innerHTML = est.plans.map(function (f, i) { return fileRow(f, 'plan', i); }).join('');
    $('ae-qb').value = est.qbLink || ''; $('ae-intro').value = est.intro || '';
  }
  function render() { status(); requests(); items(); files(); }

  // ---- events
  $('ae-items').addEventListener('input', function (e) {
    var li = e.target.closest('[data-i]'), f = e.target.dataset.f; if (!li || !f) return;
    var x = est.items[+li.dataset.i];
    if (f === 'text') { x.text = e.target.value; grow(e.target); }
    if (f === 'title') x.title = e.target.value;
    if (f === 'price') { var v = e.target.value.replace(/[^0-9.\-]/g, ''); x.price = v === '' || isNaN(Number(v)) ? null : Number(v); $('ae-total').textContent = money(E.priced(est.items)); }
    save();
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var li = t.closest('#ae-items [data-i]'), i = li ? +li.dataset.i : -1, a = t.dataset.act;
    if (a === 'up' && i > 0) { est.items.splice(i - 1, 0, est.items.splice(i, 1)[0]); save(true); items(); }
    if (a === 'down' && i < est.items.length - 1) { est.items.splice(i + 1, 0, est.items.splice(i, 1)[0]); save(true); items(); }
    if (a === 'off') { var x = est.items[i]; x.removed = !x.removed; save(true); render(); if (x.removed) changeReq(function (q) { if (q.items[x.id]) q.items[x.id].remove = false; }); }
    if (a === 'fixed') { est.items[i].fixed = !est.items[i].fixed; save(true); items(); }
    if (a === 'del') { if (!confirmDel(t)) return; est.items.splice(i, 1); save(true); render(); }
    if (t.id === 'ae-add') { est.items.push({ id: E.uid(), text: '', price: null, removed: false }); save(true); items(); var ins = $('ae-items').querySelectorAll('.ae-text'); ins[ins.length - 1].focus(); }
    if (t.id === 'ae-add-head') { est.items.push({ id: E.uid(), title: 'New section', heading: true, price: null }); save(true); items(); var hs = $('ae-items').querySelectorAll('.ae-text'); hs[hs.length - 1].select(); }
    if (t.dataset.tpl) {
      if (est.items.length && !window.confirm('Replace the ' + est.items.length + ' lines with the ' + t.dataset.tpl + ' list?')) return;
      est.items = E.fromTpl(t.dataset.tpl); save(true); render();
    }
    if (t.dataset.approve) { var id1 = t.dataset.approve, it = est.items.filter(function (x) { return x.id === id1; })[0]; if (it) it.removed = true; save(true); changeReq(function (q) { if (q.items[id1]) q.items[id1].remove = false; }); }
    if (t.dataset.keep) { var id2 = t.dataset.keep; changeReq(function (q) { var r = q.items[id2] = q.items[id2] || {}; r.remove = false; r.declined = new Date().toISOString(); }); }
    if (t.dataset.cover != null) { est.cover = est.plans[+t.dataset.cover].id; save(true); files(); }
    if (t.dataset.rmfile) { if (t.dataset.rmfile === 'pdf') est.pdf = null; else est.plans.splice(+t.dataset.i, 1); save(true); files(); }
    if (t.id === 'ae-share') share();
    if (t.id === 'ae-unshare') { est.status = 'draft'; save(true); status(); }
    if (t.id === 'ae-clear' && window.confirm('Clear ' + client() + '’s approval? Do this if you revised the estimate and need them to approve it again. (The project phase stays where it is.)')) {
      changeReq(function (q) { q.resetApproval = true; delete q.approved; });
    }
  });
  function confirmDel(b) { if (b.dataset.sure) return true; b.dataset.sure = '1'; b.textContent = 'Delete?'; setTimeout(function () { delete b.dataset.sure; b.innerHTML = '&times;'; }, 3000); return false; }
  function share() {
    est.status = 'shared'; save(true); status();
    if (P() && window.SRNotify) {
      var me = (P().me && (P().me.name || P().me.email) || 'Ashley').split(/[\s@]/)[0]; me = me.charAt(0).toUpperCase() + me.slice(1);
      window.SRNotify.open({ kind: 'estimate', label: 'Let ' + client() + ' know', subject: 'Your design & estimate are ready',
        text: 'Hi {first},\n\nYour design and estimate are ready in your client portal. You can look over the plans, see everything the estimate includes, leave notes, and let us know if you’d like anything taken off:\n\nhttps://sovereign-renovations.com/portal/estimate.html\n\nWhen it all looks right, you can approve it there, and we’ll send your build contract.\n\nThanks,\n' + me });
    }
  }
  $('ae-qb').addEventListener('input', function () { est.qbLink = this.value.trim(); save(); });
  $('ae-intro').addEventListener('input', function () { est.intro = this.value.trim(); save(); });
  $('ae-plans').addEventListener('input', function (e) { var i = e.target.dataset.plan; if (i == null) return; var f = est.plans[+i], ext = (f.name.match(/\.[a-z0-9]{2,4}$/i) || [''])[0]; f.name = e.target.value + ext; save(); });

  function up(list, done) {
    var err = $('ae-up-err'); err.hidden = true;
    var jobs = Array.prototype.map.call(list, function (f) {
      var up = window.SRUpload ? window.SRUpload(f) : Promise.resolve(null);
      return up.then(function (r) { return { id: E.uid(), name: f.name, type: f.type, url: r ? r.url : '' }; });
    });
    Promise.all(jobs).then(done).catch(function (e) { err.hidden = false; err.textContent = e && e.message === 'too-large' ? 'That file is over 5 MB. Save a smaller PDF and try again.' : 'Upload didn’t work. Check your connection and try again.'; });
  }
  $('ae-pdf-in').addEventListener('change', function () { var inp = this; if (!inp.files.length) return; up(inp.files, function (r) { est.pdf = r[0]; inp.value = ''; save(true); files(); }); });
  $('ae-plans-in').addEventListener('change', function () { var inp = this; if (!inp.files.length) return; up(inp.files, function (r) { est.plans = est.plans.concat(r); inp.value = ''; save(true); files(); }); });

  function start() { init(); render(); }
  // Coming back to this tab: if the saved copy changed while it was in the background, ask for a reload.
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && P() && !stale) serverStamp().then(function (srv) { if (srv !== base && srv !== '') showStale(); }).catch(function () {}); });
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
