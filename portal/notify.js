/* Client email preview. Nothing is emailed to a client until Ashley reads the exact email here and clicks Send.
   SRNotify.open({ kind, subject, text })  -> shows To / Subject / Body (editable), then POST .../notify on Send.
   SRNotify.templates.reply(text) / board(board) / contract() / reminder() build the default wording. */
(function () {
  var SITE = 'https://sovereign-renovations.com/portal/';
  function P() { var p = window.SRPortal; return p && p.mode === 'live' ? p : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function me() { var p = P(); var n = p && p.me && (p.me.name || p.me.email) || 'Ashley'; return n.split(/[\s@]/)[0].replace(/^./, function (c) { return c.toUpperCase(); }); }

  var css = '.ntf-back{position:fixed;inset:0;background:rgba(30,26,20,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.ntf{background:#fff;max-width:620px;width:100%;max-height:92vh;overflow:auto;padding:26px 28px;font-size:15px;color:#2b2620;box-shadow:0 20px 60px rgba(0,0,0,.25)}' +
    '.ntf h2{margin:4px 0 14px;font-size:24px}.ntf .lab{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8a6a3c;display:block;margin:12px 0 4px}' +
    '.ntf input,.ntf textarea{width:100%;box-sizing:border-box;border:1px solid #d9d1c3;padding:9px 10px;font:inherit;background:#fbf9f5}.ntf textarea{min-height:220px;line-height:1.5}' +
    '.ntf .to{padding:9px 10px;background:#f3efe7}.ntf .acts{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center}' +
    '.ntf .warn{background:#f6eadb;padding:10px 12px;margin:10px 0 0;font-size:14px}.ntf .fine{font-size:13px;color:#8f897e;margin:10px 0 0}';

  function open(o) {
    var p = P();
    if (!p) { alert('Sign in to the portal to email the client.'); return Promise.resolve(false); }
    if (!document.getElementById('ntf-css')) { var st = document.createElement('style'); st.id = 'ntf-css'; st.textContent = css; document.head.appendChild(st); }
    return p.api('project/' + p.project + '/recipients').then(function (info) {
      return new Promise(function (done) {
        var to = info.recipients || [], first = to[0] && to[0].name ? to[0].name.split(' ')[0] : 'there';
        var text = (o.text || '').replace(/\{first\}/g, first), back = document.createElement('div');
        back.className = 'ntf-back';
        back.innerHTML = '<div class="ntf" role="dialog" aria-modal="true"><span class="lab">Email to the client &middot; preview</span><h2>Send this email?</h2>' +
          '<span class="lab">To</span><div class="to">' + (to.length ? to.map(function (r) { return esc((r.name ? r.name + ' ' : '') + '<' + r.email + '>'); }).join(', ') : '<i>No one yet</i>') + '</div>' +
          '<span class="lab">Subject</span><input id="ntf-subj" value="' + esc(o.subject) + '">' +
          '<span class="lab">Message</span><textarea id="ntf-text">' + esc(text) + '</textarea>' +
          (!to.length ? '<p class="warn">The client hasn&rsquo;t been invited to the portal yet, so there&rsquo;s no one to email.</p>' : '') +
          (!info.emailReady ? '<p class="warn">Email isn&rsquo;t connected yet, so this can&rsquo;t be sent. Your change is still saved in the portal.</p>' : '') +
          '<div class="acts"><button class="sr-btn" type="button" id="ntf-send"' + (to.length && info.emailReady ? '' : ' disabled') + '>Send email</button><button class="sr-btn ghost" type="button" id="ntf-skip">Don&rsquo;t send</button><span id="ntf-msg"></span></div>' +
          '<p class="fine">Sent from portal@sovereign-renovations.com. If they reply, it comes to your email.</p></div>';
        document.body.appendChild(back);
        var close = function (r) { back.remove(); done(r); };
        back.querySelector('#ntf-skip').onclick = function () { close(false); };
        back.querySelector('#ntf-send').onclick = function () {
          var b = this, msg = back.querySelector('#ntf-msg'); b.disabled = true; msg.textContent = 'Sending…';
          p.api('project/' + p.project + '/notify', { method: 'POST', body: JSON.stringify({ kind: o.kind, subject: back.querySelector('#ntf-subj').value, text: back.querySelector('#ntf-text').value }) })
            .then(function () { msg.textContent = 'Sent.'; setTimeout(function () { close(true); }, 900); })
            .catch(function () { msg.textContent = 'That didn’t send. Try again in a minute.'; b.disabled = false; });
        };
      });
    }).catch(function () { alert('Couldn’t load the client’s email address. Your change is saved; try the email again later.'); return false; });
  }

  var templates = {
    reply: function (t) { return { kind: 'reply', subject: me() + ' replied to your message', text: 'Hi {first},\n\nYou have a new message from ' + me() + ' in your Sovereign Renovations client portal:\n\n"' + t + '"\n\nYou can read it and reply here:\n' + SITE + 'index.html#message\n\nThanks,\n' + me() }; },
    board: function (b) { return { kind: 'board', subject: 'Your ' + b.name + ' selections are ready', text: 'Hi {first},\n\nYour ' + b.name + ' selection board is ready in your client portal. Take a look at the options and choose your favorite:\n\n' + SITE + 'selections.html#' + b.id + '\n\nLet me know if you have any questions.\n\nThanks,\n' + me() }; },
    contract: function () { return { kind: 'contract', subject: 'Your contract is ready to sign', text: 'Hi {first},\n\nYour build contract is ready. Open your client portal to read it, look over the attached estimate, and sign online:\n\n' + SITE + 'sign.html\n\nReach out with any questions.\n\nThanks,\n' + me() }; },
    reminder: function () { return { kind: 'reminder', subject: 'Reminder: your contract is ready to sign', text: 'Hi {first},\n\nJust a friendly reminder that your contract is waiting for your signature in your client portal:\n\n' + SITE + 'sign.html\n\nHappy to answer any questions.\n\nThanks,\n' + me() }; }
  };
  window.SRNotify = { open: open, templates: templates };
})();
