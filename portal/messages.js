/* Messages between the client and Sovereign, saved on the portal server.
   The thread is read from sr-portal-messages (synced down by auth.js); new messages go out with POST .../messages,
   which stamps who sent it and when. Used on the client dashboard (#pt-thread) and the admin Messages page (#ap-thread). */
(function () {
  var KEY = 'sr-portal-messages';
  function list() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function first(m) { return (m.name || m.email || '').split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }
  function live() { var P = window.SRPortal; return P && P.mode === 'live' ? P : null; }

  function render(box, side) {
    var msgs = list();
    if (!msgs.length) {
      box.innerHTML = '<p class="msg-empty">' + (side === 'admin' ? 'No messages yet. When the client writes through &ldquo;Message us,&rdquo; it shows here.' : 'No messages yet. Your conversation with Ashley and Greg will show here.') + '</p>';
      return;
    }
    box.innerHTML = msgs.map(function (m) {
      var mine = (side === 'admin') === (m.from === 'admin');
      return '<div class="msg-b ' + (mine ? 'mine' : 'theirs') + '"><span class="msg-meta">' + esc(first(m)) + (m.topic ? ' &middot; ' + esc(m.topic) : '') + ' &middot; ' + esc(when(m.at)) + '</span><p>' + esc(m.text).replace(/\n/g, '<br>') + '</p></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function send(text, topic) {
    var P = live();
    if (!P) return Promise.reject(new Error('preview'));
    return P.api('project/' + P.project + '/messages', { method: 'POST', body: JSON.stringify({ text: text, topic: topic || '' }) })
      .then(function (r) { localStorage.setItem(KEY, JSON.stringify(r.messages)); return r; });
  }

  function wire(box, side, textarea, button, topicEl, okEl) {
    render(box, side);
    button.addEventListener('click', function () {
      var t = textarea.value.trim(); if (!t) { textarea.focus(); return; }
      if (!live()) { alert('Messages send once you are signed in to the portal.'); return; }
      button.disabled = true; var label = button.textContent; button.textContent = 'Sending…';
      send(t, topicEl ? topicEl.value : '').then(function () {
        textarea.value = ''; render(box, side);
        if (okEl) { okEl.hidden = false; setTimeout(function () { okEl.hidden = true; }, 4000); }
      }).catch(function () { alert('Sorry, that message didn’t send. Please try again.'); })
        .then(function () { button.disabled = false; button.textContent = label; });
    });
  }

  function init() {
    var c = document.getElementById('pt-thread');
    if (c) wire(c, 'client', document.getElementById('m-body'), document.getElementById('m-send'), document.getElementById('m-topic'), document.getElementById('m-ok'));
    var a = document.getElementById('ap-thread');
    if (a) wire(a, 'admin', document.getElementById('ap-reply-text'), document.getElementById('ap-reply-send'), null, document.getElementById('ap-reply-ok'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
