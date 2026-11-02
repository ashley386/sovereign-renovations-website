/* All projects page: connects each project card to the portal.
   Set up -> "Open project", with each client's sign-in status. Not set up -> "Set up portal".
   Projects set up from "+ Set up a new project" that don't have a card yet get one. */
(function () {
  var box = document.querySelector('.ah-projects'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function status(p) {
    var cs = (p.clients || []).filter(function (c) { return c.email; });
    if (!cs.length) return 'Set up &middot; no client email yet';
    if (cs.some(function (c) { return c.firstLogin; })) return 'Portal live';
    if (cs.some(function (c) { return c.invitedAt; })) return 'Invited &middot; hasn&rsquo;t signed in yet';
    return 'Set up &middot; not invited yet';
  }
  function setupLink(card) {
    var id = card.dataset.id, name = (card.querySelector('h2') || {}).textContent || '', type = (card.querySelector('.ah-type') || {}).textContent || '', ph = ((card.querySelector('.ah-ph') || {}).textContent || '').slice(0, 2);
    return 'admin-setup.html?project=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(name) + '&type=' + encodeURIComponent(type) + (/^\d\d$/.test(ph) ? '&phase=' + ph : '');
  }
  function wire(list) {
    var byId = {}; list.forEach(function (p) { byId[p.id] = p; });
    box.querySelectorAll('.ah-proj[data-id]').forEach(function (card) {
      var id = card.dataset.id, p = byId[id], go = card.querySelector('.ah-go'), tag = card.querySelector('.ah-portal');
      if (id === 'rusk' && !p) return; // the original sample project
      if (card.classList.contains('hold') && !p) return;
      if (p) {
        if (tag) { tag.innerHTML = status(p); tag.classList.add('on'); }
        var open = document.createElement('a'); open.className = 'ah-go'; open.href = 'admin-project.html?project=' + encodeURIComponent(id); open.innerHTML = 'Open project &rarr;';
        var edit = document.createElement('a'); edit.className = 'ah-go ah-edit'; edit.href = 'admin-setup.html?project=' + encodeURIComponent(id); edit.textContent = 'Edit setup';
        if (go) go.replaceWith(open); else card.appendChild(open);
        open.insertAdjacentElement('afterend', edit);
      } else if (go) {
        var a = document.createElement('a'); a.className = 'ah-go'; a.href = setupLink(card); a.innerHTML = 'Set up portal &rarr;'; go.replaceWith(a);
      }
    });
    list.forEach(function (p) {
      if (box.querySelector('.ah-proj[data-id="' + p.id + '"]')) return;
      var d = document.createElement('div'); d.className = 'ah-proj'; d.dataset.id = p.id;
      d.innerHTML = '<div class="ah-proj-top"><span class="ah-type">' + esc(p.type || 'Project') + '</span><span class="ah-portal on">' + status(p) + '</span></div>' +
        '<h2>' + esc(p.name) + '</h2><p class="ah-who">' + esc((p.clients || []).map(function (c) { return c.name; }).filter(Boolean).join(' & ')) + '</p>' +
        '<span class="ah-ph">' + esc(p.phase || '') + '</span>' +
        '<a class="ah-go" href="admin-project.html?project=' + encodeURIComponent(p.id) + '">Open project &rarr;</a><a class="ah-go ah-edit" href="admin-setup.html?project=' + encodeURIComponent(p.id) + '">Edit setup</a>';
      box.insertBefore(d, box.firstChild);
    });
  }

  function load() { fetch('/api/portal/projects', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : { projects: [] }; }).then(function (j) { wire(j.projects || []); }).catch(function () { wire([]); }); }
  if (window.SRPortal) load(); else document.addEventListener('sr-portal-ready', load);
})();
