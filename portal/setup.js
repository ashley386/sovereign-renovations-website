/* Set up portal: creates (or edits) a project and, if Ashley chooses, emails each client their branded invite.
   Open with ?project=ID&name=...&type=... from a project card, or with no project for a brand-new one. ?step=5 jumps to the invite. */
(function () {
  var Q = new URLSearchParams(location.search);
  var form = document.getElementById('su-form'), panes = form.querySelectorAll('.su-pane'), steps = document.querySelectorAll('#su-steps li');
  var next = document.getElementById('su-next'), back = document.getElementById('su-back'), i = 0, existing = null, hasBoards = false;
  var id = (Q.get('project') || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  var GROUP_OF = { 'Cabinets': 'Cabinets', 'Cabinet hardware': 'Hardware & plumbing', 'Countertops': 'Countertops & tile', 'Tile': 'Countertops & tile', 'Sinks': 'Hardware & plumbing', 'Kitchen faucets': 'Hardware & plumbing', 'Bathroom faucets': 'Hardware & plumbing', 'Disposals': 'Hardware & plumbing', 'Range hoods': 'Hardware & plumbing', 'Lighting': 'Lighting', 'Fans': 'Lighting', 'Paint': 'Paint & finishes', 'Vanities': 'Bath', 'Shower trim & valves': 'Bath', 'Shower glass': 'Bath', 'Toilets': 'Bath', 'Mirrors': 'Bath', 'Bath hardware': 'Bath', 'Storage & organizers': 'Cabinets' };
  var EMAIL = {
    subject: 'Your Sovereign Renovations client portal is ready',
    text: 'Hi {first},\n\nYour client portal for the {project} is ready. It’s where you’ll see your selection boards, key dates and files, and where you can message us anytime.\n\nTo get started, choose a password:\n\n{link}\n\nAfter that, you can sign in anytime from the Client login link at the top of our website.\n\nWe’re so excited to get started!\n{me}\n\nThis link is just for you and works for 7 days. If it expires, we’ll send a new one.'
  };
  function $(x) { return document.getElementById(x); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function live() { return window.SRPortal && SRPortal.mode === 'live' ? SRPortal : null; }
  function meName() { var p = live(); var n = p && p.me && (p.me.name || p.me.email) || 'Ashley'; return n.split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }

  /* ---------- people ---------- */
  function person(c) {
    var d = document.createElement('div'); d.className = 'su-person';
    d.innerHTML = '<div class="ab-fields"><label>Name<input type="text" data-p="name" value="' + esc(c.name) + '"></label>' +
      '<label>Email<input type="text" data-p="email" placeholder="name@email.com" value="' + esc(c.email) + '"></label>' +
      '<label>Phone<input type="text" data-p="phone" placeholder="optional" value="' + esc(c.phone) + '"></label></div>' +
      (c.invitedAt || c.firstLogin ? '<span class="su-src">' + (c.firstLogin ? 'Signed in' : 'Invited ' + new Date(c.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + '</span> ' : '') +
      '<button type="button" class="ab-x" style="float:right">Remove</button>';
    d.querySelector('.ab-x').onclick = function () { d.remove(); };
    d._c = c; $('su-people').appendChild(d);
  }
  function people() {
    return Array.prototype.map.call($('su-people').children, function (d) {
      var o = { name: d.querySelector('[data-p=name]').value.trim(), email: d.querySelector('[data-p=email]').value.trim().toLowerCase(), phone: d.querySelector('[data-p=phone]').value.trim() };
      o._was = d._c || {}; return o;
    }).filter(function (c) { return c.name || c.email; });
  }
  $('su-add-person').onclick = function () { person({}); };

  /* ---------- dates ---------- */
  function dateRow(d) {
    var li = document.createElement('li');
    li.innerHTML = '<input type="text" data-d="what" placeholder="e.g. Tile selection with Nina" value="' + esc(d.what) + '"><input type="date" data-d="date" value="' + esc(d.date) + '"><button class="ab-x" type="button">Remove</button>';
    li.querySelector('.ab-x').onclick = function () { li.remove(); }; $('su-dates').appendChild(li);
  }
  $('su-add-date').onclick = function () { dateRow({}); };

  /* ---------- checklist preview ---------- */
  var L = (window.SRLibrary && SRLibrary.LISTS) || {};
  if (L.bath) $('su-n-bath').textContent = L.bath.items.length + ' draft boards';
  if (L.kitchen) $('su-n-kitchen').textContent = L.kitchen.items.length + ' draft boards';
  function chips() { var v = (form.querySelector('input[name=ck]:checked') || {}).value; $('su-chips').innerHTML = v && L[v] ? L[v].items.map(function (x) { return '<span>' + esc(x[0]) + '</span>'; }).join('') : ''; }
  form.querySelectorAll('input[name=ck]').forEach(function (r) { r.onchange = chips; });

  /* ---------- steps ---------- */
  function check(n) { // returns an error message for step n, or ''
    if (n === 0) {
      var ps = people(); if (!ps.length) return 'Add at least one person.';
      var bad = ps.filter(function (c) { return c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email); })[0];
      if (bad) return 'Check the email for ' + (bad.name || 'this person') + '.';
    }
    if (n === 1 && !form.name.value.trim()) return 'Give the project a name.';
    return '';
  }
  function refreshInvite() {
    var ps = people().filter(function (c) { return c.email; });
    $('su-to').textContent = ps.length ? ps.map(function (c) { return c.name ? c.name + ' <' + c.email + '>' : c.email; }).join(', ') : 'No one yet – add an email in step 1';
    $('su-now-note').textContent = ps.length ? 'Each person above gets their own email and link.' : 'Add an email in step 1 to send invites.';
    if (!form.emailText.dataset.touched) form.emailText.value = EMAIL.text.replace('{project}', form.name.value.trim() || 'your project').replace('{me}', meName());
  }
  form.emailText.addEventListener('input', function () { form.emailText.dataset.touched = '1'; });
  function show(n) {
    i = Math.max(0, Math.min(n, panes.length - 1));
    panes.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
    back.style.visibility = i === 0 ? 'hidden' : 'visible';
    var last = i === panes.length - 2;
    if (last) refreshInvite();
    next.textContent = last ? (form.when.value === 'later' ? 'Finish setup' : 'Finish & send invites') : 'Next';
    $('su-nav').style.display = i === panes.length - 1 ? 'none' : 'flex';
    $('su-err').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  next.onclick = function () {
    var err = check(i); if (err) { alert(err); return; }
    if (i === panes.length - 2) finish(); else show(i + 1);
  };
  back.onclick = function () { show(i - 1); };
  steps.forEach(function (s) { s.onclick = function () { var n = +s.dataset.go; for (var k = 0; k < n; k++) { var e = check(k); if (e) { show(k); alert(e); return; } } show(n); }; });
  form.querySelectorAll('input[name=when]').forEach(function (r) { r.onchange = function () { show(i); }; });

  /* ---------- finish ---------- */
  function finish() {
    var P = live(); if (!P) { alert('Sign in to the portal to save.'); return; }
    var ps = people(), name = form.name.value.trim();
    var sendNow = form.when.value === 'now', invitees = ps.filter(function (c) { return c.email; });
    if (sendNow && invitees.length && !/\{link\}/.test(form.emailText.value)) { alert('Keep {link} in the email – it becomes their Set up my portal button.'); return; }
    if (sendNow && invitees.length && !confirm('Send the invite email to ' + invitees.map(function (c) { return c.name || c.email; }).join(' and ') + ' now?')) return;
    if (!id) id = slug(name.replace(/\b(primary|kitchen|bath(room)?|remodel|laundry)\b/gi, '')) || slug(name) || rid();
    var hidden = {}; form.querySelectorAll('[data-vis]').forEach(function (c) { if (!c.checked) hidden[c.dataset.vis] = true; });
    var ck = (form.querySelector('input[name=ck]:checked') || {}).value, boards = [];
    if (ck && L[ck] && !hasBoards) L[ck].items.forEach(function (it) { boards.push({ id: rid(), name: it[0], group: GROUP_OF[it[1]] || (ck === 'bath' ? 'Bath' : 'Other'), due: '', limit: '', range: '', showRange: false, note: '', status: 'draft', options: [] }); });
    var dates = Array.prototype.map.call($('su-dates').children, function (li) { return { what: li.querySelector('[data-d=what]').value.trim(), date: li.querySelector('[data-d=date]').value }; }).filter(function (d) { return d.what; });
    var body = { id: id, name: name, type: form.type.value, phase: form.phase.value, total: Number(form.total.value) || 0, contact: form.contact.value, drive: form.drive.value.trim(), address: form.address.value.trim(),
      clients: ps.map(function (c) { return { name: c.name, email: c.email, phone: c.phone }; }), visibility: hidden, boards: boards, dates: dates };
    next.disabled = true; next.textContent = 'Saving…';
    P.api('projects', { method: 'POST', body: JSON.stringify(body) }).then(function () {
      if (!sendNow || !invitees.length) return [];
      return invitees.reduce(function (chain, c) {
        return chain.then(function (out) {
          return P.api('invite-email', { method: 'POST', body: JSON.stringify({ project: id, email: c.email, subject: form.subject.value, text: form.emailText.value }) })
            .then(function () { out.push([c, true]); return out; }).catch(function () { out.push([c, false]); return out; });
        });
      }, Promise.resolve([]));
    }).then(function (results) {
      $('su-done-h').textContent = name + (existing ? ' is updated' : '’s portal is ready');
      $('su-done-p').textContent = !sendNow || !invitees.length ? 'Nothing was emailed. Come back to this page and choose “Send invites now” when you’re ready.' : 'You’ll get an email when each person signs in for the first time.';
      $('su-results').innerHTML = results.map(function (r) { return '<li>' + (r[1] ? '✓ Invite sent to ' : '⚠ Couldn’t send to ') + esc(r[0].name || r[0].email) + ' &lt;' + esc(r[0].email) + '&gt;</li>'; }).join('');
      $('su-open').href = 'admin-project.html?project=' + encodeURIComponent(id); $('su-boards').href = 'admin-boards.html?project=' + encodeURIComponent(id);
      try { sessionStorage.setItem('sr-project', id); } catch (e) {}
      if (leadId) P.api('leads/' + encodeURIComponent(leadId), { method: 'PUT', body: JSON.stringify({ status: 'project', project: id }) }).catch(function () {});
      show(panes.length - 1);
    }).catch(function (e) {
      $('su-err').hidden = false; $('su-err').textContent = 'That didn’t save. ' + (String(e.message).indexOf('400') > -1 ? 'Check the names and emails.' : 'Please try again.');
    }).then(function () { next.disabled = false; if (i !== panes.length - 1) show(i); });
  }

  /* ---------- start ---------- */
  function fill(p) {
    existing = p; $('su-title').textContent = p.name; $('su-label').textContent = 'Edit portal setup';
    form.name.value = p.name; form.type.value = p.type || 'Bathroom'; if (p.phase) form.phase.value = p.phase; form.total.value = p.total || '';
    form.contact.value = p.contact || 'Ashley'; form.drive.value = p.drive || ''; form.address.value = p.address || '';
    $('su-people').innerHTML = ''; (p.clients.length ? p.clients : [{}]).forEach(person);
  }
  var qname = Q.get('name') || '', qtype = Q.get('type') || '';
  form.name.value = qname; $('su-title').textContent = qname || 'New project';
  var t = /bath/i.test(qtype) ? 'Bathroom' : /kitchen/i.test(qtype) ? 'Kitchen' : /laundry/i.test(qtype) ? 'Laundry' : '';
  if (t) form.type.value = t;
  var qph = Q.get('phase'); if (qph) Array.prototype.forEach.call(form.phase.options, function (o) { if (o.value.slice(0, 2) === qph) form.phase.value = o.value; });
  form.querySelector('input[name=ck][value="' + (t === 'Kitchen' ? 'kitchen' : t === 'Bathroom' ? 'bath' : '') + '"]').checked = true; chips();
  person(Q.get('person') || Q.get('email') ? { name: Q.get('person') || '', email: Q.get('email') || '', phone: Q.get('phone') || '' } : {}); form.subject.value = EMAIL.subject;
  if (Q.get('address')) form.address.value = Q.get('address');
  var leadId = Q.get('lead');
  if (leadId) $('su-label').textContent = 'Turn lead into a project';

  function boot() {
    var P = live(); if (!P || !id) { if (Q.get('step') === '5') show(4); return; }
    P.api('projects').then(function (j) {
      var p = (j.projects || []).filter(function (x) { return x.id === id; })[0];
      if (p) fill(p);
      return P.api('project/' + id).then(function (doc) {
        hasBoards = Array.isArray(doc.boards) && doc.boards.length > 0;
        if (hasBoards) $('su-start-sub').innerHTML = 'This project already has ' + doc.boards.length + ' selection boards, so the checklist won&rsquo;t add more. Key dates are only added if the project has none yet.';
        if (doc.visibility) form.querySelectorAll('[data-vis]').forEach(function (c) { c.checked = !doc.visibility[c.dataset.vis]; });
        if (Array.isArray(doc.dates)) doc.dates.forEach(dateRow);
      });
    }).catch(function () {}).then(function () { if (Q.get('step') === '5') show(4); });
  }
  if (window.SRPortal) boot(); else document.addEventListener('sr-portal-ready', boot);
  show(0);
})();
