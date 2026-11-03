/* Admin project pages, live: Key dates, Billing, Files and the project Dashboard.
   Everything is kept in this browser's copy of the project (localStorage) and auth.js saves each change to the
   server, so Ashley and Greg see the same thing on every phone and computer. Hidden items never reach the client. */
(function () {
  var K = { dates: 'sr-portal-dates', invoices: 'sr-portal-invoices', files: 'sr-portal-files', meta: 'sr-portal-meta', boards: 'sr-portal-boards',
    choices: 'sr-portal-choices', up: 'sr-portal-up', contract: 'sr-portal-contract', sig: 'sr-portal-contract-sig', messages: 'sr-portal-messages',
    cdates: 'sr-portal-client-dates', cfiles: 'sr-portal-client-files', hidden: 'sr-portal-hidden' };
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var SITE = 'https://sovereign-renovations.com/portal/';
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(K[k])); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { if (v == null || (Array.isArray(v) && !v.length)) localStorage.removeItem(K[k]); else localStorage.setItem(K[k], JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nice(iso) { var p = (iso || '').split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) : ''; }
  function todayISO() { var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
  function money(n) { n = Number(n) || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function live() { var p = window.SRPortal; return p && p.mode === 'live' ? p : null; }
  function client() { var m = get('meta', {}); var c = (m.clients || [])[0]; return c && c.name ? c.name.split(' ')[0] : 'the client'; }
  function me() { var p = live(); var n = p && p.me && (p.me.name || p.me.email) || 'Ashley'; return n.split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }
  function switchHTML(on, attr) { return '<label class="ap-vis"><span class="ap-vis-t">' + (on ? 'Client sees' : 'Hidden') + '</span><span class="ad-switch"><input type="checkbox" ' + attr + (on ? ' checked' : '') + '><span></span></span></label>'; }
  function flash(el, text) { if (!el) return; el.textContent = text; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(function () { el.hidden = true; }, 3500); }
  function ask(n) { return window.SRNotify && live() ? window.SRNotify.open(n) : Promise.resolve(false); }

  var css = '.lv-row{display:grid;grid-template-columns:56px 1fr auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--sr-rule)}' +
    '.lv-side{display:grid;gap:20px;align-content:start}.lv-side .ap-form{position:static}.lv-tag{font-style:normal;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:var(--sr-cream);color:#8a6a3c;padding:2px 6px;margin-left:6px;font-weight:400}' +
    '.lv-row.tbd{opacity:.7}.lv-row b{display:block;font-weight:500;color:var(--sr-ink);font-size:15px}.lv-row .lv-sub{font-size:13px;color:#8f897e}' +
    '.lv-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.lv-acts .ab-x{cursor:pointer}' +
    '.lv-file{grid-template-columns:44px 1fr auto}.lv-ok{font-size:14px;color:#55703f;margin:0}.lv-err{font-size:14px;color:#9b3b2b;margin:0}' +
    '.lv-edit .sr-btn.ghost{margin-left:6px}.ap-form .lv-btns{display:flex;gap:8px;flex-wrap:wrap}' +
    '.lv-btns [hidden],.lv-ok[hidden],.lv-err[hidden]{display:none!important}.ap-main>.ab-card,.ap-main .ap-tablewrap{min-width:0;max-width:100%}.ap-main{min-width:0}.ah-attn li a{color:inherit;text-decoration:none;display:block}.ah-attn li a:hover b{text-decoration:underline}.lv-stat-note{font-size:13px;color:#8f897e}.lv-inv-acts{white-space:nowrap}.lv-inv-acts .ab-x{margin-left:6px}' +
    '@media (max-width:640px){#lv-inv tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:12px 0;border-bottom:1px solid var(--sr-rule)}#lv-inv td{border:0;padding:0}#lv-inv td:nth-child(2){flex:1 1 55%}#lv-inv td:nth-child(3):empty{display:none}#lv-inv td:nth-child(7){margin-left:auto}.lv-inv-wrap thead{display:none}.lv-row{grid-template-columns:48px 1fr}.lv-acts{grid-column:1/-1;justify-content:flex-start}.lv-file{grid-template-columns:40px 1fr}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // Saving feedback: auth.js reports when the server saved (or didn't).
  document.addEventListener('sr-portal-save-failed', function () { var e = document.querySelector('.lv-err'); if (e) flash(e, 'That didn’t save. Check your connection and try again.'); });

  /* ================= Key dates ================= */
  function datesPage() {
    var list = $('lv-dates'), form = $('lv-date-form'); if (!list || !form) return;
    function draw() {
      var d = get('dates', []).slice().sort(function (a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : 1; });
      list.innerHTML = d.length ? d.map(function (x) {
        var p = (x.date || '').split('-'), has = p.length === 3;
        return '<li class="lv-row' + (has ? '' : ' tbd') + '" data-id="' + esc(x.id) + '"><div class="pt-day"><b>' + (has ? MON[+p[1] - 1] : 'TBD') + '</b><span>' + (has ? +p[2] : '&ndash;') + '</span></div>' +
          '<div><b>' + esc(x.what) + (x.sop ? ' <em class="lv-tag">' + (x.pinned ? 'SOP &middot; date set by hand' : 'SOP' + (x.approx ? ' &middot; approx.' : '')) + '</em>' : '') + '</b><span class="lv-sub">' + [x.time, x.who, x.note].filter(Boolean).map(esc).join(' &middot; ') + '</span></div>' +
          '<div class="lv-acts">' + switchHTML(x.show !== false, 'data-vis') + '<button class="ab-x" type="button" data-edit>Edit</button><button class="ab-x" type="button" data-del>Delete</button></div></li>';
      }).join('') : '<li class="ap-empty">No dates yet. Add the first one with the form.</li>';
    }
    function ensureIds() { var d = get('dates', []), ch = false; d.forEach(function (x) { if (!x.id) { x.id = uid(); ch = true; } }); if (ch) put('dates', d); }
    function reset() { form.reset(); delete form.dataset.id; form.show.checked = true; $('lv-date-save').textContent = 'Save date'; $('lv-date-cancel').hidden = true; $('lv-date-h').textContent = 'Add a date'; }
    list.addEventListener('change', function (e) {
      if (!e.target.matches('[data-vis]')) return;
      var id = e.target.closest('[data-id]').dataset.id, d = get('dates', []);
      d.forEach(function (x) { if (x.id === id) x.show = e.target.checked; }); put('dates', d); draw();
    });
    list.addEventListener('click', function (e) {
      var row = e.target.closest('[data-id]'); if (!row) return;
      var id = row.dataset.id, d = get('dates', []), x = d.filter(function (y) { return y.id === id; })[0]; if (!x) return;
      if (e.target.closest('[data-del]')) { if (confirm('Delete "' + x.what + '"?')) { put('dates', d.filter(function (y) { return y.id !== id; })); draw(); } return; }
      if (e.target.closest('[data-edit]')) {
        form.dataset.id = id; form.what.value = x.what; form.date.value = x.date || ''; form.time.value = x.time || ''; form.who.value = x.who || 'Ashley';
        form.note.value = x.note || ''; form.show.checked = x.show !== false; form.email.checked = false;
        $('lv-date-save').textContent = 'Save changes'; $('lv-date-cancel').hidden = false; $('lv-date-h').textContent = 'Edit date';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' }); form.what.focus();
      }
    });
    document.querySelectorAll('#lv-presets button').forEach(function (b) { b.onclick = function () { form.what.value = b.textContent; form.date.focus(); }; });
    $('lv-date-cancel').onclick = reset;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var what = form.what.value.trim(); if (!what) { form.what.focus(); return; }
      var d = get('dates', []), id = form.dataset.id, x = { id: id || uid(), what: what, date: form.date.value, time: form.time.value.trim(), who: form.who.value, note: form.note.value.trim(), show: form.show.checked };
      if (id) d = d.map(function (y) {
        if (y.id !== id) return y;
        var keep = y.sop ? { sop: y.sop, offset: y.offset, approx: y.approx, pinned: y.pinned || (y.date !== x.date) } : {};
        if (y.sop === 'start' && y.date !== x.date && window.SRSchedule) { keep.pinned = false; setTimeout(function () { SRSchedule.setStart(x.date); draw(); schedNote(); }, 0); }
        return Object.assign(keep, x);
      }); else d.push(x);
      put('dates', d); draw();
      var email = form.email.checked && x.show; reset(); flash($('lv-date-ok'), 'Saved.');
      if (email) ask({ kind: 'date', subject: x.what + (x.date ? ' on ' + nice(x.date) : ''), text: 'Hi {first},\n\nWe’ve added a date to your project schedule:\n\n' + x.what + (x.date ? '\n' + nice(x.date) + (x.time ? ' at ' + x.time : '') : '') + (x.note ? '\n\n' + x.note : '') + '\n\nYou can see all your key dates in your client portal:\n' + SITE + 'index.html#dates\n\nThanks,\n' + me() });
    });
    // Download the dated items as a calendar file (opens in Google Calendar, Apple Calendar or Outlook).
    var ex = $('lv-ics'); if (ex) ex.onclick = function (e) {
      e.preventDefault();
      var m = get('meta', {}), d = get('dates', []).filter(function (x) { return x.date; });
      if (!d.length) { alert('Add a date first.'); return; }
      var stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', clean = function (s) { return String(s || '').replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n'); };
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sovereign Renovations//Portal//EN'].concat(d.map(function (x) {
        var day = x.date.replace(/-/g, ''), next = new Date(x.date + 'T12:00:00'); next.setDate(next.getDate() + 1);
        var end = next.getFullYear() + ('0' + (next.getMonth() + 1)).slice(-2) + ('0' + next.getDate()).slice(-2);
        return ['BEGIN:VEVENT', 'UID:' + x.id + '@sovereign-renovations.com', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + day, 'DTEND;VALUE=DATE:' + end,
          'SUMMARY:' + clean((m.name ? m.name + ': ' : '') + x.what), 'DESCRIPTION:' + clean([x.time, x.who, x.note].filter(Boolean).join(' · ')), 'END:VEVENT'].join('\r\n');
      }), ['END:VCALENDAR']).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = (m.name || 'project').replace(/[^\w]+/g, '-') + '-dates.ics'; document.body.appendChild(a); a.click(); a.remove();
    };
    function schedNote() {
      if (!window.SRSchedule) return;
      var s = SRSchedule.start(), has = SRSchedule.has(), n = $('lv-sched-note');
      $('lv-start').value = s || '';
      $('lv-build').textContent = has ? 'Update schedule' : 'Build schedule from SOP';
      n.innerHTML = has ? 'Change the start date and press Update: every SOP date moves with it, except ones you changed by hand. Rows marked &ldquo;Client sees&rdquo; show on the client&rsquo;s dashboard.' : (s ? '' : 'Pick the approximate start date first.');
    }
    if ($('lv-build')) {
      $('lv-build').onclick = function () {
        var s = $('lv-start').value; if (!s) { $('lv-start').focus(); return; }
        if (SRSchedule.has()) SRSchedule.setStart(s); else SRSchedule.build(s);
        ensureIds(); draw(); schedNote(); flash($('lv-date-ok'), 'Schedule saved.');
      };
      schedNote();
    }
    ensureIds(); reset(); draw();
  }

  /* ================= Billing ================= */
  function billingPage() {
    var body = $('lv-inv'), form = $('lv-inv-form'); if (!body || !form) return;
    var LABEL = { draft: 'Not sent', sent: 'Due', paid: 'Paid' };
    function stats() {
      var inv = get('invoices', []), c = get('contract', {}), m = get('meta', {}), up = get('up', {});
      var total = (c && c.f && +c.f.total) || +m.total || 0, cos = (up.cos || []).reduce(function (t, x) { return t + (+x.amt || 0); }, 0);
      var paid = inv.filter(function (x) { return x.status === 'paid'; }), due = inv.filter(function (x) { return x.status === 'sent'; });
      $('lv-s-total').textContent = total ? money(total) : 'Not set'; $('lv-s-total-n').textContent = c && c.f && +c.f.total ? 'From the contract' : (total ? 'From project setup' : 'Set it in the contract');
      $('lv-s-up').textContent = '+' + money(cos); $('lv-s-up-n').textContent = (up.cos || []).length + ' upgrade' + ((up.cos || []).length === 1 ? '' : 's') + ' chosen';
      $('lv-s-paid').textContent = money(paid.reduce(function (t, x) { return t + (+x.amount || 0); }, 0));
      $('lv-s-paid-n').textContent = due.length ? money(due.reduce(function (t, x) { return t + (+x.amount || 0); }, 0)) + ' still due' : (total ? money(Math.max(0, total + cos - paid.reduce(function (t, x) { return t + (+x.amount || 0); }, 0))) + ' left on the job' : '');
    }
    function draw() {
      var inv = get('invoices', []);
      body.innerHTML = inv.length ? inv.map(function (x) {
        return '<tr data-id="' + esc(x.id) + '"><td><b>' + esc(x.num || '') + '</b></td><td>' + esc(x.title) + (x.note ? '<br><span class="lv-stat-note">' + esc(x.note) + '</span>' : '') + '</td><td>' + esc(x.due || '') + '</td>' +
          '<td class="r">' + (x.amount ? money(x.amount) : '&mdash;') + '</td><td><span class="pt-status' + (x.status === 'paid' ? ' paid' : '') + '">' + (LABEL[x.status] || 'Not sent') + '</span></td>' +
          '<td>' + switchHTML(x.show !== false, 'data-vis') + '</td><td class="lv-inv-acts">' + (x.url ? '<a class="ci-link" href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '') +
          '<button class="ab-x" type="button" data-edit>Edit</button><button class="ab-x" type="button" data-del>Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="7" class="ap-empty">No invoices yet. Add one with the form below.</td></tr>';
      stats();
    }
    function ensureIds() { var d = get('invoices', []), ch = false; d.forEach(function (x) { if (!x.id) { x.id = uid(); ch = true; } }); if (ch) put('invoices', d); }
    function reset() { form.reset(); delete form.dataset.id; form.show.checked = true; var n = get('invoices', []).length; form.num.value = n ? '' : '1'; $('lv-inv-save').textContent = 'Add invoice'; $('lv-inv-cancel').hidden = true; $('lv-inv-h').textContent = 'Add an invoice'; }
    body.addEventListener('change', function (e) {
      if (!e.target.matches('[data-vis]')) return;
      var id = e.target.closest('[data-id]').dataset.id, d = get('invoices', []);
      d.forEach(function (x) { if (x.id === id) x.show = e.target.checked; }); put('invoices', d); draw();
    });
    body.addEventListener('click', function (e) {
      var row = e.target.closest('[data-id]'); if (!row) return;
      var id = row.dataset.id, d = get('invoices', []), x = d.filter(function (y) { return y.id === id; })[0]; if (!x) return;
      if (e.target.closest('[data-del]')) { if (confirm('Delete "' + x.title + '"? This only removes it from the portal, not from QuickBooks.')) { put('invoices', d.filter(function (y) { return y.id !== id; })); draw(); } return; }
      if (e.target.closest('[data-edit]')) {
        form.dataset.id = id; form.num.value = x.num || ''; form.title.value = x.title; form.due.value = x.due || ''; form.amount.value = x.amount || '';
        form.status.value = x.status || 'draft'; form.url.value = x.url || ''; form.note.value = x.note || ''; form.show.checked = x.show !== false; form.email.checked = false;
        $('lv-inv-save').textContent = 'Save changes'; $('lv-inv-cancel').hidden = false; $('lv-inv-h').textContent = 'Edit invoice';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    $('lv-inv-cancel').onclick = reset;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = form.title.value.trim(); if (!title) { form.title.focus(); return; }
      var url = form.url.value.trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
      var d = get('invoices', []), id = form.dataset.id, x = { id: id || uid(), num: form.num.value.trim(), title: title, due: form.due.value.trim(), amount: parseFloat(String(form.amount.value).replace(/[$,]/g, '')) || 0,
        status: form.status.value, url: url, note: form.note.value.trim(), show: form.show.checked };
      if (id) d = d.map(function (y) { return y.id === id ? x : y; }); else d.push(x);
      put('invoices', d); draw();
      var email = form.email.checked && x.show; reset(); flash($('lv-inv-ok'), 'Saved.');
      if (email) ask({ kind: 'invoice', subject: x.status === 'paid' ? 'Thank you for your payment' : 'Invoice: ' + x.title, text: x.status === 'paid'
        ? 'Hi {first},\n\nThank you! We received your payment for ' + x.title + (x.amount ? ' (' + money(x.amount) + ')' : '') + '.\n\nYou can see your billing anytime in your client portal:\n' + SITE + 'index.html#invoices\n\nThanks,\n' + me()
        : 'Hi {first},\n\nYour invoice for ' + x.title + (x.amount ? ' (' + money(x.amount) + ')' : '') + ' is ready' + (x.due ? ', due ' + x.due : '') + '.' + (x.url ? '\n\nYou can view and pay it here:\n' + x.url : '') + '\n\nIt’s also in the Billing section of your client portal:\n' + SITE + 'index.html#invoices\n\nThanks,\n' + me() });
    });
    ensureIds(); reset(); draw();
  }

  /* ================= Files ================= */
  function filesPage() {
    var list = $('lv-files'), form = $('lv-file-form'); if (!list || !form) return;
    var FOLDERS = ['Plans', 'Estimates', 'Renderings', 'Photos', 'Care guides', 'Other'];
    function kind(n) { var e = (String(n).split('.').pop() || '').toUpperCase(); return e.length > 4 ? 'FILE' : e || 'FILE'; }
    function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function folders() { var f = FOLDERS.slice(); get('files', []).forEach(function (x) { if (x.folder && f.indexOf(x.folder) < 0) f.splice(f.length - 1, 0, x.folder); }); return f; }
    function fillFolders(keep) { form.folder.innerHTML = folders().map(function (f) { return '<option>' + esc(f) + '</option>'; }).join('') + '<option value="+">+ New folder</option>'; if (keep) form.folder.value = keep; }
    function draw() {
      var d = get('files', []), html = '';
      folders().forEach(function (f) {
        var mine = d.filter(function (x) { return (x.folder || 'Other') === f; }); if (!mine.length) return;
        html += '<li class="ap-fcat">' + esc(f) + '</li>' + mine.map(function (x) {
          var k = kind(x.name);
          return '<li class="lv-row lv-file" data-id="' + esc(x.id) + '"><div class="pt-doc-icon' + (/JPE?G|PNG|HEIC|GIF|WEBP/.test(k) ? ' img' : '') + '">' + esc(k) + '</div>' +
            '<div><b>' + esc(x.name) + '</b><span class="lv-sub">' + [x.size, nice(x.added), x.by ? 'by ' + x.by : ''].filter(Boolean).map(esc).join(' &middot; ') + '</span></div>' +
            '<div class="lv-acts">' + switchHTML(x.show !== false, 'data-vis') + (x.url ? '<a class="ab-x" href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '') + '<button class="ab-x" type="button" data-del>Remove</button></div></li>';
        }).join('');
      });
      list.innerHTML = html || '<li class="ap-empty">No files yet. Upload plans, estimates or renderings with the form.</li>';
    }
    list.addEventListener('change', function (e) {
      if (!e.target.matches('[data-vis]')) return;
      var id = e.target.closest('[data-id]').dataset.id, d = get('files', []);
      d.forEach(function (x) { if (x.id === id) x.show = e.target.checked; }); put('files', d); draw();
    });
    list.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del]')) return;
      var id = e.target.closest('[data-id]').dataset.id, d = get('files', []), x = d.filter(function (y) { return y.id === id; })[0];
      if (x && confirm('Remove "' + x.name + '" from the portal?')) { put('files', d.filter(function (y) { return y.id !== id; })); draw(); }
    });
    form.folder.addEventListener('change', function () {
      if (form.folder.value !== '+') return;
      var n = (prompt('Name the new folder') || '').trim().slice(0, 40);
      FOLDERS.splice(FOLDERS.length - 1, 0, n || 'Other'); fillFolders(n || 'Other');
    });
    var input = form.querySelector('input[type=file]'), picked = $('lv-picked');
    input.addEventListener('change', function () { picked.textContent = input.files.length ? Array.prototype.map.call(input.files, function (f) { return f.name; }).join(', ') : ''; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var files = Array.prototype.slice.call(input.files); if (!files.length) { input.click(); return; }
      if (!live() || !window.SRUpload) { alert('Sign in to the portal to upload files.'); return; }
      var btn = $('lv-file-save'), folder = form.folder.value === '+' ? 'Other' : form.folder.value, show = form.show.checked, email = form.email.checked && show;
      btn.disabled = true; btn.textContent = 'Uploading…';
      Promise.all(files.map(function (f) {
        return window.SRUpload(f).then(function (meta) { return { id: uid(), name: f.name, url: meta.url, size: size(meta.size || f.size), folder: folder, show: show, added: todayISO(), by: me() }; })
          .catch(function (err) { alert('“' + f.name + '” didn’t upload' + (err && err.message === 'too-large' ? ' because it’s over 5 MB.' : '. Please try again.')); return null; });
      })).then(function (rows) {
        btn.disabled = false; btn.textContent = 'Upload';
        rows = rows.filter(Boolean); if (!rows.length) return;
        put('files', get('files', []).concat(rows)); input.value = ''; picked.textContent = ''; draw(); flash($('lv-file-ok'), rows.length + ' file' + (rows.length === 1 ? '' : 's') + ' saved.');
        if (email) ask({ kind: 'file', subject: rows.length === 1 ? 'New file: ' + rows[0].name : rows.length + ' new files in your portal', text: 'Hi {first},\n\n' + (rows.length === 1 ? 'I’ve added a new file to your client portal: ' + rows[0].name : 'I’ve added ' + rows.length + ' new files to your client portal:\n' + rows.map(function (r) { return '• ' + r.name; }).join('\n')) + '\n\nYou can open ' + (rows.length === 1 ? 'it' : 'them') + ' here:\n' + SITE + 'index.html#files\n\nThanks,\n' + me() });
      });
    });
    var drive = $('lv-drive'), P = live();
    if (drive && P) P.api('projects').then(function (r) { var x = (r.projects || []).filter(function (y) { return y.id === P.project; })[0]; if (x && x.drive) { drive.href = /^https?:/i.test(x.drive) ? x.drive : 'https://' + x.drive; drive.hidden = false; } }).catch(function () {});
    fillFolders(); draw();
  }

  /* ================= Project dashboard ================= */
  function dashPage() {
    if (!$('lv-dash')) return;
    var m = get('meta', {}), boards = get('boards', []), choices = get('choices', {}), up = get('up', {}), c = get('contract', null), sig = get('sig', null);
    var dates = get('dates', []), inv = get('invoices', []), files = get('files', []), msgs = get('messages', []), cd = get('cdates', []), cf = get('cfiles', []), hidden = get('hidden', {});
    function set(id, html) { var el = $(id); if (el) el.innerHTML = html; }
    var who = client();
    if (m.name) {
      document.querySelectorAll('#lv-dash-name').forEach(function (h) { h.textContent = m.name; });
      set('lv-dash-label', 'Project dashboard &middot; ' + esc((m.clients || []).map(function (x) { return x.name; }).filter(Boolean).join(' & ') || m.name) + (m.address ? ' &middot; ' + esc(m.address.split(',')[0]) : ''));
      var num = parseInt(String(m.phase || '').slice(0, 2), 10);
      if (num) document.querySelectorAll('.pt-phases .ph').forEach(function (ph, i) { ph.classList.toggle('done', i + 1 < num); ph.classList.toggle('now', i + 1 === num); });
    }
    // Boards
    var sent = boards.filter(function (b) { return b.status === undefined || b.status === 'sent'; }), drafts = boards.length - sent.length;
    var chosen = sent.filter(function (b) { return choices[b.id] != null; }).length;
    set('lv-t-boards', boards.length ? '<b>' + boards.length + ' board' + (boards.length === 1 ? '' : 's') + '</b> &middot; ' + chosen + ' chosen &middot; ' + (sent.length - chosen) + ' waiting' + (drafts ? ' &middot; ' + drafts + ' draft' + (drafts === 1 ? '' : 's') : '') : 'No boards yet');
    // Dates
    var t = todayISO(), next = dates.filter(function (d) { return d.date && d.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    set('lv-t-dates', next ? 'Next: ' + esc(next.what) + ' ' + nice(next.date) : (dates.length ? dates.length + ' date' + (dates.length === 1 ? '' : 's') + ', none coming up' : 'No dates yet'));
    // Billing
    var paid = inv.filter(function (x) { return x.status === 'paid'; }), due = inv.filter(function (x) { return x.status === 'sent'; });
    set('lv-t-inv', inv.length ? paid.length + ' paid' + (due.length ? ' &middot; <b>' + due.length + ' due</b>' : '') + ' &middot; ' + money(paid.reduce(function (s, x) { return s + (+x.amount || 0); }, 0)) + ' received' : 'No invoices yet');
    // Files
    var shared = files.filter(function (f) { return f.show !== false; }).length;
    set('lv-t-files', files.length || cf.length ? shared + ' shared' + (files.length - shared ? ' &middot; ' + (files.length - shared) + ' hidden' : '') + (cf.length ? ' &middot; ' + cf.length + ' from ' + esc(who) : '') : 'No files yet');
    // Contract
    var cos = up.cos || [], coAmt = cos.reduce(function (s, x) { return s + (+x.amt || 0); }, 0);
    var cState = sig ? 'Signed' : (c && c.status === 'sent' ? '<b>Sent, waiting for signature</b>' : (c ? 'Draft' : 'No contract yet'));
    set('lv-t-contract', cState + (cos.length ? ' &middot; <b>+' + money(coAmt) + '</b> in upgrades' : ''));
    // Messages
    var last = msgs[msgs.length - 1];
    set('lv-t-msgs', last ? (last.from === 'client' ? '<b>' + esc(who) + ' is waiting for a reply</b>' : 'Last message ' + nice((last.at || '').slice(0, 10))) : 'No messages yet');
    // What the client sees
    var off = Object.keys(hidden).filter(function (k) { return hidden[k]; }).length;
    set('lv-t-vis', off ? off + ' item' + (off === 1 ? '' : 's') + ' hidden' : 'All sections visible');
    // Needs your attention
    var att = [];
    if (last && last.from === 'client') att.push('<a href="admin-messages.html"><b>New message</b> from ' + esc(who) + '</a>');
    if (cos.length) att.push('<a href="admin-contract.html"><b>' + cos.length + ' upgrade' + (cos.length === 1 ? '' : 's') + '</b> chosen by ' + esc(who) + ' &middot; +' + money(coAmt) + '</a>');
    if (sent.length - chosen > 0) att.push('<a href="admin-boards.html"><b>' + (sent.length - chosen) + ' selection board' + (sent.length - chosen === 1 ? '' : 's') + '</b> waiting on ' + esc(who) + '</a>');
    if (c && c.status === 'sent' && !sig) att.push('<a href="admin-contract.html"><b>Contract</b> sent and not signed yet</a>');
    if (cd.length) att.push('<a href="admin-dates.html"><b>' + cd.length + ' date' + (cd.length === 1 ? '' : 's') + '</b> added by ' + esc(who) + ' to plan around</a>');
    if (cf.length) att.push('<a href="admin-files.html"><b>' + cf.length + ' file' + (cf.length === 1 ? '' : 's') + '</b> uploaded by ' + esc(who) + '</a>');
    var ord = (function () { var o = {}; try { o = JSON.parse(localStorage.getItem('sr-portal-orders')) || {}; } catch (e) {} var it = o.items || {}, n = 0, sum = 0;
      sent.forEach(function (b) { var opts = b.options || [], c = choices[b.id], p = opts.filter(function (x) { return x.id === c; })[0] || (typeof c === 'number' ? opts[c] : null); if (p && !((it[b.id] || {}).status && it[b.id].status !== 'todo')) { n++; sum += (Number((it[b.id] || {}).cost != null ? it[b.id].cost : p.cost) || 0) * (Number(p.qty) || 1); } });
      (o.extra || []).forEach(function (x) { if (!x.status || x.status === 'todo') { n++; sum += (Number(x.cost) || 0) * (Number(x.qty) || 1); } }); return { n: n, sum: sum }; })();
    set('lv-t-orders', ord.n ? '<b>' + ord.n + ' to order</b> &middot; ' + money(ord.sum) : 'Nothing waiting to order');
    if (ord.n) att.push('<a href="admin-orders.html"><b>' + ord.n + ' item' + (ord.n === 1 ? '' : 's') + '</b> to order &middot; ' + money(ord.sum) + '</a>');
    if (due.length) att.push('<a href="admin-invoices.html"><b>' + due.length + ' invoice' + (due.length === 1 ? '' : 's') + '</b> waiting for payment</a>');
    if (next && next.date <= (function () { var d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })()) att.push('<a href="admin-dates.html"><b>This week:</b> ' + esc(next.what) + ' ' + nice(next.date) + '</a>');
    set('lv-attn', att.length ? att.map(function (a) { return '<li>' + a + '</li>'; }).join('') : '<li>Nothing waiting right now.</li>');
  }

  function start() { datesPage(); billingPage(); filesPage(); dashPage(); }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
