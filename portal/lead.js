/* Lead page mockup: checklist, questionnaire, start-design flow (sign + pay), questions. Preview only. */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // Stage: consultation first, then concept & ballpark (Ashley moves the lead along from her side)
  var stage = new URLSearchParams(location.search).get('stage') === 'ballpark' ? 'ballpark' : 'consult';
  var cur = stage === 'consult' ? 1 : 2;
  document.querySelectorAll('[data-stage]').forEach(function (el) { el.hidden = el.dataset.stage !== stage; });
  document.querySelectorAll('[data-ph]').forEach(function (el) { var n = +el.dataset.ph; el.classList.toggle('done', n < cur); el.classList.toggle('now', n === cur); });
  document.querySelectorAll('.ld-stage').forEach(function (a) { a.classList.toggle('on', a.dataset.s === stage); });
  document.title = (stage === 'consult' ? 'Your kitchen consultation' : 'Your kitchen concept & ballpark') + ' | Sovereign Renovations';

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
  function upd() { $('ld-sig').textContent = name.value || ' '; sign.disabled = !(name.value.trim() && ok.checked); }
  name.oninput = upd; ok.onchange = upd;
  sign.addEventListener('click', function () { step(2); });
  $('ld-pay').addEventListener('click', function (e) {
    e.preventDefault(); step(3);
    $('decide').innerHTML = '<h2>Design &amp; estimate is underway!</h2><p>Signed ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' &middot; deposit paid.</p><p class="ld-fine">Your project now lives in your client portal, starting with a few quick steps. Check your email for the invite to set your password.</p><a class="sr-btn ld-yes" href="login.html">Go to sign in</a>';
    document.querySelectorAll('.ph').forEach(function (p, i) { p.className = 'ph' + (i < 2 ? ' done' : i === 2 ? ' now' : ''); });
  });

  // Question / not now
  function msg(kind) {
    var no = kind === 'no';
    $('m-msg-t').textContent = no ? 'No problem at all' : 'Ask us anything';
    $('ld-msg-l').textContent = no ? 'Anything you’d like us to know? (optional)' : 'Your question';
    $('ld-why').hidden = !no; $('ld-msg-f').hidden = false; $('ld-msg-ok').hidden = true; $('ld-msg-f').reset();
    $('ld-msg-f').dataset.kind = kind; open('m-msg');
  }
  $('ld-q').addEventListener('click', function (e) { e.preventDefault(); msg('q'); });
  $('ld-q2').addEventListener('click', function (e) { e.preventDefault(); msg('q'); });
  $('ld-resched').addEventListener('click', function (e) {
    e.preventDefault(); msg('q'); $('m-msg-t').textContent = 'Find a better time'; $('ld-msg-l').textContent = 'What days and times work for you?'; $('ld-msg-f').dataset.kind = 'resched';
  });
  $('ld-cal').addEventListener('click', function (e) {
    e.preventDefault();
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sovereign Renovations//Portal//EN', 'BEGIN:VEVENT', 'DTSTART:20261112T150000Z', 'DTEND:20261112T160000Z',
      'SUMMARY:Kitchen consultation with Sovereign Renovations', 'DESCRIPTION:Ashley & Greg from Sovereign Renovations', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'sovereign-consultation.ics'; a.click();
  });
  $('ld-no').addEventListener('click', function (e) { e.preventDefault(); msg('no'); });
  $('ld-msg-f').addEventListener('submit', function (e) {
    e.preventDefault(); this.hidden = true; var o = $('ld-msg-ok'); o.hidden = false;
    var k = this.dataset.kind;
    o.textContent = k === 'no' ? 'Thanks for letting us know. Your page stays here if you change your mind.' : k === 'resched' ? 'Got it! We’ll reach out to set a new time.' : 'Sent! Greg or Ashley will get back to you within a business day.';
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
})();
