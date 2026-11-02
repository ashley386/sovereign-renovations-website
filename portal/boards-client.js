/* Client selections page: builds the boards from sr-portal-boards (synced by auth.js).
   Clients receive only boards that were shared with them, already stripped of costs; each option carries its upgrade amount.
   When an admin opens this page ("Preview as Janet"), drafts show too, marked as hidden from the client. */
(function () {
  var main = document.querySelector('.pt-sel-main'); if (!main) return;
  var MARKUP = 1.25, MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var boards = []; try { boards = JSON.parse(localStorage.getItem('sr-portal-boards')) || []; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function nice(iso) { var p = (iso || '').split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) : ''; }
  function upgrade(b, o) {
    if (typeof o.upgrade === 'number') return o.upgrade;                       // client copy from the server
    var l = Number(b.limit) || 0, price = (Number(o.cost) || 0) * MARKUP * (Number(o.qty) || 1);   // admin preview
    return l > 0 ? Math.max(0, Math.round(price - l)) : 0;
  }
  var show = boards.filter(function (b) { return b.status === undefined || b.status === 'sent' || b.status === 'draft'; });

  if (!show.length) {
    main.innerHTML = '<section class="pt-card"><h2>Nothing to choose yet</h2><p>Your selection boards will show up here as Ashley gets them ready. Each one lets you compare options and pick your favorite.</p></section>';
    return;
  }
  function board(b) {
    var opts = b.options || [], draft = b.status === 'draft';
    return '<section class="pt-card pt-sel-board' + (draft ? ' soon' : '') + '" id="' + esc(b.id) + '" data-sec="board-' + esc(b.id) + '">' +
      '<div class="pt-card-head"><div><span class="sr-label">' + esc(b.group || 'Selection') + (draft ? ' &middot; draft, Janet can&rsquo;t see this yet' : '') + '</span><h2>' + esc(b.name) + '</h2></div>' +
      '<span class="pt-count">' + (b.due ? 'Choose by ' + esc(nice(b.due)) : opts.length + ' option' + (opts.length === 1 ? '' : 's')) + '</span></div>' +
      (b.note || (b.range && (b.showRange || b.showRange === undefined)) ? '<p class="pt-board-note">' + esc(b.note) + (b.range && (b.showRange || b.showRange === undefined) ? ' <b>Your estimate range: ' + esc(b.range) + '</b>' : '') + '</p>' : '') +
      '<div class="pt-options n' + Math.min(Math.max(opts.length, 1), 3) + '">' + opts.map(function (o) {
        var up = upgrade(b, o), img = o.photo ? 'center/cover url(' + o.photo + ')' : (o.bg || '#ece6da');
        return '<label class="pt-option"><input type="radio" name="' + esc(b.id) + '" value="' + esc(o.id) + '">' +
          '<div class="pt-opt-img" style="background:' + esc(img) + '"></div>' +
          '<div class="pt-opt-body"><span class="pt-opt-letter">Option ' + esc(o.letter) + '</span><h4>' + esc(o.name) + '</h4>' + (o.details ? '<p>' + esc(o.details) + '</p>' : '') +
          '<span class="pt-budget ' + (up ? 'over' : 'ok') + '">' + (up ? 'Upgrade +' + money(up) : 'Included in your estimate') + '</span></div></label>';
      }).join('') + '</div>' +
      (opts.some(function (o) { return upgrade(b, o) > 0; }) ? '<p class="pt-board-fine">Choosing an option saves your selection. Choosing an upgrade approves it as a change order for the amount shown. You can switch until we order.</p>' : '') +
      '</section>';
  }
  var groups = [];
  show.forEach(function (b) { var g = b.group || 'Selections'; if (groups.indexOf(g) < 0) groups.push(g); });
  function slug(g) { return 'g-' + g.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  main.innerHTML = groups.map(function (g) {
    return '<h2 class="pt-group" id="' + slug(g) + '">' + esc(g) + '</h2>' + show.filter(function (b) { return (b.group || 'Selections') === g; }).map(board).join('');
  }).join('');
  var tabs = document.getElementById('pt-tabs');
  if (tabs) tabs.innerHTML = groups.length > 1 ? groups.map(function (g, i) {
    return '<a href="#' + slug(g) + '"' + (i ? '' : ' class="on"') + '>' + esc(g) + ' <b>' + show.filter(function (b) { return (b.group || 'Selections') === g; }).length + '</b></a>';
  }).join('') : '';

  // An admin previewing sees exactly what Janet sees, but can't choose for her.
  document.addEventListener('sr-portal-ready', function () {
    var P = window.SRPortal; if (!P || !P.me || P.me.role !== 'admin') return;
    main.querySelectorAll('.pt-option input').forEach(function (i) { i.disabled = true; });
    var n = document.createElement('p'); n.className = 'pt-admin-note'; n.innerHTML = 'You&rsquo;re previewing as Janet. Choices are hers to make, so options can&rsquo;t be picked here.';
    main.insertBefore(n, main.firstChild);
  });
})();
