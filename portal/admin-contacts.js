/* Contacts (admin only): clients, leads, subs and vendors in one list.
   Saved as the company "contacts" record (auth.js syncs sr-admin-contacts to the server), so Ashley and Greg
   see the same list on every device. Imported once from Houzz Pro; add and edit here from now on. */
(function () {
  var KEY = 'sr-admin-contacts';
  var TYPE = { client: 'Client', lead: 'Lead', sub: 'Sub', vendor: 'Vendor' };
  var cur = 'all', editing = null, projects = [];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} draw(); }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function digits(p) { return String(p || '').replace(/[^\d+]/g, ''); }
  function pretty(p) { var d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : p; }
  function title(c) { return c.name || c.company || c.email || 'Contact'; }

  function draw() {
    var list = load(), q = $('ct-q').value.trim().toLowerCase();
    var counts = { all: list.length }; list.forEach(function (c) { counts[c.type] = (counts[c.type] || 0) + 1; });
    document.querySelectorAll('#ct-tabs button').forEach(function (b) { var t = b.dataset.t; b.classList.toggle('on', t === cur); b.innerHTML = (t === 'all' ? 'All' : TYPE[t] + 's') + (counts[t] ? ' <small>' + counts[t] + '</small>' : ''); });
    var shown = list.filter(function (c) { return (cur === 'all' || c.type === cur) && (!q || [c.name, c.company, c.trade, c.email, c.phone, c.address, c.notes].join(' ').toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) {
        var sa = (a.type === 'sub' || a.type === 'vendor') ? (a.company || a.name) : a.name, sb = (b.type === 'sub' || b.type === 'vendor') ? (b.company || b.name) : b.name;
        return String(sa || '').localeCompare(String(sb || ''));
      });
    $('ct-count').textContent = shown.length + ' of ' + list.length + ' contacts';
    $('ct-list').innerHTML = shown.length ? shown.map(function (c) {
      var biz = c.type === 'sub' || c.type === 'vendor', main = biz ? (c.company || c.name) : c.name, sub = biz ? [c.name, c.trade].filter(Boolean).join(' &middot; ') : [c.company, c.trade].filter(Boolean).join(' &middot; ');
      var proj = c.project && projects.filter(function (p) { return p.id === c.project; })[0];
      return '<li class="ct-row" data-id="' + esc(c.id) + '"><div class="ct-who"><span class="ct-type ' + esc(c.type) + '">' + (TYPE[c.type] || 'Contact') + '</span><b>' + esc(main || '(no name)') + '</b>' +
        (sub ? '<span>' + (biz ? sub.split(' &middot; ').map(esc).join(' &middot; ') : esc(sub)) + '</span>' : '') +
        (c.address ? '<span><a href="https://maps.google.com/?q=' + encodeURIComponent(c.address) + '" target="_blank" rel="noopener">' + esc(c.address) + '</a></span>' : '') +
        (c.notes ? '<span class="ct-note">' + esc(c.notes) + '</span>' : '') + '</div>' +
        '<div class="ct-reach">' + (c.phone ? '<a href="tel:' + esc(digits(c.phone)) + '">' + esc(pretty(c.phone)) + '</a><a class="ct-sms" href="sms:' + esc(digits(c.phone)) + '">Text</a>' : '') +
        (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '') + (!c.phone && !c.email ? '<span class="ct-none">No phone or email yet</span>' : '') + '</div>' +
        '<div class="ct-acts">' + (c.project ? '<a class="ab-x" href="admin-project.html?project=' + encodeURIComponent(c.project) + '">' + esc(proj ? proj.name : 'Project') + '</a>' : '') +
        (c.lead ? '<a class="ab-x" href="admin-lead.html?lead=' + encodeURIComponent(c.lead) + '">Lead</a>' : '') + '<button type="button" class="ab-x" data-edit>Edit</button></div></li>';
    }).join('') : '<li class="ap-empty">' + (list.length ? 'No contacts match.' : 'No contacts yet. Add one with + Add contact.') + '</li>';
  }

  function openForm(c) {
    var f = $('ct-form'); editing = c ? c.id : null; f.hidden = false; f.reset();
    $('ct-form-h').textContent = c ? 'Edit ' + title(c) : 'Add a contact'; $('ct-del').hidden = !c;
    f.project.innerHTML = '<option value="">None</option>' + projects.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
    if (c) ['type', 'name', 'company', 'trade', 'phone', 'email', 'address', 'notes', 'project'].forEach(function (k) { if (f[k]) f[k].value = c[k] || ''; });
    else f.type.value = cur === 'all' ? 'client' : cur;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' }); f.name.focus();
  }
  $('ct-add-open').onclick = function () { openForm(null); };
  $('ct-cancel').onclick = function () { $('ct-form').hidden = true; editing = null; };
  $('ct-del').onclick = function () {
    var list = load(), c = list.filter(function (x) { return x.id === editing; })[0]; if (!c) return;
    if (!confirm('Delete ' + title(c) + ' from your contacts?')) return;
    save(list.filter(function (x) { return x.id !== editing; })); $('ct-form').hidden = true; editing = null;
  };
  $('ct-form').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this;
    if (!f.name.value.trim() && !f.company.value.trim()) { f.name.focus(); return; }
    var list = load(), data = {};
    ['type', 'name', 'company', 'trade', 'phone', 'email', 'address', 'notes', 'project'].forEach(function (k) { data[k] = f[k].value.trim(); });
    data.email = data.email.toLowerCase();
    if (editing) list = list.map(function (x) { return x.id === editing ? Object.assign({}, x, data) : x; });
    else list.push(Object.assign({ id: uid(), source: 'Added', added: new Date().toISOString().slice(0, 10) }, data));
    save(list); f.hidden = true; editing = null;
  });
  $('ct-list').addEventListener('click', function (e) {
    if (!e.target.closest('[data-edit]')) return;
    var id = e.target.closest('[data-id]').dataset.id; openForm(load().filter(function (x) { return x.id === id; })[0]);
  });
  $('ct-tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cur = b.dataset.t; draw(); });
  $('ct-q').addEventListener('input', draw);
  $('ct-csv').addEventListener('click', function (e) {
    e.preventDefault();
    var rows = [['Type', 'Name', 'Company', 'Trade', 'Phone', 'Email', 'Address', 'Notes']].concat(load().map(function (c) { return [TYPE[c.type] || '', c.name, c.company, c.trade, c.phone, c.email, c.address, c.notes]; }));
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'sovereign-contacts.csv'; document.body.appendChild(a); a.click(); a.remove();
  });

  var st = document.createElement('style');
  st.textContent = '.ct-main{display:grid;gap:14px;padding-bottom:60px}.ct-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.ct-bar input{flex:1 1 280px;border:1px solid var(--sr-rule);padding:10px 12px;font:inherit;font-size:15px;background:#fff}' +
    '.ct-bar .ah-filters{margin:0}.ct-bar .ah-filters small{opacity:.6;margin-left:4px}.ct-list{list-style:none;padding:0;margin:0;background:#fff;border:1px solid var(--sr-rule)}' +
    '.ct-row{display:grid;grid-template-columns:1.4fr 1.2fr auto;gap:8px 18px;align-items:center;padding:14px 18px;border-top:1px solid var(--sr-rule)}.ct-row:first-child{border-top:0}' +
    '.ct-who b{display:block;font-weight:500;font-size:15px;color:var(--sr-ink)}.ct-who span{display:block;font-size:13px;color:#8f897e}.ct-who a{color:inherit}.ct-note{font-style:italic}' +
    '.ct-type{display:inline-block!important;font-size:10px!important;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;margin-bottom:4px;background:var(--sr-cream);color:#8a6a3c!important}.ct-type.lead{background:#fdf3dc}.ct-type.sub{background:#e8eee6;color:#55703f!important}.ct-type.vendor{background:#e6ecf1;color:#3d5a73!important}' +
    '.ct-reach{display:flex;flex-direction:column;gap:2px;font-size:14px}.ct-reach a{color:var(--sr-ink);text-decoration:none;overflow-wrap:anywhere}.ct-reach a:hover{text-decoration:underline}.ct-sms{font-size:12px;color:#8a6a3c!important}.ct-none{font-size:13px;color:#b9b4aa;font-style:italic}' +
    '.ct-acts{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.ct-acts .ab-x{cursor:pointer}' +
    '.ct-form{display:grid;gap:12px}.ct-form h2{margin:0}.ct-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.ct-grid .wide{grid-column:span 2}.ct-grid label{display:grid;gap:4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--sr-label)}' +
    '.ct-grid input,.ct-grid select,.ct-grid textarea{border:1px solid var(--sr-rule);padding:9px 10px;font:inherit;font-size:15px;letter-spacing:0;text-transform:none;background:#fbf9f5;color:var(--sr-ink);width:100%;box-sizing:border-box}' +
    '.lv-btns{display:flex;gap:10px;flex-wrap:wrap}.lv-btns .sr-btn{cursor:pointer}.ct-del{margin-left:auto;color:#b3261e!important}.ct-form[hidden]{display:none}' +
    '@media(max-width:800px){.ct-row{grid-template-columns:1fr}.ct-acts{justify-content:flex-start}.ct-grid{grid-template-columns:1fr 1fr}.ct-grid .wide{grid-column:1/-1}}@media(max-width:520px){.ct-grid{grid-template-columns:1fr}}';
  document.head.appendChild(st);

  function start() {
    var P = window.SRPortal;
    if (P && P.mode === 'live') P.api('projects').then(function (r) { (r.projects || []).forEach(function (p) { if (!projects.some(function (x) { return x.id === p.id; })) projects.push({ id: p.id, name: p.name }); }); draw(); }).catch(function () {});
    if (!projects.length) projects = [{ id: 'rusk', name: 'Rusk Kitchen' }, { id: 'kimsey', name: 'Kimsey Primary Bath' }, { id: 'lofquist', name: 'Lofquist Bath' }, { id: 'ahart', name: 'Ahart Kitchen' }, { id: 'martha', name: 'Martha’s Rental' }, { id: 'doherty', name: 'Doherty Kitchen' }];
    draw();
  }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
