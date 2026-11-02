/* Website photos admin: per-service photo lists for the homepage carousels. */
(function () {
  var SERVICES = [
    ['kitchenRemodel', 'Full Kitchen Remodel'], ['bathrooms', 'Bathrooms & Powder Rooms'], ['laundry', 'Laundry & Mudrooms'],
    ['featureWall', 'Fireplace & Feature Walls'], ['aLaCarte', 'A La Carte']
  ];
  var main = document.getElementById('ph-main'), lists = {}, defaults = {}, live = false;
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function src(x) { return x.id ? '/api/site-photos/img/' + x.id : x.url; }

  // Shrink phone photos before upload (max 2000px, JPEG) so they load fast on the site
  function shrink(file) {
    return new Promise(function (resolve) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 2000, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function save(service) {
    return fetch('/api/site-photos/' + service, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lists[service]) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { lists[service] = d.list; flash(service, 'Saved'); })
      .catch(function () { flash(service, 'Couldn’t save. Try again.', true); });
  }
  function flash(service, text, bad) {
    var el = document.querySelector('[data-svc="' + service + '"] .ph-status'); if (!el) return;
    el.textContent = text; el.classList.toggle('bad', !!bad); el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  function upload(service, files) {
    var sec = document.querySelector('[data-svc="' + service + '"]'), bar = sec.querySelector('.ph-progress');
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name); });
    if (!files.length) return;
    var done = 0; bar.hidden = false; bar.textContent = 'Uploading 1 of ' + files.length + '…';
    return files.reduce(function (p, f) {
      return p.then(function () { return shrink(f); }).then(function (small) {
        var fd = new FormData(); fd.append('file', small); fd.append('service', service);
        return fetch('/api/site-photos/upload', { method: 'POST', credentials: 'same-origin', body: fd });
      }).then(function (r) { return r.ok ? r.json() : r.json().then(function (e) { throw new Error(e.error || r.status); }); })
        .then(function (d) { lists[service] = d.list; done++; bar.textContent = 'Uploading ' + Math.min(done + 1, files.length) + ' of ' + files.length + '…'; render(service); })
        .catch(function (e) { flash(service, (e.message === 'not-an-image' ? 'That file isn’t a photo the site can use (try JPG or PNG).' : 'One photo didn’t upload.'), true); });
    }, Promise.resolve()).then(function () { bar.hidden = true; flash(service, done + ' photo' + (done === 1 ? '' : 's') + ' added'); });
  }

  function render(service) {
    var sec = document.querySelector('[data-svc="' + service + '"]'), grid = sec.querySelector('.ph-grid'), note = sec.querySelector('.ph-note');
    var own = lists[service] || [], defs = defaults[service] || [];
    sec.querySelector('.ph-count').textContent = own.length ? own.length + ' photo' + (own.length === 1 ? '' : 's') : 'Using defaults';
    if (own.length) {
      note.innerHTML = 'These show on your homepage in this order. The first one shows first.';
      grid.innerHTML = own.map(function (x, i) {
        return '<figure class="ph-item" draggable="true" data-i="' + i + '"><img src="' + esc(src(x)) + (x.id ? '' : '') + '" alt="" loading="lazy"><span class="ph-n">' + (i + 1) + '</span><button type="button" class="ph-x" data-del="' + i + '" aria-label="Remove photo">&times;</button></figure>';
      }).join('');
    } else {
      note.innerHTML = 'No photos added yet, so the homepage uses ' + defs.length + ' default photo' + (defs.length === 1 ? '' : 's') + ' from your Gallery (shown faded). ' +
        'Add your own to replace them' + (defs.length ? ', or <button type="button" class="ph-link" data-copy="1">copy these in to rearrange or remove some</button>.' : '.');
      grid.innerHTML = defs.map(function (u) { return '<figure class="ph-item def"><img src="' + esc(u) + '" alt="" loading="lazy"></figure>'; }).join('');
    }
  }

  function build() {
    main.innerHTML = SERVICES.map(function (s) {
      return '<section class="ab-card ph-sec" data-svc="' + s[0] + '"><div class="ab-card-head"><h2>' + esc(s[1]) + '</h2><div><span class="ph-status"></span><span class="ph-count"></span></div></div>' +
        '<p class="ph-note"></p><div class="ph-grid"></div>' +
        '<label class="ph-drop"><input type="file" accept="image/*" multiple><b>+ Add photos</b><span>Drop photos here or click to choose. Big phone photos are fine; they&rsquo;re resized automatically.</span></label>' +
        '<p class="ph-progress" hidden></p></section>';
    }).join('');
    SERVICES.forEach(function (s) { wire(s[0]); render(s[0]); });
  }

  function wire(service) {
    var sec = document.querySelector('[data-svc="' + service + '"]'), grid = sec.querySelector('.ph-grid'), drop = sec.querySelector('.ph-drop');
    drop.querySelector('input').addEventListener('change', function (e) { upload(service, e.target.files); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { sec.addEventListener(ev, function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0) { e.preventDefault(); drop.classList.add('over'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { sec.addEventListener(ev, function () { drop.classList.remove('over'); }); });
    sec.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); upload(service, e.dataTransfer.files); } });
    sec.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]'), cp = e.target.closest('[data-copy]');
      if (del) { if (!confirm('Remove this photo from the homepage?')) return; lists[service].splice(+del.dataset.del, 1); render(service); save(service); }
      if (cp) { lists[service] = (defaults[service] || []).map(function (u) { return { url: /^https?:/.test(u) ? u : location.origin + '/' + u.replace(/^(\.\.\/)+/, '').replace(/^\//, ''), alt: '' }; }); render(service); save(service); }
    });
    // drag to reorder
    var from = null;
    grid.addEventListener('dragstart', function (e) { var f = e.target.closest('.ph-item:not(.def)'); if (!f) return; from = +f.dataset.i; f.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'x'); });
    grid.addEventListener('dragend', function (e) { var f = e.target.closest('.ph-item'); if (f) f.classList.remove('drag'); });
    grid.addEventListener('dragover', function (e) { if (from !== null) e.preventDefault(); });
    grid.addEventListener('drop', function (e) {
      if (from === null) return; e.preventDefault(); e.stopPropagation();
      var t = e.target.closest('.ph-item:not(.def)'); var to = t ? +t.dataset.i : lists[service].length - 1;
      if (to !== from) { var it = lists[service].splice(from, 1)[0]; lists[service].splice(to, 0, it); render(service); save(service); }
      from = null;
    });
  }

  function start() {
    live = !!(window.SRPortal && window.SRPortal.mode === 'live');
    if (!live) { main.innerHTML = '<p class="ph-wait">Sign in to manage website photos.</p>'; return; }
    Promise.all([
      fetch('/api/site-photos', { cache: 'no-store' }).then(function (r) { return r.json(); }),
      window.SRPhotoDefaults ? window.SRPhotoDefaults('../') : Promise.resolve({})
    ]).then(function (res) { lists = (res[0] && res[0].services) || {}; defaults = res[1] || {}; build(); })
      .catch(function () { main.innerHTML = '<p class="ph-wait">Couldn’t load photos. Refresh to try again.</p>'; });
  }
  if (window.SRPortal) start(); else document.addEventListener('sr-portal-ready', start, { once: true });
})();
