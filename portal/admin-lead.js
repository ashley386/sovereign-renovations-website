/* Lead page editor (admin-lead.html?lead=ID): what the lead's private page shows, the link to send, and the lead's activity. */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  var ID = new URLSearchParams(location.search).get('lead') || '';
  var STATUS = { new: 'New · needs contact', contacted: 'Followed up', consult: 'Consult scheduled', owe: 'Owe them ballpark', ballpark: 'Ballpark sent · waiting on client', signed: 'Agreement signed · waiting on deposit', paid: 'Deposit paid', project: 'Now a project', lost: 'Not a fit' };
  var TPL = {
    Kitchen: { scope: ['Removal and disposal of countertops, backsplash, range hood, cabinets and sink', 'New cabinets with soft-close doors and drawers', 'Vent hood and ducting', 'Tile backsplash with dimmable under-cabinet lighting', 'New countertops and a spacious sink', 'New lighting, including dimmable LED recessed lights', 'Repaint kitchen and trim', 'Personalized design: in-home consultation, design board, 3D renderings and an easy online selection process', 'Appliances (optional)'],
      factors: ['Countertops: Granite, quartz or quartzite', 'Cabinets: Cabinet line and extras like roll trays, trash pull-outs and spice racks', 'Finishes: Lighting, sink and faucet, hardware and tile'] },
    Bathroom: { scope: ['Removal and disposal of the vanity, toilet, tub or shower, tile and fixtures', 'New tiled shower with a waterproofed base and niche', 'New vanity, countertop, sink and faucet', 'New tile flooring', 'New toilet, mirror and bath hardware', 'New lighting and a quiet exhaust fan', 'Repaint walls and trim', 'Personalized design: in-home consultation, design board, 3D renderings and an easy online selection process', 'Frameless glass shower door (optional)'],
      factors: ['Shower: Tile size and pattern, glass door, niche and bench', 'Vanity: Size, cabinet line and countertop', 'Finishes: Plumbing fixtures, lighting, hardware and tile'] },
    'Laundry room': { scope: ['Removal of existing cabinets, counters and finishes', 'New cabinets and storage', 'New countertop and sink', 'Tile or LVP flooring', 'New lighting', 'Repaint walls and trim', 'Personalized design: in-home consultation, design board, 3D renderings and an easy online selection process'],
      factors: ['Cabinets: Cabinet line, storage and hanging space', 'Surfaces: Countertop, backsplash and flooring', 'Finishes: Sink, faucet, lighting and hardware'] }
  };
  var f = $('le-form'), lead = null, page = {}, link = '', concept = '';

  function P() { return window.SRPortal && window.SRPortal.mode === 'live' ? window.SRPortal : null; }
  function api(path, o) { return P().api(path, o); }
  function msg(id, t) { var m = $(id); m.textContent = t; clearTimeout(m._t); m._t = setTimeout(function () { m.textContent = ''; }, 4000); }

  function stage() { return (f.querySelector('input[name=stage]:checked') || {}).value || 'consult'; }
  function showStage() { f.querySelector('.le-bp').style.display = stage() === 'ballpark' ? '' : 'none'; }
  f.querySelectorAll('input[name=stage]').forEach(function (r) { r.addEventListener('change', showStage); });

  function setImg(fid) {
    concept = fid || '';
    var box = $('le-img');
    if (concept && lead && lead.pageKey) { box.style.backgroundImage = 'url("/api/portal/lead-page/' + lead.pageKey + '/img/' + concept + '")'; box.innerHTML = ''; }
    else if (concept) { box.style.backgroundImage = ''; box.innerHTML = '<span>Picture uploaded. Save to see it.</span>'; }
    else { box.style.backgroundImage = ''; box.innerHTML = '<span>No picture yet</span>'; }
    $('le-img-rm').hidden = !concept;
  }

  function fillForm() {
    var p = page || {};
    var first = p.first || (lead.name || '').split(/\s+/)[0] || '';
    f.first.value = first; f.type.value = p.type || 'Kitchen'; f.spaces.value = p.spaces || ''; showSpaces();
    f.querySelector('input[name=stage][value=' + (p.stage === 'ballpark' ? 'ballpark' : 'consult') + ']').checked = true;
    var c = p.consult || lead.consult || ''; f.consult.value = c.length > 10 ? c.slice(0, 16) : (c ? c + 'T10:00' : '');
    f.length.value = p.length || ''; f.address.value = p.address || lead.address || ''; f.who.value = p.who || '';
    f.walk.value = p.walk || ''; f.scope.value = (p.scope || []).join('\n');
    f.factors.value = (p.factors || []).map(function (x) { return x.t + (x.d ? ': ' + x.d : ''); }).join('\n');
    f.low.value = p.low || ''; f.high.value = p.high || ''; f.deposit.value = p.deposit === undefined || p.deposit === '' ? 1500 : p.deposit;
    f.note.value = p.note || ''; f.payUrl.value = p.payUrl || '';
    if (!f.scope.value) useTemplate(f.type.value, true);
    setImg(p.concept); showStage();
  }
  function useTemplate(type, quiet) {
    var t = TPL[type] || TPL[type === 'Primary bath' || type === 'Powder room' ? 'Bathroom' : type === 'Mudroom' ? 'Laundry room' : ''];
    if (!t) return;
    if (!quiet && f.scope.value.trim() && !confirm('Replace the scope and budget lines with the ' + type.toLowerCase() + ' starting list?')) return;
    f.scope.value = t.scope.join('\n'); f.factors.value = t.factors.join('\n');
  }
  document.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { useTemplate(b.dataset.tpl); }; });

  function body() {
    var num = function (v) { return parseFloat(String(v).replace(/[$,\s]/g, '')) || 0; };
    var url = function (v) { v = v.trim(); return v && !/^https?:\/\//i.test(v) ? 'https://' + v : v; };
    return { first: f.first.value, type: f.type.value, spaces: f.type.value === 'Multiple spaces' ? f.spaces.value.trim() : '', stage: stage(), consult: f.consult.value, length: f.length.value, address: f.address.value, who: f.who.value,
      concept: concept, walk: url(f.walk.value), scope: f.scope.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
      factors: f.factors.value.split('\n').map(function (s) { var i = s.indexOf(':'); return i > 0 ? { t: s.slice(0, i).trim(), d: s.slice(i + 1).trim() } : { t: s.trim(), d: '' }; }).filter(function (x) { return x.t; }),
      low: num(f.low.value), high: num(f.high.value), deposit: f.deposit.value.trim() === '' ? '' : num(f.deposit.value), note: f.note.value, payUrl: url(f.payUrl.value) };
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault(); var b = $('le-save'); b.disabled = true; b.textContent = 'Saving…';
    var data = body();
    if (data.stage === 'ballpark' && !(data.low && data.high)) { if (!confirm('There’s no ballpark range yet. Their page will say “Coming soon.” Save anyway?')) { b.disabled = false; b.textContent = 'Save page'; return; } }
    api('leads/' + encodeURIComponent(ID) + '/page', { method: 'PUT', body: JSON.stringify(data) }).then(function (r) {
      lead = r.lead; page = r.page; link = r.link; drawLead(); setImg(page.concept); msg('le-msg', 'Saved. Their page is up to date.');
    }).catch(function () { msg('le-msg', 'That didn’t save. Please try again.'); }).then(function () { b.disabled = false; b.textContent = 'Save page'; });
  });

  // Concept picture
  $('le-file').addEventListener('change', function () {
    var file = this.files[0]; this.value = ''; if (!file) return;
    var go = function (blob) {
      if (blob.size > 5500000) { alert('That picture is over 5 MB. Try a screenshot or a smaller export.'); return; }
      $('le-img').innerHTML = '<span>Uploading…</span>';
      fetch('/api/portal/leads/' + encodeURIComponent(ID) + '/upload', { method: 'POST', credentials: 'same-origin', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg', 'X-File-Name': encodeURIComponent(file.name) } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { setImg(j.fid); msg('le-msg', 'Picture uploaded. Save the page to put it on their page.'); })
        .catch(function () { setImg(concept); alert('The picture didn’t upload. Please try again.'); });
    };
    if (file.size < 4500000 || !/^image\/(jpeg|png|webp)$/.test(file.type)) { go(file); return; }
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () { var k = Math.min(1, 2400 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { URL.revokeObjectURL(u); go(b); }, 'image/jpeg', 0.86); };
    img.onerror = function () { go(file); }; img.src = u;
  });
  $('le-img-rm').onclick = function () { setImg(''); msg('le-msg', 'Save the page to take the picture off.'); };

  // Lead details, status and activity
  function drawLead() {
    var l = lead, name = l.name || l.email || 'Lead';
    $('le-name').textContent = name; $('le-h1').textContent = name; document.title = name + ' · Lead page | Sovereign Renovations';
    $('le-label').textContent = 'Lead page · ' + (STATUS[l.status] || l.status);
    $('le-lead').innerHTML = '<p class="le-info">' + (l.phone ? '<a href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a><br>' : '') + (l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a><br>' : '<i>No email yet</i><br>') +
      (l.address ? esc(l.address) + '<br>' : '') + (l.message ? '&ldquo;' + esc(l.message.length > 200 ? l.message.slice(0, 200) + '…' : l.message) + '&rdquo;<br>' : '') + '</p>' +
      (l.viewedAt ? '<p class="le-info">First opened their page ' + when(l.viewedAt) + (l.views > 1 ? ' &middot; ' + l.views + ' visits, last ' + when(l.lastViewedAt) : '') + '</p>' : (l.pageKey ? '<p class="le-info"><i>They haven&rsquo;t opened their page yet.</i></p>' : '')) +
      (l.agreement ? '<span class="le-flag">Agreement signed</span><p class="le-info">Signed by ' + esc(l.agreement.name) + ', ' + esc(l.agreement.stamp || when(l.agreement.at)) + '</p>' : '') +
      '<label class="le-info" style="display:grid;gap:4px;margin-top:8px">Status<select id="le-status">' + Object.keys(STATUS).filter(function (k) { return k !== 'project' || l.status === 'project'; }).map(function (k) { return '<option value="' + k + '"' + (k === l.status ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select></label>';
    $('le-status').onchange = function () { setStatus(this.value); };
    var acts = '';
    if (l.status === 'signed') acts += '<button type="button" class="sr-btn" id="le-paid">Mark deposit paid</button>';
    if (l.status !== 'project') acts += '<a class="sr-btn ' + (l.status === 'paid' ? '' : 'ghost') + '" href="' + setupHref(l) + '">Turn into a project</a>';
    else if (l.project) acts += '<a class="sr-btn ghost" href="admin-project.html?project=' + encodeURIComponent(l.project) + '">Open project</a>';
    acts += '<button type="button" class="sr-btn ghost" id="le-note">Add note</button>';
    $('le-acts').innerHTML = acts;
    if ($('le-paid')) $('le-paid').onclick = function () { setStatus('paid'); };
    $('le-note').onclick = function () { var n = prompt('Note about ' + name + ':'); if (n && n.trim()) save({ note: n.trim() }); };
    $('le-activity').innerHTML = (l.notes || []).slice().reverse().map(function (n) { return '<li>' + esc(n.text) + '<span>' + (n.by === 'lead' ? 'From ' + esc((l.name || 'them').split(' ')[0]) : esc((n.by || '').split('@')[0])) + ' &middot; ' + when(n.at) + '</span></li>'; }).join('') || '<li class="ci-src">Nothing yet.</li>';
    var has = !!l.pageKey; link = has ? location.origin + '/portal/lead.html?k=' + l.pageKey : '';
    $('le-nolink').hidden = has; $('le-send').hidden = !has; $('le-link').value = link;
    $('le-preview').hidden = !has; if (has) $('le-preview').href = link + '&preview=1';
  }
  function setupHref(l) {
    return 'admin-setup.html?name=' + encodeURIComponent((l.name || '') + (page && page.type ? ' ' + page.type : '')) + '&type=' + encodeURIComponent(page && page.type ? (/bath|powder/i.test(page.type) ? 'Bathroom' : /laundry|mud/i.test(page.type) ? 'Laundry' : /wall/i.test(page.type) ? 'Feature wall' : /multiple/i.test(page.type) ? 'A la carte' : 'Kitchen') : '') + '&lead=' + encodeURIComponent(l.id) +
      (l.name ? '&person=' + encodeURIComponent(l.name) : '') + (l.email ? '&email=' + encodeURIComponent(l.email) : '') + (l.phone ? '&phone=' + encodeURIComponent(l.phone) : '') + (l.address ? '&address=' + encodeURIComponent(l.address) : '') + '&phase=03';
  }
  function save(b) { return api('leads/' + encodeURIComponent(ID), { method: 'PUT', body: JSON.stringify(b) }).then(function (r) { lead = r.lead; drawLead(); }).catch(function () { alert('That didn’t save. Please try again.'); }); }
  function setStatus(s) { save({ status: s }); }

  // Sending
  function copy(text, done) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { msg('le-send-msg', done); })
      .catch(function () { $('le-link').select(); msg('le-send-msg', 'Press Copy to copy the selected link.'); });
  }
  function first() { return f.first.value.trim() || (lead.name || '').split(/\s+/)[0] || 'there'; }
  function room() { var t = f.type.value; return t === 'Multiple spaces' ? (f.spaces.value.trim().toLowerCase() || 'project') : t.toLowerCase(); }
  function me() { var p = P(); var n = p && p.me && (p.me.name || p.me.email) || 'Ashley'; return n.split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }
  $('le-copy').onclick = function () { copy(link, 'Link copied.'); };
  $('le-sms').onclick = function () {
    var t = stage() === 'ballpark' ? 'Hi ' + first() + ', it’s ' + me() + ' with Sovereign Renovations. Your ' + room() + ' concept and ballpark are ready! Take a look here: ' + link
      : 'Hi ' + first() + ', it’s ' + me() + ' with Sovereign Renovations. Here are the details for your ' + room() + ' consultation: ' + link;
    copy(t, 'Text copied. Paste it into Messages.');
  };
  $('le-email').onclick = function () {
    if (!lead.email) { alert('Add their email on the lead first (on the Leads card), or copy the link and text it.'); return; }
    var ballpark = stage() === 'ballpark';
    window.SRNotify.open({ kind: 'lead-' + stage(), label: 'Email to ' + esc(first()), to: [{ name: lead.name || '', email: lead.email }], endpoint: 'leads/' + encodeURIComponent(ID) + '/email',
      subject: ballpark ? 'Your ' + room() + ' concept and ballpark' : 'Your ' + room() + ' consultation with Sovereign Renovations',
      text: ballpark ? 'Hi ' + first() + ',\n\nIt was great meeting you! Your ' + room() + ' concept and ballpark are ready. You can see everything here:\n\n' + link + '\n\nWhen you’re ready to start design & estimate, it’s one click from that page. Questions? Just reply or give us a call.\n\nThanks,\n' + me()
        : 'Hi ' + first() + ',\n\nThanks for reaching out to Sovereign Renovations! We put together a page for your ' + room() + ' consultation with the details and what to expect:\n\n' + link + '\n\nWe’re looking forward to meeting you.\n\n' + me() })
      .then(function (sent) { if (sent) api('leads/' + encodeURIComponent(ID) + '/page').then(function (r) { lead = r.lead; drawLead(); }); });
  };

  function start() {
    if (!P()) { document.querySelector('.ap-main').innerHTML = '<p class="ap-empty">Sign in to edit lead pages.</p>'; return; }
    if (!ID) { document.querySelector('.ap-main').innerHTML = '<p class="ap-empty">Open a lead from the Leads list.</p>'; return; }
    api('leads/' + encodeURIComponent(ID) + '/page').then(function (r) { lead = r.lead; page = r.page || {}; drawLead(); fillForm(); })
      .catch(function () { document.querySelector('.ap-main').innerHTML = '<p class="ap-empty">Couldn&rsquo;t find that lead. <a href="admin-home.html#leads">Back to leads</a></p>'; });
  }
  function showSpaces() { $('le-spaces-l').hidden = f.type.value !== 'Multiple spaces'; }
  f.type.addEventListener('change', function () { showSpaces(); if (f.type.value === 'Multiple spaces') f.spaces.focus(); if (!f.scope.value.trim()) useTemplate(f.type.value, true); });
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
