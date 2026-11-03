/* "+ To-do" button on every page of a project (the bar under the header).
   The master to-do list is the Sovereign To-Do in Claude. This opens it at this job's card with its "Add a to-do" box ready
   (the to-do page reads #add-<project id>; project ids match between the portal and the to-do list). */
(function () {
  var bar = document.querySelector('.ap-sub-in'); if (!bar) return;
  var TODO = 'https://claude.ai/artifact/8B2hSHt4LgGo27fyYvnLZg';
  function job() { return ((window.SRPortal && window.SRPortal.project) || window.SRProjectPick || 'rusk').replace(/[^a-z0-9-]/gi, '').toLowerCase(); }

  var css = document.createElement('style');
  css.textContent =
    '.ap-sub a.jt-btn{position:sticky;right:0;margin-left:auto;flex:none;align-self:center;background:#fff;border:1px solid var(--sr-ink);color:var(--sr-ink);' +
    'padding:7px 12px;letter-spacing:.12em;box-shadow:-14px 0 10px #fff}' +
    '.ap-sub a.jt-btn:hover{background:var(--sr-ink);color:var(--sr-cream)}';
  document.head.appendChild(css);

  var a = document.createElement('a');
  a.className = 'jt-btn'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '+ To-do';
  a.title = 'Add a to-do for this job on your Sovereign To-Do';
  // Lead pages (admin-lead.html) have no project id: send the lead's name instead, which the to-do page matches by surname.
  var leadName = document.getElementById('le-name');
  function slug(s) { return String(s || '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function set() {
    var key = leadName ? slug(leadName.textContent === 'Lead' ? '' : leadName.textContent) : job();
    a.href = TODO + (key ? '#add-' + key : '');
  }
  set(); bar.appendChild(a);
  document.addEventListener('sr-portal-ready', set);
  if (leadName) new MutationObserver(set).observe(leadName, { childList: true, characterData: true, subtree: true });
})();
