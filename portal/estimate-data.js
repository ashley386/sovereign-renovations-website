/* Shared by the Design & Estimate pages (client: estimate.html, admin: admin-estimate.html).
   estimate (sr-portal-estimate, admin writes):
     { status: 'draft'|'shared', intro, qbLink, pdf: {name,url}|null, plans: [{id,name,url,type,note}],
       items: [{id, text, price|null, removed}], updatedAt }
   estimateRequests (sr-portal-est-req, client writes; Ashley approves or keeps):
     { items: { [itemId]: { remove, note, at, declined } }, general, approved: {name, at, stamp, total} }   approved is set by the server only */
(function () {
  var K = { est: 'sr-portal-estimate', req: 'sr-portal-est-req' };
  function load(k) { try { return JSON.parse(localStorage.getItem(K[k])); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(K[k], JSON.stringify(v)); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function money(n) { n = Number(n) || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isImg(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|gif|webp|heic)$/i.test(f.name || ''); }
  function priced(items) { return (items || []).filter(function (x) { return !x.removed; }).reduce(function (s, x) { return s + (Number(x.price) || 0); }, 0); }

  // Starting scope lists by project type (same wording as the lead pages)
  var TPL = {
    Kitchen: ['Removal and disposal of countertops, backsplash, range hood, cabinets and sink', 'New cabinets with soft-close doors and drawers', 'Vent hood and ducting', 'Tile backsplash with dimmable under-cabinet lighting', 'New countertops and a spacious sink', 'New lighting, including dimmable LED recessed lights', 'Repaint kitchen and trim', 'Appliances (optional)'],
    Bathroom: ['Removal and disposal of the vanity, toilet, tub or shower, tile and fixtures', 'New tiled shower with a waterproofed base and niche', 'New vanity, countertop, sink and faucet', 'New tile flooring', 'New toilet, mirror and bath hardware', 'New lighting and a quiet exhaust fan', 'Repaint walls and trim', 'Frameless glass shower door (optional)'],
    'Laundry room': ['Removal of existing cabinets, counters and finishes', 'New cabinets and storage', 'New countertop and sink', 'Tile or LVP flooring', 'New lighting', 'Repaint walls and trim']
  };
  function fromTpl(type) { return (TPL[type] || []).map(function (t) { return { id: uid(), text: t, price: null, removed: false }; }); }

  // Preview mode only: a sample so the pages can be seen before anything is entered
  function sample() {
    var p = [6800, 18400, 1900, 3600, 7200, 2400, 2100, 0];
    var items = fromTpl('Kitchen').map(function (x, i) { x.price = p[i] || null; return x; });
    return { status: 'shared', intro: '', qbLink: '#', pdf: { name: 'Rusk Kitchen Estimate.pdf', url: '' },
      plans: [{ id: 'p1', name: 'Floor plan.pdf', type: 'application/pdf', url: '' }, { id: 'p2', name: 'Range wall elevation.pdf', type: 'application/pdf', url: '' }, { id: 'p3', name: '3D rendering.jpg', type: 'image/jpeg', url: '' }],
      items: items, updatedAt: new Date().toISOString(), sample: true };
  }
  // Client dashboard card (index.html #estimate)
  function dash() {
    var t = document.getElementById('es-dash-text'); if (!t) return;
    var live = window.SRPortal && window.SRPortal.mode === 'live';
    var est = load('est') || (live ? null : sample()), req = load('req') || {}, items = (est && est.items) || [];
    var c = document.getElementById('es-dash-count'), b = document.getElementById('es-dash-btn');
    if (!est || est.status !== 'shared') { t.innerHTML = 'Your plans and estimate will show up here as soon as they&rsquo;re ready.'; c.textContent = ''; b.innerHTML = ''; return; }
    var tot = priced(items), asks = items.filter(function (x) { return !x.removed && ((req.items || {})[x.id] || {}).remove; }).length;
    c.innerHTML = req.approved ? 'Approved' : asks ? 'Waiting on Ashley' : '<b>Ready for your review</b>';
    t.innerHTML = req.approved ? 'You approved your design and estimate' + (req.approved.total ? ' (' + money(req.approved.total) + ')' : '') + '. Next up: your build contract and deposit, then selections.'
      : 'Your plans' + (tot ? ' and estimate (' + money(tot) + ')' : ' and estimate') + ' are ready. Look them over, leave notes, take anything off you don&rsquo;t want, and approve when it looks right.';
    b.innerHTML = '<a href="estimate.html" class="sr-btn">' + (req.approved ? 'View design &amp; estimate' : 'Review &amp; approve') + '</a>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dash); else dash();
  document.addEventListener('sr-portal-ready', dash);

  window.SREst = { load: load, save: save, uid: uid, money: money, esc: esc, isImg: isImg, priced: priced, TPL: TPL, fromTpl: fromTpl, sample: sample };
})();
