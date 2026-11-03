/* Client: Design & Estimate page (estimate.html). Shows the estimate (QuickBooks link / PDF), the design plans and what the
   estimate includes. The client can leave notes, ask to take items off (Ashley approves or keeps them), and approve.
   After approval: build contract and deposit, then selections. */
(function () {
  var E = window.SREst, esc = E.esc, money = E.money;
  var main = document.getElementById('es-main'), state = document.getElementById('es-state');
  var live = false, est = null, req = null, openNote = null, demo = null;

  function P() { var p = window.SRPortal; return p && p.mode === 'live' ? p : null; }
  function reqs() { req = E.load('req') || {}; if (!req.items || typeof req.items !== 'object') req.items = {}; return req; }
  function saveReq() { E.save('req', req); }
  function pending() { return est.items.filter(function (x) { return !x.removed && (req.items[x.id] || {}).remove; }); }

  function head() {
    var a = req.approved;
    state.innerHTML = a ? '<span class="es-pill ok">Approved ' + esc(a.stamp || '') + '</span>'
      : pending().length ? '<span class="es-pill">Waiting on Ashley to update your estimate</span>'
      : '<span class="es-pill">Ready for your review</span>';
    if (est.intro) document.getElementById('es-intro').textContent = est.intro;
  }

  function estimateCard() {
    var tot = E.priced(est.items), has = est.items.some(function (x) { return Number(x.price); });
    return '<section class="pt-card es-card es-est" data-sec="estimate-doc"><span class="sr-label">Your estimate</span><h2>' + (has ? money(tot) : 'Estimate') + '</h2>' +
      (has ? '<p class="es-sub">Total of everything included below' + (est.items.some(function (x) { return x.removed; }) ? ', with the items you took off removed' : '') + '.</p>' : '') +
      '<div class="es-btns">' +
      (est.qbLink ? '<a class="sr-btn" href="' + esc(est.qbLink) + '" target="_blank" rel="noopener">Open estimate in QuickBooks</a>' : '') +
      (est.pdf && est.pdf.name ? (est.pdf.url ? '<a class="sr-btn ghost" href="' + esc(est.pdf.url) + '" target="_blank" rel="noopener">Download estimate (PDF)</a>' : '<span class="sr-btn ghost is-off">Download estimate (PDF)</span>') : '') +
      '</div>' + (!est.qbLink && !(est.pdf && est.pdf.name) ? '<p class="es-sub">Your estimate document will be added here.</p>' : '') + '</section>';
  }

  function plansCard() {
    var pl = est.plans || [];
    return '<section class="pt-card es-card" data-sec="estimate-plans"><span class="sr-label">Design plans</span><h2>Your design</h2>' +
      (pl.length ? '<div class="es-plans">' + pl.map(function (f) {
        var img = E.isImg(f), href = f.url ? ' href="' + esc(f.url) + '" target="_blank" rel="noopener"' : '';
        return '<a class="es-plan' + (img ? ' img' : '') + '"' + href + '>' + (img && f.url ? '<span class="es-thumb" style="background-image:url(\'' + esc(f.url) + '\')"></span>' : '<span class="es-thumb doc">' + esc((f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)) + '</span>') +
          '<b>' + esc(f.name.replace(/\.[a-z0-9]{2,4}$/i, '')) + '</b>' + (f.note ? '<span>' + esc(f.note) + '</span>' : '') + '<em>' + (f.url ? 'Open' : 'Preview') + '</em></a>';
      }).join('') + '</div>' : '<p class="es-sub">Your plans, elevations and renderings will show here.</p>') + '</section>';
  }

  function row(x) {
    var r = req.items[x.id] || {}, locked = !!req.approved, price = Number(x.price) ? money(x.price) : '';
    var st = x.removed ? '<span class="es-tag off">Taken off your estimate</span>'
      : r.remove ? '<span class="es-tag ask">You asked to take this off &middot; Ashley will update your estimate</span>'
      : r.declined ? '<span class="es-tag kept">Ashley kept this in. She&rsquo;ll reach out to talk it through.</span>' : '';
    var acts = locked || x.removed ? '' : '<div class="es-acts"><button type="button" class="es-link" data-note="' + x.id + '">' + (r.note ? 'Edit note' : 'Add a note') + '</button>' +
      '<button type="button" class="es-link' + (r.remove ? '' : ' warn') + '" data-rm="' + x.id + '">' + (r.remove ? 'Keep it after all' : 'Take this off') + '</button></div>';
    var note = openNote === x.id ? '<form class="es-noteform" data-id="' + x.id + '"><textarea name="t" rows="2" placeholder="Your note for Ashley">' + esc(r.note || '') + '</textarea><div><button class="sr-btn" type="submit">Save note</button><button class="es-link" type="button" data-cancel="1">Cancel</button></div></form>'
      : r.note ? '<p class="es-mynote"><span>Your note:</span> ' + esc(r.note) + '</p>' : '';
    return '<li class="es-item' + (x.removed ? ' removed' : r.remove ? ' asked' : '') + '"><div class="es-txt"><b>' + esc(x.text) + '</b>' + st + note + acts + '</div><div class="es-price">' + price + '</div></li>';
  }

  function scopeCard() {
    var tot = E.priced(est.items), ask = pending(), save = ask.reduce(function (s, x) { return s + (Number(x.price) || 0); }, 0);
    var has = est.items.some(function (x) { return Number(x.price); });
    return '<section class="pt-card es-card" data-sec="estimate-scope"><div class="pt-card-head"><div><span class="sr-label">What this includes</span><h2>Your scope of work</h2></div></div>' +
      '<p class="es-sub">Leave a note on anything, or ask us to take an item off. Ashley will update your estimate to match.</p>' +
      '<ul class="es-items">' + (est.items.length ? est.items.map(row).join('') : '<li class="es-item"><div class="es-txt"><span class="es-sub">Your scope will be listed here.</span></div></li>') + '</ul>' +
      (has ? '<div class="es-total"><span>Total</span><b>' + money(tot) + '</b></div>' + (save ? '<div class="es-total ask"><span>If the ' + ask.length + ' item' + (ask.length === 1 ? '' : 's') + ' you asked about come off</span><b>' + money(tot - save) + ' <small>(saves ' + money(save) + ')</small></b></div>' : '') : '') +
      '</section>';
  }

  function notesCard() {
    if (req.approved) return req.general ? '<section class="pt-card es-card"><span class="sr-label">Your notes</span><p class="es-mynote">' + esc(req.general) + '</p></section>' : '';
    return '<section class="pt-card es-card" data-sec="estimate-notes"><span class="sr-label">Notes</span><h2>Anything else?</h2>' +
      '<form id="es-general"><textarea name="t" rows="4" placeholder="Questions, changes, or anything you&rsquo;d like us to know about the design or estimate">' + esc(req.general || '') + '</textarea>' +
      '<div class="es-btns"><button class="sr-btn" type="submit">Send note to Ashley</button><span class="es-ok" id="es-gen-ok"></span></div></form></section>';
  }

  function approveCard() {
    var a = req.approved, ask = pending();
    var next = '<ol class="es-next"><li class="done">Design &amp; estimate</li><li class="now">Build contract &amp; deposit</li><li>Selections</li></ol>';
    if (a) return '<section class="pt-card es-card es-approve done" data-sec="estimate-approve"><span class="sr-label">Approved</span><h2>Thank you, ' + esc(a.name.split(' ')[0]) + '!</h2>' +
      '<p>You approved your design and estimate on ' + esc(a.stamp || '') + (a.total ? ' (' + money(a.total) + ')' : '') + '. Next up is your build contract and deposit. We&rsquo;ll let you know as soon as it&rsquo;s ready to sign, and then we&rsquo;ll start on your selections.</p>' + next + '</section>';
    return '<section class="pt-card es-card es-approve" data-sec="estimate-approve"><span class="sr-label">Ready to move forward?</span><h2>Approve your design &amp; estimate</h2>' +
      (ask.length ? '<p class="es-hold">You&rsquo;ve asked to take ' + ask.length + ' item' + (ask.length === 1 ? '' : 's') + ' off. Ashley will update your estimate first, and then you can approve it here.</p>'
        : '<p>When everything looks right, approve it here. Next we&rsquo;ll send your build contract and deposit, and then start on your selections.</p>' + next +
          '<form id="es-approve"><label>Your full name<input type="text" name="name" autocomplete="name" required></label>' +
          '<label class="es-chk"><input type="checkbox" name="agree" required> I approve this design and estimate' + (E.priced(est.items) ? ' of ' + money(E.priced(est.items)) : '') + '.</label>' +
          '<div class="es-btns"><button class="sr-btn" type="submit">Approve</button><span class="es-ok" id="es-ap-msg"></span></div></form>') + '</section>';
  }

  function render() {
    est = E.load('est'); reqs();
    if (!est && !live) est = demo || (demo = E.sample());
    if (!est || est.status !== 'shared') {
      state.innerHTML = ''; main.innerHTML = '<section class="pt-card es-card"><span class="sr-label">Coming soon</span><h2>We&rsquo;re working on your design</h2><p>Your plans and estimate will show up here as soon as they&rsquo;re ready. We&rsquo;ll let you know.</p><a href="index.html" class="pt-dl">Back to dashboard</a></section>';
      return;
    }
    est.items = Array.isArray(est.items) ? est.items : [];
    head();
    main.innerHTML = '<div class="es-top">' + estimateCard() + plansCard() + '</div>' + scopeCard() + '<div class="es-top">' + notesCard() + approveCard() + '</div>';
    var hid = {}; try { hid = JSON.parse(localStorage.getItem('sr-portal-hidden') || '{}'); } catch (e) {}
    main.querySelectorAll('[data-sec]').forEach(function (s) { if (hid[s.dataset.sec]) s.style.display = 'none'; });
  }

  main.addEventListener('click', function (e) {
    var n = e.target.closest('[data-note]'), rm = e.target.closest('[data-rm]'), c = e.target.closest('[data-cancel]');
    if (n) { openNote = n.dataset.note; render(); var t = main.querySelector('.es-noteform textarea'); if (t) t.focus(); }
    if (c) { openNote = null; render(); }
    if (rm) {
      var id = rm.dataset.rm, r = req.items[id] = req.items[id] || {};
      r.remove = !r.remove; r.at = new Date().toISOString(); if (r.remove) delete r.declined;
      saveReq(); render();
    }
  });
  main.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.classList.contains('es-noteform')) {
      var id = f.dataset.id, r = req.items[id] = req.items[id] || {};
      r.note = f.t.value.trim().slice(0, 2000); r.at = new Date().toISOString();
      if (!r.note && !r.remove && !r.declined) delete req.items[id];
      openNote = null; saveReq(); render();
    }
    if (f.id === 'es-general') {
      req.general = f.t.value.trim().slice(0, 5000); saveReq();
      var ok = document.getElementById('es-gen-ok'); if (ok) ok.textContent = 'Sent. Ashley will see your note.';
    }
    if (f.id === 'es-approve') {
      var name = f.name.value.trim(), msg = document.getElementById('es-ap-msg'), b = f.querySelector('button');
      if (!name || !f.agree.checked) return;
      b.disabled = true; msg.textContent = 'Saving…';
      var p = P();
      var done = function (a) { req.approved = a; E.save('req', req); render(); window.scrollTo(0, 0); };
      if (!p) { var now = new Date(); done({ name: name, at: now.toISOString(), stamp: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' (preview)', total: E.priced(est.items) }); return; }
      p.api('project/' + p.project + '/estimate-approve', { method: 'POST', body: JSON.stringify({ name: name, agree: true }) })
        .then(function (r) { done(r.approved); })
        .catch(function () { b.disabled = false; msg.textContent = 'That didn’t go through. Check your connection and try again, or message Ashley.'; });
    }
  });

  function start() { live = !!P(); render(); }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
