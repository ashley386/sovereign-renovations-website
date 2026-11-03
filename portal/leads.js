/* Leads on the All projects page. Website contact-form leads arrive on their own; leads can also be added by hand.
   Each lead: call/email links, the message, status, consultation date, notes, and "Turn into a project". */
(function () {
  var sec = document.querySelector('.ah-leads'); if (!sec) return;
  sec.id = 'leads';
  var STATUS = { new: 'New &middot; needs a call', contacted: 'Contacted', consult: 'Consult scheduled', ballpark: 'Ballpark sent &middot; waiting on client', signed: 'Agreement signed &middot; waiting on deposit', paid: 'Deposit paid &middot; set up the project', project: 'Now a project', lost: 'Not a fit' };
  var leads = [], showClosed = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function when(v) { var d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (v.length > 10 ? ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''); }
  function api(path, o) { return window.SRPortal.api(path, o); }

  sec.innerHTML = '<div class="ab-card-head"><h2>Leads</h2><div class="ld-head"><span class="ci-src">Website form leads show up here on their own</span><button class="ab-mini ghost" type="button" id="ld-add">+ Add a lead</button></div></div>' +
    '<form class="ld-new" id="ld-new" hidden onsubmit="return false"><input name="name" placeholder="Name" required><input name="phone" placeholder="Phone"><input name="email" placeholder="Email"><input name="address" placeholder="Address"><input name="message" placeholder="What are they thinking about?"><button class="sr-btn" type="submit" value="page">Add &amp; make their lead page</button><button class="sr-btn ghost" type="submit" value="add">Just add the lead</button></form>' +
    '<ul class="ld-list" id="ld-list"><li class="ci-src">Loading&hellip;</li></ul><button class="ld-more" type="button" id="ld-more" hidden></button>';

  function card(l) {
    var open = l.status !== 'project' && l.status !== 'lost';
    return '<li class="ld ' + esc(l.status) + '" data-id="' + esc(l.id) + '">' +
      '<div class="ld-top"><b>' + esc(l.name || l.email || 'Website lead') + '</b><span class="ld-st">' + (STATUS[l.status] || esc(l.status)) + '</span></div>' +
      '<span class="ld-meta">' + (l.source === 'website' ? 'From website' : 'Added by hand') + ' &middot; ' + day(l.at) + (l.consult ? ' &middot; consult ' + esc(when(l.consult)) : '') + '</span>' +
      (l.phone || l.email ? '<span class="ld-contact">' + (l.phone ? '<a href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a>' : '') + (l.phone && l.email ? ' &middot; ' : '') + (l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' : '') + '</span>' : '') +
      (l.address ? '<span class="ld-contact"><a href="https://maps.google.com/?q=' + encodeURIComponent(l.address) + '" target="_blank" rel="noopener">' + esc(l.address) + '</a></span>' : '') +
      (l.message ? '<p class="ld-msg">&ldquo;' + esc(l.message.length > 220 ? l.message.slice(0, 220) + '…' : l.message) + '&rdquo;</p>' : '') +
      ((l.notes || []).length ? '<p class="ld-note">' + esc(l.notes[l.notes.length - 1].text) + '</p>' : '') +
      (l.pageKey ? '<span class="ld-meta">' + (l.stage === 'ballpark' ? 'Ballpark page' : 'Consultation page') + ' &middot; ' + (l.viewedAt ? 'opened ' + day(l.lastViewedAt || l.viewedAt) + (l.views > 1 ? ' (' + l.views + ' visits)' : '') : 'not opened yet') + '</span>' : '') +
      (l.status === 'project' && l.project ? '<a class="ld-link" href="admin-project.html?project=' + esc(l.project) + '">Open project &rarr;</a>' : '') +
      (open ? '<div class="ld-acts"><select data-act="status">' + Object.keys(STATUS).filter(function (k) { return k !== 'project'; }).map(function (k) { return '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + STATUS[k].replace(/&middot;/g, '·') + '</option>'; }).join('') + '</select>' +
        '<a class="ab-mini ghost" href="admin-lead.html?lead=' + encodeURIComponent(l.id) + '">' + (l.pageKey ? 'Lead page' : 'Make lead page') + '</a><button type="button" class="ab-mini ghost" data-act="consult">Consult date</button><button type="button" class="ab-mini ghost" data-act="note">Add note</button>' +
        '<a class="ab-mini" data-act="project" href="' + setupHref(l) + '">Turn into a project</a><button type="button" class="ld-del" data-act="delete" title="Delete lead">Delete</button></div>' : '<div class="ld-acts"><button type="button" class="ab-mini ghost" data-act="reopen">Reopen</button><button type="button" class="ld-del" data-act="delete">Delete</button></div>') +
      '</li>';
  }
  function setupHref(l) {
    return 'admin-setup.html?name=' + encodeURIComponent(l.name || '') + '&lead=' + encodeURIComponent(l.id) +
      (l.name ? '&person=' + encodeURIComponent(l.name) : '') + (l.email ? '&email=' + encodeURIComponent(l.email) : '') + (l.phone ? '&phone=' + encodeURIComponent(l.phone) : '') + (l.address ? '&address=' + encodeURIComponent(l.address) : '');
  }
  function draw() {
    var open = leads.filter(function (l) { return l.status !== 'project' && l.status !== 'lost'; }), closed = leads.length - open.length;
    var list = showClosed ? leads : open;
    document.getElementById('ld-list').innerHTML = list.length ? list.map(card).join('') : '<li class="ci-src">No open leads right now. New website leads will show up here.</li>';
    var more = document.getElementById('ld-more'); more.hidden = !closed; more.textContent = showClosed ? 'Hide closed leads' : 'Show closed leads (' + closed + ')';
  }
  function save(id, body) {
    return api('leads/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(body) }).then(function (r) {
      leads = leads.map(function (l) { return l.id === id ? r.lead : l; }); draw();
    }).catch(function () { alert('That didn’t save. Please try again.'); });
  }
  sec.addEventListener('change', function (e) { var s = e.target.closest('[data-act=status]'); if (!s) return; save(s.closest('.ld').dataset.id, { status: s.value }); });
  sec.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'A') return;
    var id = b.closest('.ld').dataset.id, l = leads.filter(function (x) { return x.id === id; })[0];
    if (b.dataset.act === 'consult') {
      var v = prompt('Consultation date and time (for example 2026-11-12 10:00). Leave blank to clear.', l.consult || '');
      if (v === null) return; v = v.trim().replace(' ', 'T');
      if (v && isNaN(new Date(v))) { alert('Use a date like 2026-11-12 10:00'); return; }
      save(id, v ? { consult: v, status: 'consult' } : { consult: '' });
    }
    if (b.dataset.act === 'note') { var n = prompt('Note about ' + (l.name || 'this lead') + ':'); if (n && n.trim()) save(id, { note: n.trim() }); }
    if (b.dataset.act === 'reopen') save(id, { status: 'contacted' });
    if (b.dataset.act === 'delete') {
      if (!confirm('Delete the lead for ' + (l.name || l.email || 'this person') + '? This can\u2019t be undone. (To keep it but close it, choose \u201cNot a fit\u201d instead.)')) return;
      api('leads/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { leads = leads.filter(function (x) { return x.id !== id; }); draw(); }).catch(function () { alert('That didn\u2019t delete. Please try again.'); });
    }
  });
  document.getElementById('ld-more').onclick = function () { showClosed = !showClosed; draw(); };
  document.getElementById('ld-add').onclick = function () { var f = document.getElementById('ld-new'); f.hidden = !f.hidden; if (!f.hidden) f.name.focus(); };
  document.getElementById('ld-new').addEventListener('submit', function (e) {
    var f = this, toPage = !(e.submitter && e.submitter.value === 'add');
    if (!f.name.value.trim()) { f.name.focus(); return; }
    api('leads', { method: 'POST', body: JSON.stringify({ name: f.name.value, phone: f.phone.value, email: f.email.value, address: f.address.value, message: f.message.value }) })
      .then(function (r) { if (toPage) { location.href = 'admin-lead.html?lead=' + encodeURIComponent(r.lead.id); return; } leads.unshift(r.lead); f.reset(); f.hidden = true; draw(); }).catch(function () { alert('That didn’t save.'); });
  });

  function load() {
    var P = window.SRPortal;
    if (!P || P.mode !== 'live') { document.getElementById('ld-list').innerHTML = '<li class="ci-src">Sign in to see leads.</li>'; return; }
    api('leads').then(function (j) { leads = j.leads || []; draw(); if (location.hash === '#leads') sec.scrollIntoView(); })
      .catch(function () { document.getElementById('ld-list').innerHTML = '<li class="ci-src">Couldn&rsquo;t load leads.</li>'; });
  }
  if (window.SRPortal) load(); else document.addEventListener('sr-portal-ready', load);
})();
