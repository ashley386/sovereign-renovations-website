/* Preview mockup: things the client adds (dates, files, change-order approvals)
   are kept in this browser's localStorage so both the client view and the
   admin view can show them. In the working version these will be saved to the
   portal's database instead. */
(function () {
  var KEYS = { dates: 'sr-portal-client-dates', files: 'sr-portal-client-files', co: 'sr-portal-co' };
  var CONTRACT_BASE = (function () { try { var c = JSON.parse(localStorage.getItem('sr-portal-contract')); return c && c.f && +c.f.total ? +c.f.total : 0; } catch (e) { return 0; } })();
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var COS = [
    { id: 'CO-1', title: 'Countertop upgrade', choice: 'Warm quartz, gold veining', why: 'Upgrade over the estimate range for countertops.', amt: 480 },
    { id: 'CO-2', title: 'Kitchen faucet upgrade', choice: 'Bridge-style faucet with sprayer', why: 'Upgrade over the faucet allowance.', amt: 175 }
  ];

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(KEYS[k])); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEYS[k], JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function parts(iso) { var p = (iso || '').split('-'); return p.length === 3 ? { m: MON[+p[1] - 1], d: +p[2] } : null; }
  function nice(iso) { var p = parts(iso); return p ? p.m + ' ' + p.d : ''; }
  function today() { var t = new Date(); return MON[t.getMonth()] + ' ' + t.getDate(); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function range(x) { return nice(x.from) + (x.to && x.to !== x.from ? ' – ' + nice(x.to) : ''); }
  function kind(name) { var e = (name.split('.').pop() || '').toUpperCase(); return e.length > 4 ? 'FILE' : e || 'FILE'; }
  function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function $(id) { return document.getElementById(id); }

  /* ---------- Client-added dates ---------- */
  function clientDates() {
    var list = $('pt-dates'), form = $('pt-add-date');
    if (!list) return;
    function draw() {
      list.querySelectorAll('li.mine').forEach(function (li) { li.remove(); });
      load('dates', []).forEach(function (x, i) {
        var p = parts(x.from); if (!p) return;
        var li = document.createElement('li'); li.className = 'mine';
        li.innerHTML = '<div class="pt-day"><b>' + p.m + '</b><span>' + p.d + '</span></div><div><b>' + esc(x.what) +
          ' <em class="pt-mine-tag">Added by you</em></b><span>' + range(x) + (x.note ? ' &middot; ' + esc(x.note) : '') +
          '</span></div><button type="button" class="pt-rm" data-i="' + i + '" aria-label="Remove">Remove</button>';
        list.appendChild(li);
      });
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.pt-rm'); if (!b) return;
      var d = load('dates', []); d.splice(+b.dataset.i, 1); save('dates', d); draw();
    });
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var what = form.what.value === 'Other' ? (form.other.value.trim() || 'Not available') : form.what.value;
      if (!form.from.value) { form.from.focus(); return; }
      var d = load('dates', []); d.push({ what: what, from: form.from.value, to: form.to.value, note: form.note.value.trim(), added: today() });
      save('dates', d); form.reset(); form.closest('details').open = false; draw();
      var ok = $('pt-date-ok'); if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 4000); }
    });
    if (form) form.what.addEventListener('change', function () { form.other.parentNode.hidden = form.what.value !== 'Other'; });
    draw();
  }

  function adminDates() {
    var box = $('ap-client-dates'); if (!box) return;
    var d = load('dates', []);
    if (!d.length) { box.innerHTML = '<p class="ap-empty">Nothing from Janet yet. When she adds a date (like a vacation), it shows here so you can plan around it.</p>'; return; }
    box.innerHTML = d.map(function (x) {
      var p = parts(x.from);
      return '<li class="ap-date ap-from-client"><div class="pt-day"><b>' + p.m + '</b><span>' + p.d + '</span></div><div class="ap-date-body"><b>' +
        esc(x.what) + '</b><span>' + range(x) + (x.note ? ' &middot; &ldquo;' + esc(x.note) + '&rdquo;' : '') + '</span></div>' +
        '<span class="ap-owner">Janet &middot; added ' + esc(x.added) + '</span><span class="ap-flag">Work around</span><button class="ab-x" type="button">Add to calendar</button></li>';
    }).join('');
  }

  /* ---------- Uploads (saved on the portal server; preview mode keeps just the name) ---------- */
  function shrink(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 4500000) return Promise.resolve(f);
    return new Promise(function (ok) {
      var img = new Image(), u = URL.createObjectURL(f);
      img.onload = function () { var k = Math.min(1, 2400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); b.name = f.name.replace(/\.\w+$/, '') + '.jpg'; ok(b); }, 'image/jpeg', 0.86); };
      img.onerror = function () { ok(f); }; img.src = u;
    });
  }
  function upload(f) {
    var P = window.SRPortal; if (!P || P.mode !== 'live') return Promise.resolve(null);
    return shrink(f).then(function (b) {
      if (b.size > 5500000) throw new Error('too-large');
      return fetch('/api/portal/project/' + P.project + '/upload', { method: 'POST', credentials: 'same-origin', body: b,
        headers: { 'Content-Type': b.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(b.name || f.name) } })
        .then(function (r) { if (!r.ok) throw new Error(r.status === 413 ? 'too-large' : 'upload'); return r.json(); }).then(function (j) { return j.file; });
    });
  }
  window.SRUpload = upload;

  /* ---------- Client uploads ---------- */
  function clientFiles() {
    var list = $('pt-files'), input = $('pt-upload');
    if (!list) return;
    function draw() {
      list.querySelectorAll('li.mine').forEach(function (li) { li.remove(); });
      load('files', []).forEach(function (f, i) {
        var li = document.createElement('li'); li.className = 'mine';
        li.innerHTML = '<div class="pt-doc-icon' + (/JPE?G|PNG|HEIC|GIF/.test(f.type) ? ' img' : '') + '">' + esc(f.type) + '</div><div><b>' + esc(f.name) +
          '</b><span>Uploaded by you &middot; ' + esc(f.added) + ' &middot; ' + esc(f.size) + (f.url ? ' &middot; <a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a>' : '') + '</span></div><button type="button" class="pt-rm" data-i="' + i + '">Remove</button>';
        list.appendChild(li);
      });
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.pt-rm'); if (!b) return;
      var d = load('files', []); d.splice(+b.dataset.i, 1); save('files', d); draw();
    });
    if (input) input.addEventListener('change', function () {
      var note = $('pt-up-note') ? $('pt-up-note').value.trim() : '', picked = Array.prototype.slice.call(input.files);
      input.value = '';
      Promise.all(picked.map(function (f) {
        return upload(f).then(function (meta) { return { name: f.name, type: kind(f.name), size: size(meta ? meta.size : f.size), added: today(), note: note, url: meta ? meta.url : '' }; })
          .catch(function (e) { alert('Sorry, "' + f.name + '" could not be uploaded' + (e && e.message === 'too-large' ? ' because it is over 5 MB.' : '. Please try again.')); return null; });
      })).then(function (rows) {
        rows = rows.filter(Boolean); if (!rows.length) return;
        var d = load('files', []); save('files', d.concat(rows)); draw();
        var ok = $('pt-file-ok'); if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 4000); }
      });
    });
    draw();
  }

  function adminFiles() {
    var box = $('ap-client-files'); if (!box) return;
    var d = load('files', []);
    box.innerHTML = '<li class="ap-fcat">From Janet</li>' + (d.length ? d.map(function (f) {
      return '<li class="ap-file ap-from-client"><div class="pt-doc-icon' + (/JPE?G|PNG|HEIC|GIF/.test(f.type) ? ' img' : '') + '">' + esc(f.type) + '</div><div><b>' + esc(f.name) +
        '</b><span>' + esc(f.type) + ' &middot; ' + esc(f.size) + ' &middot; uploaded by Janet ' + esc(f.added) + (f.note ? ' &middot; &ldquo;' + esc(f.note) + '&rdquo;' : '') +
        '</span></div><span class="ap-flag">New</span>' + (f.url ? '<a class="ab-x" href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a>' : '') + '</li>';
    }).join('') : '<li class="ap-empty">Nothing yet. Files Janet uploads (photos, inspiration, an HOA form) land here and in the Drive project folder.</li>');
  }

  /* ---------- Change orders ----------
     Every upgrade Janet picks on a selection board is a change order, approved
     at the moment she chooses it (the board tells her choosing an upgrade means
     she agrees to it and its amount). */
  function cos() { var u = {}; try { u = JSON.parse(localStorage.getItem('sr-portal-up') || '{}'); } catch (e) {} return (u.cos || []).map(function (c, i) { c.id = 'CO-' + (i + 1); return c; }); }
  function totalsHTML(list, cls) {
    var a = list.reduce(function (t, c) { return t + c.amt; }, 0);
    if (!CONTRACT_BASE) return '<div class="' + cls + '"><span>Change orders so far</span><b>+' + money(a) + '</b><span>Contract total</span><b>set when the contract is sent</b></div>';
    return '<div class="' + cls + '"><span>Contract</span><b>' + money(CONTRACT_BASE) + '</b><span>+ change orders</span><b>+' + money(a) +
      '</b><span>= revised total</span><b>' + money(CONTRACT_BASE + a) + '</b></div>';
  }
  function coRow(c, who) {
    return '<div class="' + (who === 'admin' ? 'ap-co approved' : 'pt-co-item') + '"><div class="' + (who === 'admin' ? 'ap-co-head' : 'pt-co-top') + '"><b>' + c.id + ' &middot; ' + esc(c.title) + ' upgrade</b>' +
      (who === 'admin' ? '<span class="pt-status paid">Approved by Janet &middot; ' + esc(c.date) + '</span>' : '<span class="pt-co-amt">+' + money(c.amt) + '</span>') + '</div>' +
      '<p>' + (who === 'admin' ? 'Janet chose' : 'You chose') + ' <b>' + esc(c.choice) + '</b> (' + esc(c.letter) + ') on the selection board.</p>' +
      (who === 'admin' ? '<div class="ap-co-amt"><span>Amount</span><b>+' + money(c.amt) + '</b></div>' : '<span class="pt-status paid">Approved ' + esc(c.date) + '</span>') + '</div>';
  }

  function clientCO() {
    var box = $('pt-co'); if (!box) return;
    var list = cos(); if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<h3 class="pt-co-h">Change orders</h3>' + list.map(function (c) { return coRow(c, 'client'); }).join('') +
      '<p class="pt-co-note">These are the upgrades you chose on your <a href="selections.html">selection boards</a>. To change one, pick a different option there.</p>' + totalsHTML(list, 'pt-co-total');
  }

  function adminCO() {
    var box = $('ap-co'); if (!box) return;
    var list = cos();
    box.innerHTML = (list.length ? list.map(function (c) { return coRow(c, 'admin'); }).join('')
      : '<p class="ap-empty">No change orders yet. When Janet chooses an upgrade on a <a href="selections.html">selection board</a>, it&rsquo;s approved and listed here automatically.</p>') +
      totalsHTML(list, 'ap-co-total') +
      '<p class="ci-src">Each upgrade Janet chooses on her selection boards is approved when she picks it and added here with the date. If she switches to another option, the change order updates.</p>';
  }

  clientDates(); adminDates(); clientFiles(); adminFiles(); clientCO(); adminCO();
  window.addEventListener('storage', function () { adminDates(); adminFiles(); });
})();
