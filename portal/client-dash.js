/* Client dashboard for projects created with "Set up portal": the phase bar, key dates, shared files and invoices
   come from this project's own data (nothing from the Rusk sample shows). Projects without setup data keep the sample. */
(function () {
  function get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  var m = get('sr-portal-meta') || {};
  if (!m.name && !get('sr-portal-dates') && !get('sr-portal-files') && !get('sr-portal-invoices')) return; // older sample projects keep the sample
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  // Hero: "Everything for your bathroom in one place"
  var word = { Bathroom: 'bathroom', Kitchen: 'kitchen', Laundry: 'laundry room', 'Feature wall': 'project', 'A la carte': 'project' }[m.type] || 'project';
  if (m.name) document.querySelectorAll('.pt-hero p').forEach(function (p) { p.innerHTML = p.innerHTML.replace(/your kitchen/, 'your ' + word); });
  var num = parseInt(String(m.phase || '').slice(0, 2), 10);
  if (num) document.querySelectorAll('.pt-phases .ph').forEach(function (ph, i) { ph.classList.toggle('done', i + 1 < num); ph.classList.toggle('now', i + 1 === num); });

  // Key dates (keep the client's own dates, which client-shared.js adds as li.mine)
  var dl = $('pt-dates');
  if (dl) {
    dl.querySelectorAll('li:not(.mine)').forEach(function (li) { li.remove(); });
    var dates = (get('sr-portal-dates') || []).slice().sort(function (a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : 1; });
    var html = dates.map(function (d) {
      var p = (d.date || '').split('-'), has = p.length === 3;
      return '<li' + (has ? '' : ' class="tbd"') + '><div class="pt-day"><b>' + (has ? MON[+p[1] - 1] : 'TBD') + '</b><span>' + (has ? +p[2] : '&ndash;') + '</span></div><div><b>' + esc(d.what) + '</b>' + (d.time || d.note ? '<span>' + [d.time, d.note].filter(Boolean).map(esc).join(' &middot; ') + '</span>' : '') + '</div></li>';
    }).join('');
    dl.insertAdjacentHTML('afterbegin', html || '<li class="pt-empty-li"><div><span>Your key dates will show here as we schedule them.</span></div></li>');
  }

  // Files shared with the client (the client's own uploads are added by client-shared.js as li.mine)
  var fl = $('pt-files');
  if (fl) {
    fl.querySelectorAll('li:not(.mine)').forEach(function (li) { li.remove(); });
    var files = get('sr-portal-files') || [];
    fl.insertAdjacentHTML('afterbegin', files.length ? files.map(function (f) {
      return '<li><div class="pt-doc-icon">' + esc((f.name || '').split('.').pop().toUpperCase().slice(0, 4) || 'FILE') + '</div><div><b>' + esc(f.name) + '</b><span>Added by ' + esc(f.by || 'Ashley') + '</span></div>' + (f.url ? '<a href="' + esc(f.url) + '" class="pt-dl" target="_blank" rel="noopener">Download</a>' : '') + '</li>';
    }).join('') : '<li class="pt-empty-li"><div><span>Plans, renderings and other files we share will show here.</span></div></li>');
  }

  // Invoices
  var inv = document.querySelector('#invoices .pt-inv');
  if (inv) {
    var list = get('sr-portal-invoices') || [];
    inv.innerHTML = list.length ? list.map(function (x) {
      var paid = x.paid || x.status === 'paid', amt = typeof x.amount === 'number' ? (x.amount ? '$' + x.amount.toLocaleString('en-US', { minimumFractionDigits: x.amount % 1 ? 2 : 0, maximumFractionDigits: 2 }) : '') : (x.amount || '');
      var label = paid ? 'Paid' : x.status === 'sent' ? 'Due' : x.status === 'draft' ? 'Coming up' : esc(x.status || 'Open');
      return '<li><div><b>' + esc((x.num ? '#' + x.num + ' · ' : '') + x.title) + '</b><span>' + [x.due ? 'Due ' + x.due : '', x.note].filter(Boolean).map(esc).join(' &middot; ') + '</span></div><div class="amt">' + esc(amt) + '<span class="pt-status' + (paid ? ' paid' : '') + '">' + label + '</span>' + (x.url && !paid ? '<a href="' + esc(x.url) + '" class="pt-dl" target="_blank" rel="noopener">View &amp; pay</a>' : x.url ? '<a href="' + esc(x.url) + '" class="pt-dl" target="_blank" rel="noopener">View</a>' : '') + '</div></li>';
    }).join('') : '<li class="pt-empty-li"><div><span>No invoices yet.</span></div></li>';
  }
})();
