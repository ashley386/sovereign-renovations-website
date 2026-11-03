/* Client: Design & Estimate page (estimate.html). Shows the estimate (QuickBooks link / PDF), the design plans and what the
   estimate includes. The client can leave notes, ask to take items off (Ashley approves or keeps them), and approve.
   After approval: build contract and deposit, then selections. */
(function () {
  var E = window.SREst, esc = E.esc, money = E.money;
  var main = document.getElementById('es-main'), state = document.getElementById('es-state');
  var live = false, est = null, req = null, openNote = null, demo = null, editDesign = false;

  function P() { var p = window.SRPortal; return p && p.mode === 'live' ? p : null; }
  function reqs() { req = E.load('req') || {}; if (!req.items || typeof req.items !== 'object') req.items = {}; return req; }
  function saveReq() { E.save('req', req); }
  function pending() { return est.items.filter(function (x) { return !x.heading && !x.removed && (req.items[x.id] || {}).remove; }); }

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
    var pl = est.plans || [], cv = E.coverOf(est);
    function art(f, cls, w) {
      if (E.isImg(f) && f.url) return '<span class="' + cls + '" style="background-image:url(\'' + esc(f.url) + '\')"></span>';
      if (E.isPdf(f) && f.url) return '<span class="' + cls + ' pdf" data-pdf="' + esc(f.url) + '"><i>PDF</i></span>';
      return '<span class="' + cls + ' doc">' + esc((f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)) + '</span>';
    }
    function nm(f) { return esc(f.name.replace(/\.[a-z0-9]{2,4}$/i, '')); }
    function link(f) { return f.url ? ' href="' + esc(f.url) + '" target="_blank" rel="noopener"' : ''; }
    var rest = pl.filter(function (f) { return f !== cv; });
    return '<section class="pt-card es-card es-design" data-sec="estimate-plans"><span class="sr-label">Design plans</span><h2>Your design</h2>' +
      (cv ? '<a class="es-cover"' + link(cv) + '>' + art(cv, 'es-cover-art') + '<span class="es-cover-cap"><b>' + nm(cv) + '</b>' + (cv.note ? '<span>' + esc(cv.note) + '</span>' : '') + '<em>' + (cv.url ? 'Open full size' : 'Preview') + '</em></span></a>' +
        (rest.length ? '<div class="es-plans">' + rest.map(function (f) {
          return '<a class="es-plan"' + link(f) + '>' + art(f, 'es-thumb') + '<b>' + nm(f) + '</b>' + (f.note ? '<span>' + esc(f.note) + '</span>' : '') + '<em>' + (f.url ? 'Open' : 'Preview') + '</em></a>';
        }).join('') + '</div>' : '')
      : '<p class="es-sub">Your plans, elevations and renderings will show here.</p>') + '</section>';
  }

  function row(x) {
    if (x.heading) return '<li class="es-head"><h3>' + esc(x.title || x.text) + '</h3></li>';
    var r = req.items[x.id] || {}, locked = !!req.approved, price = Number(x.price) ? (x.price < 0 ? '&minus;' + money(-x.price) : money(x.price)) : '';
    var st = x.removed ? '<span class="es-tag off">Taken off your estimate</span>'
      : r.remove ? '<span class="es-tag ask">You asked to take this off &middot; Ashley will update your estimate</span>'
      : r.declined ? '<span class="es-tag kept">Ashley kept this in. She&rsquo;ll reach out to talk it through.</span>' : '';
    var acts = locked || x.removed ? '' : '<div class="es-acts"><button type="button" class="es-link" data-note="' + x.id + '">' + (r.note ? 'Edit note' : 'Add a note') + '</button>' +
      (x.fixed ? '' : '<button type="button" class="es-link' + (r.remove ? '' : ' warn') + '" data-rm="' + x.id + '">' + (r.remove ? 'Keep it after all' : 'Take this off') + '</button>') + '</div>';
    var note = openNote === x.id ? '<form class="es-noteform" data-id="' + x.id + '"><textarea name="t" rows="2" placeholder="Your note for Ashley">' + esc(r.note || '') + '</textarea><div><button class="sr-btn" type="submit">Save note</button><button class="es-link" type="button" data-cancel="1">Cancel</button></div></form>'
      : r.note ? '<p class="es-mynote"><span>Your note:</span> ' + esc(r.note) + '</p>' : '';
    return '<li class="es-item' + (x.removed ? ' removed' : r.remove ? ' asked' : '') + '"><div class="es-txt"><b>' + esc(x.title || x.text) + '</b>' + (x.title && x.text ? '<p class="es-desc">' + esc(x.text) + '</p>' : '') + st + note + acts + '</div><div class="es-price">' + price + '</div></li>';
  }

  function scopeCard() {
    var tot = E.priced(est.items), ask = pending(), save = ask.reduce(function (s, x) { return s + (Number(x.price) || 0); }, 0);
    var has = est.items.some(function (x) { return Number(x.price); });
    return '<section class="pt-card es-card" data-sec="estimate-scope"><div class="pt-card-head"><div><span class="sr-label">What this includes</span><h2>Your scope of work</h2></div></div>' +
      '<p class="es-sub">' + (req.approved ? 'This is the scope you approved.' : 'Leave a note on anything, or ask us to take an item off. Ashley will update your estimate to match.') + '</p>' +
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

  var STEPS = ['Approve your estimate', 'Contract &amp; deposit', 'Site survey &amp; design talk', 'Selections'];
  function steps(at) { return '<ol class="es-next">' + STEPS.map(function (t, i) { return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + t + '</li>'; }).join('') + '</ol>'; }

  function approveCard() {
    var a = req.approved, ask = pending(), tot = E.priced(est.items);
    if (a) return '<section class="pt-card es-card es-approve done" data-sec="estimate-approve"><span class="sr-label">Estimate approved</span><h2>Thank you, ' + esc(a.name.split(' ')[0]) + '!</h2>' +
      '<p>You approved your estimate on ' + esc(a.stamp || '') + (a.total ? ' (' + money(a.total) + ')' : '') + '. Next is your build contract and deposit. Once your deposit is paid, we&rsquo;ll set up your site survey and talk through your design.</p>' + steps(1) + '</section>';
    return '<section class="pt-card es-card es-approve" data-sec="estimate-approve"><span class="sr-label">Ready to move forward?</span><h2>Approve your estimate</h2>' +
      (ask.length ? '<p class="es-hold">You&rsquo;ve asked to take ' + ask.length + ' item' + (ask.length === 1 ? '' : 's') + ' off. Ashley will update your estimate first, and then you can approve it here.</p>'
        : '<p>When the estimate looks right, approve it here. Next we&rsquo;ll send your build contract and deposit. Once your deposit is paid, we&rsquo;ll set up your site survey and start fleshing out your design together.</p>' + steps(0) +
          '<form id="es-approve"><label>Your full name<input type="text" name="name" autocomplete="name" required></label>' +
          '<label class="es-chk"><input type="checkbox" name="agree" required> I approve this estimate' + (tot ? ' of ' + money(tot) : '') + '.</label>' +
          '<div class="es-btns"><button class="sr-btn" type="submit">Approve estimate</button><span class="es-ok" id="es-ap-msg"></span></div></form>') + '</section>';
  }

  // After approval: what they'd like changed and what they'd like to explore, ready for the design talk
  function designCard() {
    var d = req.design || {}, sent = !!d.at && !editDesign;
    return '<section class="pt-card es-card" data-sec="estimate-design-notes"><span class="sr-label">Your design notes</span><h2>What should we change or explore?</h2>' +
      (sent ? (d.change ? '<p class="es-mynote"><span>Change:</span> ' + esc(d.change) + '</p>' : '') + (d.explore ? '<p class="es-mynote"><span>Explore:</span> ' + esc(d.explore) + '</p>' : '') +
          '<p class="es-sub" style="margin-top:12px">Thanks! We&rsquo;ll go over these with you at your site survey.</p><div class="es-btns"><button type="button" class="es-link" id="es-design-edit">Edit my notes</button></div>'
        : '<p class="es-sub">We&rsquo;ll talk through these at your site survey, so jot down anything that comes to mind.</p><form id="es-design">' +
          '<label class="es-lab">What would you like changed in the design?<textarea name="change" rows="4" placeholder="e.g. Move the range to the island, lighter cabinet color">' + esc(d.change || '') + '</textarea></label>' +
          '<label class="es-lab">Anything you&rsquo;d like to explore?<textarea name="explore" rows="4" placeholder="e.g. A coffee bar, open shelving, a bigger pantry">' + esc(d.explore || '') + '</textarea></label>' +
          '<div class="es-btns"><button class="sr-btn" type="submit">Send to Ashley</button></div></form>') + '</section>';
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
    main.innerHTML = '<div class="es-top es-top-design">' + plansCard() + estimateCard() + '</div>' + scopeCard() + '<div class="es-top">' + (req.approved ? approveCard() + designCard() : notesCard() + approveCard()) + '</div>';
    var hid = {}; try { hid = JSON.parse(localStorage.getItem('sr-portal-hidden') || '{}'); } catch (e) {}
    main.querySelectorAll('[data-sec]').forEach(function (s) { if (hid[s.dataset.sec]) s.style.display = 'none'; });
    E.drawPdfs(main);
  }

  main.addEventListener('click', function (e) {
    var n = e.target.closest('[data-note]'), rm = e.target.closest('[data-rm]'), c = e.target.closest('[data-cancel]');
    if (n) { openNote = n.dataset.note; render(); var t = main.querySelector('.es-noteform textarea'); if (t) t.focus(); }
    if (c) { openNote = null; render(); }
    if (e.target.closest('#es-design-edit')) { editDesign = true; render(); }
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
    if (f.id === 'es-design') {
      var ch = f.change.value.trim().slice(0, 5000), ex = f.explore.value.trim().slice(0, 5000);
      if (!ch && !ex) { f.change.focus(); return; }
      req.design = { change: ch, explore: ex, at: new Date().toISOString() }; editDesign = false; saveReq(); render();
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
