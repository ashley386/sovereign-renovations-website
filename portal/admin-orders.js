/* Orders page: every option the client chose on a selection board, plus items added by hand, grouped by vendor.
   Status per item: To order → Ordered (date, order #) → Received, with an optional receipt. Saved in the project's
   "orders" section (admin only; auth.js syncs sr-portal-orders to the server). */
(function () {
  var K = { orders: 'sr-portal-orders', boards: 'sr-portal-boards', choices: 'sr-portal-choices', dates: 'sr-portal-dates', meta: 'sr-portal-meta' };
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(K[k])); return v == null ? d : v; } catch (e) { return d; } }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  function nice(iso) { var p = (iso || '').slice(0, 10).split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) : ''; }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function num(v) { return parseFloat(String(v).replace(/[$,\s]/g, '')) || 0; }

  function orders() { var o = get('orders', {}); if (!o || typeof o !== 'object' || Array.isArray(o)) o = {}; o.items = o.items || {}; o.extra = o.extra || []; return o; }
  function save(o) { try { localStorage.setItem(K.orders, JSON.stringify(o)); } catch (e) {} draw(); }

  // Same rules as the server's orderRows()
  function rows() {
    var o = orders(), st = o.items, ch = get('choices', {}), out = [], waiting = [];
    get('boards', []).forEach(function (b) {
      if (!b || b.status !== 'sent') return;
      var opts = b.options || [], c = ch[b.id], pick = opts.filter(function (x) { return x.id === c; })[0] || (typeof c === 'number' ? opts[c] : null);
      if (!pick) { waiting.push(b); return; }
      var s = st[b.id] || {};
      out.push({ key: b.id, item: b.name || '', group: b.group || '', choice: pick.name || '', letter: pick.letter || '', details: pick.details || '', vendor: s.vendor != null ? s.vendor : (pick.vendor || ''),
        qty: Number(s.qty != null ? s.qty : pick.qty) || 1, cost: Number(s.cost != null ? s.cost : pick.cost) || 0, link: pick.link || '', status: s.status || 'todo', orderNo: s.orderNo || '', orderedAt: s.orderedAt || '',
        receivedAt: s.receivedAt || '', receipt: s.receipt || null, note: s.note || '', source: 'board', pickId: pick.id, changed: !!(s.choice && s.choice !== pick.id && s.status && s.status !== 'todo') });
    });
    o.extra.forEach(function (x) { out.push(Object.assign({ source: 'added', status: 'todo', qty: 1, cost: 0 }, x)); });
    return { rows: out, waiting: waiting };
  }
  // Approximate start: set on this page, or taken from Key dates ("Construction start" / "Demo")
  function keyStart() { return get('dates', []).filter(function (x) { return x.date && /construction start|demo/i.test(x.what || ''); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0]; }
  function orderBy() {
    var o = orders(), k = keyStart(), sched = window.SRSchedule && SRSchedule.start(), start = sched || o.start || (k && k.date);
    if (!start) return null;
    var t = new Date(start + 'T12:00:00'); t.setDate(t.getDate() - 42);
    var g = new Date(t); g.setDate(g.getDate() + 2); // a day or two of slack before it shows as late
    return { by: t.toISOString().slice(0, 10), late: g.toISOString().slice(0, 10), start: start, fromKey: !!sched };
  }

  // Update one row's status fields (board rows live in items{}, added rows in extra[])
  function patch(key, fields) {
    var o = orders(), ex = o.extra.filter(function (x) { return x.key === key; })[0];
    if (ex) Object.assign(ex, fields); else o.items[key] = Object.assign({}, o.items[key] || {}, fields);
    save(o);
  }

  var STATUS = { todo: 'To order', ordered: 'Ordered', received: 'Received' };
  function draw() {
    var r = rows(), list = r.rows, ob = orderBy(), t = today(), late = ob && ob.late < t;
    var toOrder = list.filter(function (x) { return x.status === 'todo'; }), ordered = list.filter(function (x) { return x.status === 'ordered'; }), received = list.filter(function (x) { return x.status === 'received'; });
    var total = function (a) { return a.reduce(function (s, x) { return s + x.cost * x.qty; }, 0); };
    $('or-stats').innerHTML =
      '<section class="ab-card ap-stat"><span class="sr-label">To order</span><b>' + toOrder.length + '</b><span>' + money(total(toOrder)) + (ob ? ' &middot; order by ' + nice(ob.by) : '') + '</span></section>' +
      '<section class="ab-card ap-stat"><span class="sr-label">Ordered</span><b>' + ordered.length + '</b><span>' + money(total(ordered)) + ' on the way</span></section>' +
      '<section class="ab-card ap-stat"><span class="sr-label">Received</span><b>' + received.length + '</b><span>' + money(total(received)) + ' in hand</span></section>';
    var o0 = orders(), k = keyStart();
    $('or-when').innerHTML = '<label class="or-start">Approximate start date <input type="date" id="or-start" value="' + esc(ob ? ob.start : '') + '"></label>' +
      (ob ? '<span>' + (late && toOrder.length ? '<b class="or-late">The order-by date has passed.</b> ' : '') + 'Construction starts around <b>' + nice(ob.start) + '</b>, so order everything by about <b>' + nice(ob.by) + '</b> (6 weeks before).' + (ob.fromKey ? ' <em>Same start date as Key dates.</em>' : '') + '</span>'
        : '<span>Add an approximate start date to see when everything needs to be ordered. Dates can shift a day or two; it&rsquo;s just for planning.</span>');
    $('or-start').onchange = function () {
      var v = this.value, o = orders();
      if (v && window.SRSchedule) { SRSchedule.setStart(v); delete o.start; } else if (v) o.start = v; else delete o.start;
      save(o);
    };
    // group by vendor
    var groups = {}; list.forEach(function (x) { var v = (x.vendor || '').trim() || 'No vendor yet'; (groups[v] = groups[v] || []).push(x); });
    var names = Object.keys(groups).sort(function (a, b) { return a === 'No vendor yet' ? 1 : b === 'No vendor yet' ? -1 : a.localeCompare(b); });
    $('or-list').innerHTML = names.length ? names.map(function (v) {
      var g = groups[v], open = g.filter(function (x) { return x.status === 'todo'; }).length;
      return '<section class="ab-card or-vendor"><div class="ab-card-head"><h2>' + esc(v) + '</h2><span class="ci-src">' + g.length + ' item' + (g.length === 1 ? '' : 's') + ' &middot; ' + money(total(g)) + (open ? ' &middot; <b>' + open + ' to order</b>' : ' &middot; all ordered') + '</span></div>' +
        (open > 1 ? '<button type="button" class="ab-mini ghost or-all" data-vendor="' + esc(v) + '">Mark all ' + open + ' ordered</button>' : '') +
        '<ul class="or-items">' + g.map(function (x) { return row(x, ob, t); }).join('') + '</ul></section>';
    }).join('') : '<section class="ab-card"><p class="ap-empty">Nothing to order yet. When the client chooses options on their <a href="admin-boards.html">selection boards</a>, they show up here.</p></section>';
    $('or-wait-card').hidden = !r.waiting.length;
    $('or-wait').innerHTML = r.waiting.map(function (b) { return '<li><b>' + esc(b.name) + '</b><span>' + (b.due ? 'Due ' + esc(b.due) + ' &middot; ' : '') + (b.options || []).length + ' options</span></li>'; }).join('');
  }
  function row(x, ob, t) {
    var due = x.status === 'todo' && ob ? (ob.late < t ? '<span class="or-chip late">Order by about ' + nice(ob.by) + ' &middot; late</span>' : '<span class="or-chip">Order by about ' + nice(ob.by) + '</span>') : '';
    var meta = [x.qty + ' &times; ' + money(x.cost) + ' = <b>' + money(x.qty * x.cost) + '</b>', x.status === 'ordered' ? 'Ordered ' + nice(x.orderedAt) + (x.orderNo ? ' &middot; #' + esc(x.orderNo) : '') : '', x.status === 'received' ? 'Received ' + nice(x.receivedAt) + (x.orderNo ? ' &middot; #' + esc(x.orderNo) : '') : ''].filter(Boolean).join(' &middot; ');
    return '<li class="or-item ' + x.status + '" data-key="' + esc(x.key) + '">' +
      '<div class="or-main"><b>' + esc(x.item) + (x.source === 'added' ? ' <em class="or-tag">Added</em>' : '') + '</b>' +
      (x.choice ? '<span>' + (x.letter ? 'Option ' + esc(x.letter) + ': ' : '') + esc(x.choice) + (x.details ? ' &middot; ' + esc(x.details) : '') + '</span>' : (x.details ? '<span>' + esc(x.details) + '</span>' : '')) +
      '<span class="or-meta">' + meta + '</span>' + due +
      (x.changed ? '<span class="or-chip late">The client changed this choice after you ordered. Check the order.</span>' : '') +
      (x.receipt ? '<span class="or-meta">Receipt: <a href="' + esc(x.receipt.url) + '" target="_blank" rel="noopener">' + esc(x.receipt.name) + '</a></span>' : '') +
      (x.note ? '<span class="or-meta">' + esc(x.note) + '</span>' : '') + '</div>' +
      '<div class="or-acts"><span class="pt-status' + (x.status === 'received' ? ' paid' : '') + '">' + STATUS[x.status] + '</span>' +
      (x.link ? '<a class="ab-x" href="' + esc(x.link) + '" target="_blank" rel="noopener">Product</a>' : '') +
      (x.status === 'todo' ? '<button type="button" class="ab-mini" data-act="ordered">Mark ordered</button>' : '') +
      (x.status === 'ordered' ? '<button type="button" class="ab-mini" data-act="received">Mark received</button>' : '') +
      '<button type="button" class="ab-x" data-act="edit">Edit</button>' +
      (x.status !== 'todo' ? '<button type="button" class="ab-x" data-act="receipt">' + (x.receipt ? 'Replace receipt' : 'Add receipt') + '</button>' : '') +
      (x.source === 'added' ? '<button type="button" class="ab-x" data-act="remove">Remove</button>' : '') + '</div></li>';
  }

  document.addEventListener('click', function (e) {
    var all = e.target.closest('.or-all');
    if (all) {
      var n = prompt('Order # for all ' + all.dataset.vendor + ' items (optional):', ''); if (n === null) return;
      var o = orders(), d = today();
      rows().rows.filter(function (x) { return x.status === 'todo' && ((x.vendor || '').trim() || 'No vendor yet') === all.dataset.vendor; }).forEach(function (x) {
        var f = { status: 'ordered', orderedAt: d, orderNo: n.trim() || x.orderNo || '' };
        var ex = o.extra.filter(function (y) { return y.key === x.key; })[0]; if (ex) Object.assign(ex, f); else o.items[x.key] = Object.assign({}, o.items[x.key] || {}, f, { choice: x.pickId });
      });
      save(o); return;
    }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var li = b.closest('[data-key]'), key = li.dataset.key, x = rows().rows.filter(function (y) { return y.key === key; })[0]; if (!x) return;
    var act = b.dataset.act;
    if (act === 'ordered') { var no = prompt('Order # (optional):', x.orderNo || ''); if (no === null) return; patch(key, { status: 'ordered', orderedAt: today(), orderNo: no.trim(), choice: x.pickId }); }
    if (act === 'received') patch(key, { status: 'received', receivedAt: today() });
    if (act === 'remove' && confirm('Remove "' + x.item + '" from orders?')) { var o = orders(); o.extra = o.extra.filter(function (y) { return y.key !== key; }); save(o); }
    if (act === 'receipt') { pendingReceipt = key; $('or-file').value = ''; $('or-file').click(); }
    if (act === 'edit') editRow(li, x);
  });
  function editRow(li, x) {
    var f = document.createElement('form'); f.className = 'or-edit';
    f.innerHTML = '<label>Vendor<input name="vendor" list="or-vendors" value="' + esc(x.vendor) + '"></label><label>Qty<input name="qty" inputmode="decimal" value="' + esc(x.qty) + '"></label><label>Our cost (each)<input name="cost" inputmode="decimal" value="' + esc(x.cost) + '"></label>' +
      '<label>Status<select name="status"><option value="todo">To order</option><option value="ordered">Ordered</option><option value="received">Received</option></select></label><label>Order #<input name="orderNo" value="' + esc(x.orderNo) + '"></label>' +
      '<label class="wide">Note<input name="note" value="' + esc(x.note) + '" placeholder="Delivery date, where it ships, anything to remember"></label>' +
      '<div class="lv-btns wide"><button class="sr-btn" type="submit">Save</button><button class="sr-btn ghost" type="button" data-cancel>Cancel</button></div>';
    f.status.value = x.status; li.appendChild(f); f.vendor.focus();
    f.querySelector('[data-cancel]').onclick = function () { f.remove(); };
    f.onsubmit = function (e) {
      e.preventDefault(); var st = f.status.value, d = today();
      var fields = { vendor: f.vendor.value.trim(), qty: num(f.qty.value) || 1, cost: num(f.cost.value), status: st, orderNo: f.orderNo.value.trim(), note: f.note.value.trim() };
      if (st !== 'todo' && !x.orderedAt) fields.orderedAt = d; if (st === 'received' && !x.receivedAt) fields.receivedAt = d;
      if (st === 'todo') { fields.orderedAt = ''; fields.receivedAt = ''; }
      if (x.source === 'board') { fields.choice = x.pickId; if (x.item) {} }
      patch(x.key, fields);
    };
  }
  var pendingReceipt = null;
  $('or-file').addEventListener('change', function () {
    var file = this.files[0], key = pendingReceipt; pendingReceipt = null; if (!file || !key) return;
    if (!window.SRUpload || !window.SRPortal || window.SRPortal.mode !== 'live') { alert('Sign in to upload receipts.'); return; }
    window.SRUpload(file).then(function (meta) { patch(key, { receipt: { name: file.name, url: meta.url } }); })
      .catch(function (err) { alert('The receipt didn’t upload' + (err && err.message === 'too-large' ? ' because it’s over 5 MB.' : '. Please try again.')); });
  });
  $('or-add').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this; if (!f.item.value.trim()) return;
    var link = f.link.value.trim(); if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    var o = orders(); o.extra.push({ key: uid(), item: f.item.value.trim(), vendor: f.vendor.value.trim(), qty: num(f.qty.value) || 1, cost: num(f.cost.value), details: f.details.value.trim(), link: link, status: 'todo' });
    save(o); f.reset(); f.qty.value = 1;
  });
  $('or-csv').addEventListener('click', function (e) {
    e.preventDefault();
    var head = ['Item / description', 'Category', 'Choice', 'Vendor (where from)', 'Order #', 'Order date', 'Qty', 'Our cost (each)', 'Our total', 'Status', 'Received', 'Notes', 'Link'];
    var lines = [head].concat(rows().rows.map(function (x) { return [x.item, x.group || '', (x.letter ? 'Option ' + x.letter + ': ' : '') + (x.choice || x.details || ''), x.vendor, x.orderNo, x.orderedAt, x.qty, x.cost.toFixed(2), (x.qty * x.cost).toFixed(2), STATUS[x.status], x.receivedAt, x.note, x.link]; }));
    var csv = lines.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var m = get('meta', {}), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (m.name || 'project').replace(/[^\w]+/g, '-') + '-orders.csv'; document.body.appendChild(a); a.click(); a.remove();
  });

  var st = document.createElement('style');
  st.textContent = '.or-vendor{margin-bottom:20px}.or-items{list-style:none;padding:0;margin:0}.or-item{display:grid;grid-template-columns:1fr auto;gap:8px 16px;padding:14px 0;border-top:1px solid var(--sr-rule)}' +
    '.or-main>b{display:block;font-weight:500;font-size:15px;color:var(--sr-ink)}.or-main span{display:block;font-size:13px;color:#8f897e;margin-top:2px}.or-main .or-meta{color:#5d5850}' +
    '.or-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.or-acts .ab-mini,.or-acts .ab-x{cursor:pointer}.or-item.received .or-main>b{color:#6b7f5a}' +
    '.or-chip{display:inline-block!important;font-size:11px!important;letter-spacing:.06em;background:#f6f1e6;color:#8a6a3c!important;padding:3px 8px;margin-top:6px!important}.or-chip.late{background:#fbe9e7;color:#b3261e!important}' +
    '.or-tag{font-style:normal;font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:var(--sr-cream);padding:2px 6px;margin-left:6px;color:#8a6a3c}.or-late{color:#b3261e}' +
    '.or-start{display:inline-flex;gap:8px;align-items:center;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--sr-label);margin-right:14px}.or-start input{border:1px solid var(--sr-rule);padding:6px 8px;font:inherit;font-size:14px;letter-spacing:0;background:#fff}#or-when{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:15px}#or-when em{color:#8f897e}' +
    '.or-all{margin:0 0 6px;cursor:pointer}.or-wait{list-style:none;padding:0;margin:0}.or-wait li{padding:10px 0;border-top:1px solid var(--sr-rule)}.or-wait li b{display:block;font-weight:500}.or-wait li span{font-size:13px;color:#8f897e}' +
    '.or-edit{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;background:var(--sr-cream);padding:12px}.or-edit label{display:grid;gap:4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--sr-label)}' +
    '.or-edit input,.or-edit select,.or-add input{border:1px solid var(--sr-rule);padding:8px 9px;font:inherit;font-size:14px;letter-spacing:0;text-transform:none;background:#fff;color:var(--sr-ink);width:100%;box-sizing:border-box}.or-edit .wide{grid-column:1/-1}' +
    '.or-row4{grid-template-columns:2fr 1.4fr .6fr 1fr}.or-row2{grid-template-columns:1fr 1fr}.ap-main>.ab-card,.ap-main>#or-list{margin-bottom:20px}#or-stats{margin-bottom:12px}' +
    '@media(max-width:700px){.or-item{grid-template-columns:1fr}.or-acts{justify-content:flex-start}.or-edit{grid-template-columns:1fr 1fr}.or-row4,.or-row2{grid-template-columns:1fr}}';
  document.head.appendChild(st);

  function start() { draw(); }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
