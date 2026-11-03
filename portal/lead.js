/* A lead's private page: lead.html?k=KEY. No sign-in; the key in the link is the pass.
   Shows the stage Ashley set (consultation, or concept & ballpark). Questions, a new consult time, "not right now"
   and the signed design agreement go to the server, which saves them on the lead and emails Ashley.
   Ashley's preview from the admin side adds &preview=1, so it doesn't count as the lead opening it. */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  var q = new URLSearchParams(location.search), KEY = (q.get('k') || '').replace(/[^a-f0-9]/g, ''), PREVIEW = q.get('preview') === '1';
  var ROOM = { Kitchen: 'kitchen', Bathroom: 'bathroom', 'Primary bath': 'primary bath', 'Powder room': 'powder room', 'Laundry room': 'laundry room', Mudroom: 'mudroom', 'Feature wall': 'feature wall', 'Fireplace wall': 'fireplace wall' };
  var D = null;

  function api(path, opts) {
    return fetch('/api/portal/lead-page/' + KEY + (path || ''), Object.assign({ headers: Object.assign({ 'Content-Type': 'application/json' }, PREVIEW ? { 'X-Preview': '1' } : {}) }, opts || {}))
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { status: r.status }); return j; }); });
  }

  function missing(text) {
    document.querySelector('.ld-hero .sr-wrap').innerHTML = '<span class="sr-label">Sovereign Renovations</span><h1>' + text + '</h1><p>Call or text us and we&rsquo;ll get you the right link: Greg &middot; <a href="tel:+19198889594">919-888-9594</a>, Ashley &middot; <a href="tel:+16108831787">610-883-1787</a>.</p>';
    var m = document.querySelector('.ld-main'); if (m) m.hidden = true;
  }
  if (!KEY) { missing('This page needs the private link we sent you.'); return; }

  function stageView(stage) {
    var cur = stage === 'consult' ? 1 : 2;
    document.querySelectorAll('[data-stage]').forEach(function (el) { el.hidden = el.dataset.stage !== stage; });
    document.querySelectorAll('[data-ph]').forEach(function (el) { var n = +el.dataset.ph; el.classList.toggle('done', n < cur); el.classList.toggle('now', n === cur); });
  }

  function fill(d) {
    D = d;
    var room = d.type === 'Multiple spaces' ? ((d.spaces || '').toLowerCase() || 'project') : ROOM[d.type] || (d.type ? d.type.toLowerCase() : 'project'), Room = room.charAt(0).toUpperCase() + room.slice(1);
    document.querySelectorAll('.ld-room').forEach(function (s) { s.textContent = room; });
    document.querySelectorAll('.ld-Room').forEach(function (s) { s.textContent = Room; });
    document.querySelectorAll('.ld-first').forEach(function (s) { s.textContent = d.first ? ' ' + d.first : ''; });
    $('ld-for').textContent = d.first ? 'Private page for ' + d.first : 'Your private page';
    document.querySelectorAll('.ld-dep').forEach(function (s) { s.textContent = money(d.deposit); });
    document.title = (d.stage === 'consult' ? 'Your ' + room + ' consultation' : 'Your ' + room + ' concept & ballpark') + ' | Sovereign Renovations';
    stageView(d.stage);
    if (PREVIEW) { var b = $('ld-banner'); b.hidden = false; b.innerHTML = 'Your preview &middot; this is what they see &middot; opening it here doesn&rsquo;t count as them viewing it'; }

    // Consultation
    if (d.consult) {
      var t = new Date(d.consult), hasTime = d.consult.length > 10;
      $('ld-when').innerHTML = '<b>' + t.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + '</b><span>' + (hasTime ? t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + ' &middot; ' : '') + esc(d.length || 'about an hour') + '</span>';
    }
    $('ld-addr').textContent = d.address || '';
    $('ld-whocomes').textContent = d.who || 'Ashley & Greg';
    if (!d.consult) { var c = $('ld-cal'); if (c) c.hidden = true; }

    // Concept
    var concept = document.querySelector('.ld-concept');
    if (d.concept) { $('ld-img').style.background = 'center/cover no-repeat url("' + d.concept + '")'; }
    if (d.walk) { $('ld-walk').href = d.walk; $('ld-walk').hidden = false; }
    if (!d.concept && !d.walk && concept) concept.hidden = true;

    // Scope and budget factors
    if (d.scope.length) $('ld-scope').innerHTML = d.scope.map(function (s) { var opt = /\(optional\)\s*$/i.test(s); return '<li' + (opt ? ' class="opt"' : '') + '>' + esc(s) + '</li>'; }).join('');
    else { var sc = $('ld-scope').closest('section'); if (sc && d.stage === 'ballpark') sc.hidden = true; }
    if (d.factors.length) $('ld-factors').innerHTML = d.factors.map(function (f) { return '<li><b>' + esc(f.t) + '</b><span>' + esc(f.d) + '</span></li>'; }).join('');
    else { var fh = $('ld-factors'); fh.hidden = true; if (fh.previousElementSibling) fh.previousElementSibling.hidden = true; }

    // Ballpark
    $('ld-range').innerHTML = d.low && d.high ? money(d.low) + ' <i>&ndash;</i> ' + money(d.high) : d.low ? 'From ' + money(d.low) : 'Coming soon';
    if (d.note) { $('ld-bnote').textContent = d.note; $('ld-bnote').hidden = false; }

    if (d.agreement) signedState();
  }

  function signedState() {
    var a = D.agreement, when = new Date(a.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    $('decide').innerHTML = '<h2>Design &amp; estimate is underway!</h2><p>Design agreement signed ' + when + ' by ' + esc(a.name) + '.</p>' +
      (D.paid ? '<p><b>Deposit received.</b> Thank you! Watch your email for your client portal invite.</p>'
        : (D.payUrl ? '<p>Next, pay your ' + money(D.deposit) + ' design deposit through QuickBooks.</p><a class="sr-btn gold ld-yes" href="' + esc(D.payUrl) + '" target="_blank" rel="noopener">Pay design deposit &rarr;</a>'
          : '<p>We&rsquo;ll email you the invoice for your ' + money(D.deposit) + ' design deposit.</p>')) +
      '<div class="ld-call"><span>Questions?</span><a href="tel:+19198889594">Greg &middot; 919-888-9594</a><a href="tel:+16108831787">Ashley &middot; 610-883-1787</a></div>';
    document.querySelectorAll('.ph').forEach(function (p, i) { p.className = 'ph' + (i < 2 ? ' done' : i === 2 ? ' now' : ''); });
  }

  // Modals
  function open(id) { $(id).hidden = false; }
  document.querySelectorAll('.ld-modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; });
  });
  function step(n) {
    document.querySelectorAll('#m-yes [data-step]').forEach(function (s) { s.hidden = s.dataset.step !== String(n); });
    document.querySelectorAll('#m-yes .ld-steps li').forEach(function (l) { l.classList.toggle('on', +l.dataset.s <= n); });
  }
  $('ld-yes').addEventListener('click', function () { step(1); open('m-yes'); });
  var name = $('ld-name'), ok = $('ld-ok'), sign = $('ld-sign');
  function upd() { $('ld-sig').textContent = name.value || ' '; sign.disabled = !(name.value.trim().length > 2 && ok.checked); }
  name.oninput = upd; ok.onchange = upd;
  sign.addEventListener('click', function () {
    if (PREVIEW) { alert('This is your preview, so nothing is signed. They’ll see the payment step next.'); step(2); return; }
    sign.disabled = true; sign.textContent = 'Signing…';
    api('/act', { method: 'POST', body: JSON.stringify({ kind: 'sign', name: name.value.trim(), agree: ok.checked, terms: document.querySelector('.ld-agree').innerText }) })
      .then(function (j) { D.agreement = j.agreement; signedState(); step(2); })
      .catch(function () { alert('Sorry, that didn’t go through. Please try again, or call us.'); sign.disabled = false; sign.textContent = 'Sign & continue'; });
  });
  // Step 2: pay through QuickBooks (or wait for the invoice)
  var pay = $('ld-pay');
  document.addEventListener('click', function (e) {
    if (e.target !== pay) return;
    if (!D || !D.payUrl) { e.preventDefault(); step(3); return; }
    setTimeout(function () { step(3); }, 400); // the invoice opens in a new tab; this page moves on to the thank-you
  });
  var mo = new MutationObserver(function () {
    if (!D) return;
    if (!D.payUrl) { pay.textContent = 'Continue'; pay.removeAttribute('target'); $('ld-paynote').textContent = 'We’ll email you the invoice for your design deposit.'; }
    else pay.href = D.payUrl;
  });
  mo.observe(document.getElementById('m-yes'), { attributes: true, attributeFilter: ['hidden'] });

  // Question / new time / not now
  function msg(kind) {
    var no = kind === 'no';
    $('m-msg-t').textContent = no ? 'No problem at all' : kind === 'resched' ? 'Find a better time' : 'Ask us anything';
    $('ld-msg-l').textContent = no ? 'Anything you’d like us to know? (optional)' : kind === 'resched' ? 'What days and times work for you?' : 'Your question';
    $('ld-why').hidden = !no; $('ld-msg-f').hidden = false; $('ld-msg-ok').hidden = true; $('ld-msg-f').reset();
    $('ld-msg-f').dataset.kind = kind; open('m-msg');
  }
  [['ld-q', 'question'], ['ld-q2', 'question'], ['ld-resched', 'resched'], ['ld-no', 'no']].forEach(function (p) {
    var el = $(p[0]); if (el) el.addEventListener('click', function (e) { e.preventDefault(); msg(p[1]); });
  });
  $('ld-msg-f').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, k = f.dataset.kind, text = f.body.value.trim(), why = (f.querySelector('input[name=why]:checked') || {}).value || '';
    if (k !== 'no' && !text) { f.body.focus(); return; }
    var done = function () {
      f.hidden = true; var o = $('ld-msg-ok'); o.hidden = false;
      o.textContent = k === 'no' ? 'Thanks for letting us know. Your page stays here if you change your mind.' : k === 'resched' ? 'Got it! We’ll reach out to set a new time.' : 'Sent! Greg or Ashley will get back to you within a business day.';
    };
    if (PREVIEW) { done(); return; }
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    api('/act', { method: 'POST', body: JSON.stringify({ kind: k, text: text, why: why }) }).then(done)
      .catch(function () { alert('Sorry, that didn’t send. Please try again, or call us.'); }).then(function () { btn.disabled = false; });
  });
  $('ld-cal').addEventListener('click', function (e) {
    e.preventDefault(); if (!D || !D.consult) return;
    var s = new Date(D.consult), hasTime = D.consult.length > 10, f = function (d) { return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; };
    var room = D.type === 'Multiple spaces' ? ((D.spaces || '').toLowerCase() || 'project') : ROOM[D.type] || 'project', end = new Date(s.getTime() + 3600000);
    var day = D.consult.slice(0, 10).replace(/-/g, '');
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sovereign Renovations//Portal//EN', 'BEGIN:VEVENT', 'UID:consult-' + KEY.slice(0, 12) + '@sovereign-renovations.com', 'DTSTAMP:' + f(new Date()),
      hasTime ? 'DTSTART:' + f(s) : 'DTSTART;VALUE=DATE:' + day, hasTime ? 'DTEND:' + f(end) : 'DTEND;VALUE=DATE:' + day,
      'SUMMARY:' + room.charAt(0).toUpperCase() + room.slice(1) + ' consultation with Sovereign Renovations', 'DESCRIPTION:' + (D.who || 'Ashley & Greg') + ' from Sovereign Renovations', D.address ? 'LOCATION:' + D.address.replace(/,/g, '\\,') : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'sovereign-consultation.ics'; document.body.appendChild(a); a.click(); a.remove();
  });

  // Google reviews
  fetch('/api/reviews?v=2').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    var box = $('ld-revs');
    if (!d || !d.reviews || !d.reviews.length) { box.innerHTML = '<p class="ld-fine">Read our reviews on Google.</p>'; return; }
    box.innerHTML = d.reviews.filter(function (r) { return r.rating >= 4; }).slice(0, 3).map(function (r) {
      var t = r.text.length > 260 ? r.text.slice(0, 250).replace(/\s+\S*$/, '') + '…' : r.text;
      return '<blockquote><p>&ldquo;' + esc(t) + '&rdquo;</p><cite>' + esc(r.author) + '</cite></blockquote>';
    }).join('');
  }).catch(function () { $('ld-revs').innerHTML = '<p class="ld-fine">Read our reviews on Google.</p>'; });

  document.body.classList.add('ld-loading');
  api('').then(fill).catch(function (e) { missing(e && e.status === 404 ? 'We couldn’t find this page.' : 'This page didn’t load. Please try again in a minute.'); })
    .then(function () { document.body.classList.remove('ld-loading'); });
})();
