/* Leads on the All projects page. Website contact-form leads arrive on their own; leads can also be added by hand.
   Each lead: call/email links, the message, status, consultation date, notes, and "Turn into a project". */
(function () {
  var sec = document.querySelector('.ah-leads'); if (!sec) return;
  sec.id = 'leads';
  var STATUS = { new: 'New &middot; needs contact', contacted: 'Followed up', consult: 'Consult scheduled', owe: 'Owe them ballpark', ballpark: 'Ballpark sent &middot; waiting on client', followed: 'Ballpark followed up', signed: 'Agreement signed &middot; waiting on deposit', paid: 'Deposit paid &middot; set up the project', project: 'Now a project', lost: 'Not a fit', ghosted: 'Ghosted &middot; closed' };
  var DONE = { contact: 'Contacted', schedule: 'Set consult date', owe: 'Consult done', ballpark: 'Ballpark sent', spam: 'Texted', follow: 'Followed up', checkin: 'Checked in', deposit: 'Deposit paid' };
  function todayISO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  function dueText(d) { var t = todayISO(); if (d < t) return 'Overdue &middot; was due ' + day(d + 'T12:00:00'); if (d === t) return 'Due today'; return 'Due ' + day(d + 'T12:00:00'); }
  var leads = [], showClosed = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function when(v) { var d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (v.length > 10 ? ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''); }
  function api(path, o) { return window.SRPortal.api(path, o); }

  sec.innerHTML = '<div class="ab-card-head"><h2>Leads</h2><div class="ld-head"><span class="ci-src">Website form leads show up here on their own</span><button class="ab-mini ghost" type="button" id="ld-add">+ Add a lead</button></div></div>' +
    '<form class="ld-new" id="ld-new" hidden onsubmit="return false"><input name="name" placeholder="Name" required><input name="phone" placeholder="Phone"><input name="email" placeholder="Email"><input name="address" placeholder="Address"><input name="message" placeholder="What are they thinking about?"><button class="sr-btn" type="submit" value="page">Add &amp; make their lead page</button><button class="sr-btn ghost" type="submit" value="add">Just add the lead</button></form>' +
    '<ul class="ld-list" id="ld-list"><li class="ci-src">Loading&hellip;</li></ul><button class="ld-more" type="button" id="ld-more" hidden></button>';

  function card(l) {
    var open = l.status !== 'project' && l.status !== 'lost' && l.status !== 'ghosted';
    return '<li class="ld ' + esc(l.status) + '" data-id="' + esc(l.id) + '">' +
      '<div class="ld-top"><b>' + esc(l.name || l.email || 'Website lead') + '</b><span class="ld-st">' + (STATUS[l.status] || esc(l.status)) + '</span></div>' +
      '<span class="ld-meta">' + (l.source === 'website' ? 'From website' : 'Added by hand') + ' &middot; ' + day(l.at) + (l.consult ? ' &middot; consult ' + esc(when(l.consult)) : '') + '</span>' +
      (l.phone || l.email ? '<span class="ld-contact">' + (l.phone ? '<a href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a>' : '') + (l.phone && l.email ? ' &middot; ' : '') + (l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' : '') + '</span>' : '') +
      (l.address ? '<span class="ld-contact"><a href="https://maps.google.com/?q=' + encodeURIComponent(l.address) + '" target="_blank" rel="noopener">' + esc(l.address) + '</a></span>' : '') +
      (l.next ? '<div class="ld-next' + (l.next.due < todayISO() ? ' late' : l.next.due === todayISO() ? ' today' : '') + '"><span><b>Next:</b> ' + esc(l.next.text) + '</span><span class="ld-due">' + dueText(l.next.due) + '</span>' +
        (l.next.key === 'follow' || l.next.key === 'checkin' ? '<span class="ld-draft">' + (l.email ? '<button type="button" class="ab-mini" data-act="draft-email" data-step="' + l.next.key + '">Review email</button>' : '') +
          (l.phone ? '<button type="button" class="ab-mini ghost" data-act="draft-text" data-step="' + l.next.key + '">Copy text</button>' : '') +
          '<button type="button" class="ab-mini ghost" data-act="done" data-step="' + l.next.key + '" data-how="other">' + (l.email || l.phone ? 'Did it another way &#10003;' : 'Done &#10003;') + '</button></span>' :
         l.next.key === 'setup' ? '<a class="ab-mini" href="' + setupHref(l) + '">Set up</a>' : DONE[l.next.key] ? '<button type="button" class="ab-mini" data-act="done" data-step="' + l.next.key + '">' + DONE[l.next.key] + ' &#10003;</button>' : '') + '</div>' : '') +
      (l.message ? '<p class="ld-msg">&ldquo;' + esc(l.message.length > 220 ? l.message.slice(0, 220) + '…' : l.message) + '&rdquo;</p>' : '') +
      ((l.notes || []).length ? '<p class="ld-note">' + esc(l.notes[l.notes.length - 1].text) + '</p>' : '') +
      (l.pageKey ? '<span class="ld-meta">' + (l.stage === 'ballpark' ? 'Ballpark page' : 'Consultation page') + ' &middot; ' + (l.viewedAt ? 'opened ' + day(l.lastViewedAt || l.viewedAt) + (l.views > 1 ? ' (' + l.views + ' visits)' : '') : 'not opened yet') + '</span>' : '') +
      (l.status === 'project' && l.project ? '<a class="ld-link" href="admin-project.html?project=' + esc(l.project) + '">Open project &rarr;</a>' : '') +
      (open ? '<div class="ld-acts"><select data-act="status">' + Object.keys(STATUS).filter(function (k) { return k !== 'project'; }).map(function (k) { return '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + STATUS[k].replace(/&middot;/g, '·') + '</option>'; }).join('') + '</select>' +
        '<a class="ab-mini ghost" href="admin-lead.html?lead=' + encodeURIComponent(l.id) + '">' + (l.pageKey ? 'Lead page' : 'Make lead page') + '</a><button type="button" class="ab-mini ghost" data-act="consult">Consult date</button><button type="button" class="ab-mini ghost" data-act="note">Add note</button>' +
        '<a class="ab-mini" data-act="project" href="' + setupHref(l) + '">Turn into a project</a><button type="button" class="ld-del" data-act="delete" title="Delete lead">Delete</button></div>' : '<div class="ld-acts"><button type="button" class="ab-mini ghost" data-act="reopen">Reopen</button><button type="button" class="ld-del" data-act="delete">Delete</button></div>') +
      '</li>';
  }
  function first(l) { return ((l.name || '').split(/\s+/)[0]) || 'there'; }
  function me() { var p = window.SRPortal; var n = p && p.me && (p.me.name || p.me.email) || 'Ashley'; return n.split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }
  function draft(l, step) {
    var room = l.room || 'project', link = l.pageKey ? location.origin + '/portal/lead.html?k=' + l.pageKey : '';
    if (step === 'follow') return {
      subject: 'Checking in on your ' + room + ' ballpark',
      email: 'Hi {first},\n\nI wanted to make sure you received the ballpark for your ' + room + ' and see if you have any questions.' + (link ? ' You can look it over anytime here:\n\n' + link + '\n\n' : '\n\n') +
        'When you\u2019re ready to start design & estimate, just let us know' + (link ? ' (or use the button on that page)' : '') + '. We\u2019re happy to talk it through by phone too.\n\nThanks,\n' + me(),
      text: 'Hi ' + first(l) + ', it\u2019s ' + me() + ' with Sovereign Renovations. Just checking that you got the ballpark for your ' + room + '. Any questions?' + (link ? ' Here it is again: ' + link : '') };
    return {
      subject: 'Your ' + room + ' project',
      email: 'Hi {first},\n\nJust checking in on your ' + room + ' project. Whenever you\u2019re ready to move forward, or if anything has changed, we\u2019re here to help.' + (link ? '\n\nYour concept and ballpark are still here:\n' + link : '') + '\n\nThanks,\n' + me(),
      text: 'Hi ' + first(l) + ', it\u2019s ' + me() + ' with Sovereign Renovations, just checking in on your ' + room + ' project. Happy to answer any questions whenever you\u2019re ready.' };
  }
  function setupHref(l) {
    return 'admin-setup.html?name=' + encodeURIComponent(l.name || '') + '&lead=' + encodeURIComponent(l.id) +
      (l.name ? '&person=' + encodeURIComponent(l.name) : '') + (l.email ? '&email=' + encodeURIComponent(l.email) : '') + (l.phone ? '&phone=' + encodeURIComponent(l.phone) : '') + (l.address ? '&address=' + encodeURIComponent(l.address) : '');
  }
  function draw() {
    var open = leads.filter(function (l) { return l.status !== 'project' && l.status !== 'lost' && l.status !== 'ghosted'; }), closed = leads.length - open.length;
    open.sort(function (a, b) { return ((a.next && a.next.due) || '9999') < ((b.next && b.next.due) || '9999') ? -1 : 1; });
    var list = showClosed ? open.concat(leads.filter(function (l) { return open.indexOf(l) < 0; })) : open;
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
    if (b.dataset.act === 'draft-email') {
      var dr = draft(l, b.dataset.step);
      if (!window.SRNotify) { alert('Email preview isn\u2019t available. Reload the page and try again.'); return; }
      window.SRNotify.open({ kind: 'lead-' + b.dataset.step, label: 'Email to ' + esc(first(l)), to: [{ name: l.name || '', email: l.email }], endpoint: 'leads/' + encodeURIComponent(id) + '/email', subject: dr.subject, text: dr.email })
        .then(function (sent) { if (sent) load(); });
      return;
    }
    if (b.dataset.act === 'draft-text') {
      var t = draft(l, b.dataset.step).text, step = b.dataset.step;
      var done = function (msg) { if (confirm(msg + '\n\nPaste it into Messages and send it to ' + (l.phone || 'them') + '. Did you send it? (OK marks this follow-up done.)')) save(id, { step: step, how: 'text' }); };
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { done('Text copied.'); }).catch(function () { prompt('Copy this text:', t); done('Text ready.'); });
      return;
    }
    if (b.dataset.act === 'done' && (b.dataset.step === 'follow' || b.dataset.step === 'checkin')) { save(id, { step: b.dataset.step, how: 'call' }); return; }
    if (b.dataset.act === 'done') {
      var st = b.dataset.step, to = { contact: 'contacted', owe: 'owe', ballpark: 'ballpark', deposit: 'paid' }[st];
      if (st === 'schedule') { b.dataset.act = 'consult'; }
      else if (to) { save(id, { status: to }); return; }
      else { save(id, { step: st }); return; }
    }
    if (b.dataset.act === 'consult') {
      var v = prompt('Consultation date and time (for example 2026-11-12 10:00). Leave blank to clear.', l.consult || '');
      if (v === null) return; v = v.trim().replace(' ', 'T');
      if (v && isNaN(new Date(v))) { alert('Use a date like 2026-11-12 10:00'); return; }
      save(id, v ? { consult: v, status: 'consult' } : { consult: '' });
    }
    if (b.dataset.act === 'note') { var n = prompt('Note about ' + (l.name || 'this lead') + ':'); if (n && n.trim()) save(id, { note: n.trim() }); }
    if (b.dataset.act === 'reopen') save(id, { status: 'contacted' });
    if (b.dataset.act === 'delete') {
      if (!confirm('Delete the lead for ' + (l.name || l.email || 'this person') + '? This can\u2019t be undone. (To keep it but close it, choose \u201cNot a fit\u201d or \u201cGhosted\u201d instead.)')) return;
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

(function () { var st = document.createElement('style'); st.textContent =
  '.ld-next{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;background:#f6f1e6;border-left:3px solid var(--sr-gold,#c8a97e);padding:8px 10px;margin:8px 0;font-size:14px}' +
  '.ld-draft{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}.ld-draft .ab-mini{cursor:pointer}.ld-next .ld-due{font-size:12px;letter-spacing:.06em;color:#8a6a3c}.ld-next .ab-mini{margin-left:auto;cursor:pointer}' +
  '.ld-next.today{background:#fdf3dc}.ld-next.late{background:#fbe9e7;border-left-color:#b3261e}.ld-next.late .ld-due{color:#b3261e;font-weight:500}';
  document.head.appendChild(st); })();
