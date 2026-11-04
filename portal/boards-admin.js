/* Selection board builder (admin). Boards live in sr-portal-boards, which auth.js saves to the portal server.
   Clients only ever receive boards marked "sent", without your costs, vendors or links (the server strips them). */
(function () {
  var KEY = 'sr-portal-boards', MARKUP = 1.25;
  var GROUPS = ['Cabinets', 'Countertops & tile', 'Hardware & plumbing', 'Lighting', 'Bath', 'Paint & finishes', 'Other'];
  var boards = read(), cur = null, saveTimer = null;
  var $ = function (id) { return document.getElementById(id); };

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function choices() { try { return JSON.parse(localStorage.getItem('sr-portal-choices')) || {}; } catch (e) { return {}; } }
  function choiceDates() { try { return JSON.parse(localStorage.getItem('sr-portal-choice-dates')) || {}; } catch (e) { return {}; } }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function price(o) { return (Number(o.cost) || 0) * MARKUP * (Number(o.qty) || 1); }
  function over(b, o) { var l = Number(b.limit) || 0; return l > 0 ? Math.max(0, Math.round(price(o) - l)) : 0; }
  function letters(b) { (b.options || []).forEach(function (o, i) { o.letter = String.fromCharCode(65 + i); }); }
  function chosen(b) { // the option the client picked (stored by option id; older saves used the position)
    var c = choices()[b.id]; if (c == null) return null;
    return (b.options || []).filter(function (o) { return o.id === c; })[0] || (typeof c === 'number' ? (b.options || [])[c] : null) || null;
  }

  function save(now) {
    clearTimeout(saveTimer);
    $('ab-saved').textContent = 'Saving…';
    saveTimer = setTimeout(function () { localStorage.setItem(KEY, JSON.stringify(boards)); if (!(window.SRPortal && SRPortal.mode === 'live')) $('ab-saved').textContent = 'Saved in this browser (preview)'; }, now ? 0 : 500);
  }
  document.addEventListener('sr-portal-saved', function (e) { if (e.detail.key === KEY) $('ab-saved').textContent = 'All changes saved ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); });
  document.addEventListener('sr-portal-save-failed', function (e) { if (e.detail.key === KEY) $('ab-saved').textContent = 'Not saved – check your connection and try again'; });

  /* ---------- side list ---------- */
  function status(b) {
    if (b.status !== 'sent') return '<i class="st draft">Draft</i>';
    var o = chosen(b); if (!o) return '<i class="st wait">Waiting</i>';
    var up = over(b, o); return up ? '<i class="st up">Upgrade +' + money(up) + '</i>' : '<i class="st ok">Chose ' + esc(o.letter) + '</i>';
  }
  function side() {
    var html = '', total = 0;
    GROUPS.concat(boards.map(function (b) { return b.group; })).filter(function (g, i, a) { return g && a.indexOf(g) === i; }).forEach(function (g) {
      var list = boards.filter(function (b) { return (b.group || 'Other') === g; }); if (!list.length) return;
      html += '<div class="ab-group">' + esc(g) + '</div>' + list.map(function (b) {
        return '<a class="ab-item' + (cur && b.id === cur.id ? ' on' : '') + '" href="#' + b.id + '" data-id="' + b.id + '"><span>' + esc(b.name || 'Untitled board') + '</span>' + status(b) + '</a>';
      }).join('');
    });
    boards.forEach(function (b) { var o = b.status === 'sent' && chosen(b); if (o) total += over(b, o); });
    $('ab-list').innerHTML = html || '<p class="ab-empty">No boards yet. Start one above, or start from a checklist.</p>';
    $('ab-total').innerHTML = 'Client upgrades so far <b>+' + money(total) + '</b>';
  }
  $('ab-list').addEventListener('click', function (e) { var a = e.target.closest('[data-id]'); if (!a) return; e.preventDefault(); open(a.dataset.id); });

  /* ---------- editor ---------- */
  function open(id) {
    cur = boards.filter(function (b) { return b.id === id; })[0] || null;
    if (cur) history.replaceState(null, '', '#' + cur.id);
    side(); editor();
  }
  function ordered(b) { var o = {}; try { o = JSON.parse(localStorage.getItem('sr-portal-orders')) || {}; } catch (e) {} var s = (o.items || {})[b.id]; return !!(s && (s.status === 'ordered' || s.status === 'received')); }
  function isLocked(b) { return b.locked === true || (b.locked !== false && ordered(b)); }
  function lockHTML(b) {
    if (b.status !== 'sent') return '';
    var on = isLocked(b), why = b.locked === true ? 'You locked it.' : b.locked === false ? 'You unlocked it, so Janet can change her choice even though it&rsquo;s ordered.' : ordered(b) ? 'Locked automatically because it&rsquo;s been ordered.' : 'Janet can change or clear her choice until it&rsquo;s ordered.';
    return '<div class="ab-lock ' + (on ? 'on' : '') + '"><label class="ab-lock-t"><span class="ad-switch"><input type="checkbox" id="ab-lock"' + (on ? ' checked' : '') + '><span></span></span><b>' + (on ? '&#128274; Locked' : 'Unlocked') + '</b></label><span>' + why + '</span></div>';
  }
  function editor() {
    var main = $('ab-main');
    if (!cur) { main.innerHTML = '<section class="ab-card"><h2>Pick a board</h2><p class="ab-sub">Choose a board on the left, or start a new one.</p></section>'; return; }
    var b = cur, o = chosen(b), d = choiceDates()[b.id];
    main.innerHTML =
      '<section class="ab-card"><div class="ab-card-head"><h2>' + esc(b.name || 'Untitled board') + '</h2><div class="ab-status">' +
        (b.status === 'sent' ? (o ? '<span class="st ' + (over(b, o) ? 'up' : 'ok') + '">Janet chose Option ' + esc(o.letter) + (d ? ' &middot; ' + esc(d) : '') + '</span>' : '<span class="st wait">Sent &middot; waiting on Janet</span>') : '<span class="st draft">Draft &middot; Janet can&rsquo;t see this yet</span>') +
      '</div></div>' + lockHTML(b) + '<div class="ab-fields">' +
        '<label>Board name<input type="text" data-f="name" value="' + esc(b.name) + '"></label>' +
        '<label>Category<select data-f="group">' + GROUPS.map(function (g) { return '<option' + (g === b.group ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label>' +
        '<label>Due date<input type="date" data-f="due" value="' + esc(b.due) + '"></label>' +
        '<label>Allowance or estimate limit ($)<input type="number" min="0" data-f="limit" value="' + esc(b.limit) + '"><small>Client price above this shows as an upgrade. Leave blank if it&rsquo;s all included.</small></label>' +
        '<label class="wide">Range to show the client (optional)<input type="text" data-f="range" placeholder="e.g. $6,000&ndash;$7,000" value="' + esc(b.range) + '"></label>' +
        '<label class="chk"><input type="checkbox" data-f="showRange"' + (b.showRange ? ' checked' : '') + '> Show this range to the client</label>' +
        '<label class="wide">Note to client<textarea data-f="note">' + esc(b.note) + '</textarea></label>' +
      '</div></section>' +
      '<section class="ab-card"><div class="ab-card-head"><h2>Options <small>' + (b.options || []).length + ' &middot; client chooses one</small></h2><span class="ab-hint">Your cost &times; ' + MARKUP + ' markup &times; qty = client price, compared to the limit</span></div>' +
        '<div class="ab-opts" id="ab-opts"></div>' +
        '<button class="sr-btn ab-add" type="button" id="ab-lib">+ Add from library</button><button class="sr-btn ghost ab-add ab-lib" type="button" id="ab-add">+ Add a new option</button></section>' +
      '<div class="ab-footer"><span></span><div>' +
        '<button class="sr-btn ghost" type="button" id="ab-del">Delete board</button>' +
        '<a class="sr-btn ghost" href="selections.html#' + b.id + '">Preview as Janet</a>' +
        (b.status === 'sent' ? '<button class="sr-btn ghost" type="button" id="ab-unsend">Hide from Janet</button>' : '<button class="sr-btn" type="button" id="ab-send">Show to Janet&hellip;</button>') +
      '</div></div>' +
      '<p class="ab-sendnote">&ldquo;Show to Janet&rdquo; makes the board appear in her portal, then shows you the email to her. Nothing is emailed unless you click Send.</p>';
    (b.options || []).forEach(optRow);
    var lk = $('ab-lock'); if (lk) lk.onchange = function () {
      var want = lk.checked, auto = ordered(b);
      b.locked = want === auto ? undefined : want; if (b.locked === undefined) delete b.locked;   // back to automatic when it matches
      save(true); side(); editor();
    };
    main.querySelectorAll('[data-f]').forEach(function (el) {
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', function () {
        var k = el.dataset.f; b[k] = el.type === 'checkbox' ? el.checked : (k === 'limit' ? (el.value === '' ? '' : Number(el.value)) : el.value);
        if (k === 'limit') main.querySelectorAll('.ab-opt').forEach(function (r) { r._calc(); });
        if (k === 'name' || k === 'group') side();
        save();
      });
    });
    $('ab-add').onclick = function () { b.options = b.options || []; var o = { id: rid(), name: '', details: '', vendor: '', link: '', qty: 1, cost: 0 }; b.options.push(o); letters(b); optRow(o); save(); };
    $('ab-lib').onclick = function () { if (window.SRLibrary) SRLibrary.picker(b.name, addFromLib); };
    $('ab-del').onclick = function () {
      if (!confirm('Delete the "' + (b.name || 'Untitled') + '" board' + (b.status === 'sent' ? '? Janet will no longer see it.' : '?'))) return;
      boards = boards.filter(function (x) { return x !== b; }); cur = boards[0] || null; save(true); side(); editor();
    };
    var s = $('ab-send'); if (s) s.onclick = function () {
      if (!(b.options || []).length) { alert('Add at least one option first.'); return; }
      if (!confirm('Show "' + (b.name || 'this board') + '" to Janet in her portal? Next you\'ll see the email to her and decide whether to send it.')) return;
      b.status = 'sent'; b.sentAt = new Date().toISOString(); save(true); side(); editor();
      if (window.SRNotify) setTimeout(function () { SRNotify.open(SRNotify.templates.board(b)); }, 600);
    };
    var u = $('ab-unsend'); if (u) u.onclick = function () { b.status = 'draft'; save(true); side(); editor(); };
  }

  function optRow(o) {
    var b = cur, box = $('ab-opts'), d = document.createElement('div'), pick = chosen(b);
    d.className = 'ab-opt' + (pick && pick.id === o.id ? ' chosen' : '');
    var photo = o.photo ? 'center/cover url(' + o.photo + ')' : (o.bg || '#f3efe7');
    d.innerHTML =
      '<label class="ab-photo" style="background:' + esc(photo) + '"><input type="file" accept="image/*"><span>' + (o.photo || o.bg ? 'Replace photo' : '+ Upload photo') + '</span></label>' +
      '<div class="ab-opt-fields">' +
        '<div class="ab-opt-top"><span class="pt-opt-letter">Option ' + esc(o.letter) + (pick && pick.id === o.id ? ' &middot; <b>client&#39;s choice</b>' : '') + '</span><button type="button" class="ab-x" title="Remove option">Remove</button></div>' +
        '<label>Name<input type="text" data-o="name" value="' + esc(o.name) + '"></label>' +
        '<label>Details<input type="text" data-o="details" value="' + esc(o.details) + '"></label>' +
        '<div class="ab-row3"><label>Vendor<input type="text" data-o="vendor" value="' + esc(o.vendor) + '"></label><label>Link or item #<input type="text" data-o="link" placeholder="https://" value="' + esc(o.link) + '"></label><label>Qty<input type="number" min="1" data-o="qty" value="' + esc(o.qty || 1) + '"></label></div>' +
      '</div>' +
      '<div class="ab-price"><label>Your cost <em>only you see this</em><input type="number" min="0" step="0.01" data-o="cost" value="' + esc(o.cost || 0) + '"></label>' +
        '<div class="ab-calc"><span>Client price</span><b class="ab-client"></b></div><div class="ab-calc"><span>Client sees</span><span class="ab-tag"></span></div></div>';
    d._calc = function () {
      d.querySelector('.ab-client').textContent = money(price(o));
      var up = over(b, o), tag = d.querySelector('.ab-tag');
      tag.className = 'ab-tag pt-budget ' + (up ? 'over' : 'ok'); tag.textContent = up ? 'Upgrade +' + money(up) : (Number(b.limit) ? 'Within allowance' : 'Included');
    };
    d.querySelectorAll('[data-o]').forEach(function (el) {
      el.addEventListener('input', function () { var k = el.dataset.o; o[k] = el.type === 'number' ? Number(el.value) || 0 : el.value; d._calc(); save(); });
    });
    d.querySelector('.ab-x').onclick = function () {
      if (pick && pick.id === o.id && !confirm('Janet chose this option. Remove it anyway?')) return;
      b.options = b.options.filter(function (x) { return x !== o; }); letters(b); save(); editor(); side();
    };
    d.querySelector('input[type=file]').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return; var lab = d.querySelector('.ab-photo span'); lab.textContent = 'Uploading…';
      uploadPhoto(f).then(function (url) { o.photo = url; d.querySelector('.ab-photo').style.background = 'center/cover url(' + url + ')'; lab.textContent = 'Replace photo'; save(); })
        .catch(function () { lab.textContent = 'Upload failed – try again'; });
    });
    d._calc(); box.appendChild(d);
  }

  function addFromLib(x) {
    var b = cur; b.options = b.options || [];
    var o = { id: rid(), name: x.name, details: [x.brand, x.finish].filter(Boolean).join(' · '), vendor: x.vendor || '', link: x.link || '', qty: 1, cost: x.cost || 0, bg: x.bg || '' };
    b.options.push(o); letters(b); optRow(o); save();
  }

  // Resize big photos in the browser, then store them on the portal server.
  function uploadPhoto(f) {
    return new Promise(function (ok, bad) {
      var img = new Image(), u = URL.createObjectURL(f);
      img.onload = function () {
        var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          URL.revokeObjectURL(u);
          var P = window.SRPortal;
          if (!P || P.mode !== 'live') { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(blob); return; }
          fetch('/api/portal/project/' + P.project + '/upload', { method: 'POST', credentials: 'same-origin', body: blob, headers: { 'Content-Type': 'image/jpeg', 'X-File-Name': encodeURIComponent(f.name.replace(/\.\w+$/, '') + '.jpg') } })
            .then(function (r) { if (!r.ok) throw new Error('upload'); return r.json(); }).then(function (j) { ok(j.file.url); }).catch(bad);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = bad; img.src = u;
    });
  }

  /* ---------- new boards ---------- */
  function add(name, group, cat) {
    var b = { id: rid(), name: name || 'New board', group: group || 'Other', due: '', limit: '', range: '', showRange: false, note: '', status: 'draft', options: [] };
    boards.push(b); return b;
  }
  $('ab-new').onclick = function () { var b = add('New board', 'Other'); save(true); open(b.id); var n = document.querySelector('[data-f="name"]'); if (n) { n.select(); n.focus(); } };
  var GROUP_OF = { 'Cabinets': 'Cabinets', 'Cabinet hardware': 'Hardware & plumbing', 'Countertops': 'Countertops & tile', 'Tile': 'Countertops & tile', 'Sinks': 'Hardware & plumbing', 'Kitchen faucets': 'Hardware & plumbing', 'Bathroom faucets': 'Hardware & plumbing', 'Disposals': 'Hardware & plumbing', 'Range hoods': 'Hardware & plumbing', 'Lighting': 'Lighting', 'Fans': 'Lighting', 'Paint': 'Paint & finishes', 'Vanities': 'Bath', 'Shower trim & valves': 'Bath', 'Shower glass': 'Bath', 'Toilets': 'Bath', 'Mirrors': 'Bath', 'Bath hardware': 'Bath', 'Flooring': 'Countertops & tile' };
  document.querySelectorAll('[data-checklist]').forEach(function (btn) {
    btn.onclick = function () {
      var L = window.SRLibrary && SRLibrary.LISTS[btn.dataset.checklist]; if (!L) return;
      var have = boards.map(function (b) { return (b.name || '').toLowerCase(); }), made = 0, first = null;
      L.items.forEach(function (it) { if (have.indexOf(it[0].toLowerCase()) >= 0) return; var b = add(it[0], GROUP_OF[it[1]] || (btn.dataset.checklist === 'bath' ? 'Bath' : 'Other')); made++; first = first || b; });
      if (!made) { alert('You already have a board for everything on the ' + L.title + ' checklist.'); return; }
      save(true); open(first.id); alert('Added ' + made + ' draft boards from the ' + L.title + ' checklist. Fill in options, then show each one to Janet when it’s ready.');
    };
  });
  document.querySelectorAll('[data-quick]').forEach(function (btn) {
    btn.onclick = function () { var b = add(btn.dataset.quick, btn.dataset.group); save(true); open(b.id); };
  });

  // Items sent from the library page land on the board with that name.
  if (window.SRLibrary) boards.forEach(function (b) {
    var p = SRLibrary.pending(b.name); if (!p.length) return;
    cur = b; p.forEach(function (x) { var item = SRLibrary.byId(x.id); if (item) { b.options = b.options || []; b.options.push({ id: rid(), name: item.name, details: [item.brand, item.finish].filter(Boolean).join(' · '), vendor: item.vendor || '', link: item.link || '', qty: 1, cost: item.cost || 0, bg: item.bg || '' }); letters(b); } });
    SRLibrary.clearPending(b.name); save(true);
  });

  open((location.hash || '').slice(1) || (boards[0] && boards[0].id));
})();

(function () { var st = document.createElement('style'); st.textContent =
  '.ab-lock{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#f6f4ee;padding:10px 14px;margin:0 0 16px;font-size:14px;color:#5d5850}.ab-lock.on{background:#f6f1e6}' +
  '.ab-lock-t{display:flex!important;gap:10px;align-items:center;cursor:pointer;letter-spacing:0!important;text-transform:none!important}.ab-lock-t b{font-weight:500;color:var(--sr-ink);font-size:15px}';
  document.head.appendChild(st); })();
