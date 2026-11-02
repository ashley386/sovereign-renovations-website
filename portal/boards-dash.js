/* Client dashboard: the "Your selections" card, built from the boards shared with the client. */
(function () {
  var box = document.getElementById('pt-boards'); if (!box) return;
  var boards = [], choices = {};
  try { boards = (JSON.parse(localStorage.getItem('sr-portal-boards')) || []).filter(function (b) { return b.status === undefined || b.status === 'sent'; }); choices = JSON.parse(localStorage.getItem('sr-portal-choices')) || {}; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var waiting = 0;
  box.innerHTML = boards.length ? boards.map(function (b) {
    var opts = b.options || [], c = choices[b.id], pick = opts.filter(function (o) { return o.id === c; })[0] || (typeof c === 'number' ? opts[c] : null);
    if (!pick) waiting++;
    var sw = (pick || opts[0] || {}), img = sw.photo ? 'center/cover url(' + sw.photo + ')' : (sw.bg || '#ece6da');
    return '<a class="pt-board" href="selections.html#' + esc(b.id) + '"><div class="pt-swatches" style="background:' + esc(img) + '"></div>' +
      '<div class="pt-board-body"><h3>' + esc(b.name) + '</h3><p>' + (pick ? 'You chose ' + esc(pick.name || 'Option ' + pick.letter) : opts.length + ' option' + (opts.length === 1 ? '' : 's')) + '</p>' +
      '<span class="pt-status ' + (pick ? 'paid' : 'wait') + '">' + (pick ? 'Chosen' : (opts.length > 1 ? 'Choose 1' : 'Review')) + '</span></div></a>';
  }).join('') : '<p class="pt-empty">No selection boards yet. They&rsquo;ll show up here as Ashley gets them ready.</p>';
  var n = document.getElementById('pt-boards-count');
  if (n) n.innerHTML = boards.length ? (waiting ? '<b>' + waiting + '</b> waiting for you' : 'All chosen') : '';
})();
