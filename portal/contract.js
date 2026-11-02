/* Preview mockup: contract built from Sovereign's Remodeling Contract template,
   signed electronically by the contractor and then the homeowner.
   The contract terms save to the portal server (key sr-portal-contract, synced by auth.js).
   The homeowner's signature is created by the server (POST .../sign) and synced back as sr-portal-contract-sig. */
(function () {
  var KEY = 'sr-portal-contract';
  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DEFAULTS = {
    template: 'remodel',
    effective: '', // filled in when the homeowner signs
    homeowner: 'Janet Rusk',
    email: 'client@example.com',
    homeAddr: '123 Sample Lane, Raleigh, NC 27601',
    services: 'as outlined in the Estimate (attached as Exhibit A)',
    sameAddr: true,
    property: '',
    start: '2027-01-11',
    substPct: '90',
    subst: '2027-02-19',
    full: '2027-03-05',
    total: 100000, // sample; the working version pulls this from the QuickBooks estimate
    p1: 25, p2: 30, p3: 45, // deposit 20-30%, 30% at 75% complete, remainder at completion
    attachEstimate: true,
    contractor: 'Ashley Sovereign'
  };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  // Save, then run next() once the server confirms (or right away in preview mode).
  function saveThen(s, next) {
    var P = window.SRPortal, live = P && P.mode === 'live', fired = false;
    function go(ok) { if (fired) return; fired = true; document.removeEventListener('sr-portal-saved', onOk); document.removeEventListener('sr-portal-save-failed', onBad);
      if (ok === false) { alert('That didn\u2019t save. ' + (window.SRContractLockedMsg || 'Please try again.')); return; } next(); }
    function onOk(e) { if (e.detail && e.detail.key === KEY) go(true); }
    function onBad(e) { if (e.detail && e.detail.key === KEY) go(false); }
    if (live) { document.addEventListener('sr-portal-saved', onOk); document.addEventListener('sr-portal-save-failed', onBad); setTimeout(function () { go(true); }, 8000); }
    save(s); if (!live) go(true);
  }
  function sig() { try { return JSON.parse(localStorage.getItem('sr-portal-contract-sig')) || null; } catch (e) { return null; } }
  function state() { var s = load(); if (!s) s = { status: 'none', f: JSON.parse(JSON.stringify(DEFAULTS)) };
    var g = sig(); if (g) { s.client = { name: g.name, date: g.date, email: g.email, stamp: g.stamp }; s.status = 'signed'; s.f.effective = g.date; }
    if (+s.f.p1 === 50 && +s.f.p2 === 40) { s.f.p1 = 25; s.f.p2 = 30; s.f.p3 = 45; } // old preview default
    return s; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function longDate(iso) { var p = (iso || '').split('-'); return p.length === 3 ? MON[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0] : ''; }
  function todayISO() { var t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pay(f, k) { return Math.round(f.total * (+f[k] || 0)) / 100; }
  function dateOrTBD(iso) { return iso ? longDate(iso) : 'TBD'; }
  function fill(v, blank) { return v ? '<span class="ct-fill">' + v + '</span>' : '<span class="ct-blank">' + (blank || '&nbsp;') + '</span>'; }

  function sigBlock(who, sig, name) {
    return '<div class="ct-sig"><h4>' + who + '</h4>' +
      '<p>Signed: ' + (sig ? '<span class="ct-sigline">' + esc(sig.name) + '</span>' : '<span class="ct-blank wide">&nbsp;</span>') + '</p>' +
      '<p>Name: ' + fill(esc(sig ? sig.name : name)) + '</p>' +
      '<p>Date: ' + fill(sig ? longDate(sig.date) : '') + '</p>' +
      (sig ? '<p class="ct-audit">Signed electronically &middot; ' + esc(sig.email) + ' &middot; ' + esc(sig.stamp) + '</p>' : '') + '</div>';
  }

  function sec(title, body) { return '<li><h3>' + title + '</h3>' + body + '</li>'; }
  function render(s) {
    var f = s.f, prop = f.sameAddr ? f.homeAddr : f.property;
    var eff = s.client ? longDate(s.client.date) : '';
    return '<div class="ct-doc">' +
      '<div class="ct-brand"><img src="../assets/images/brand/seal-light.png" alt="Sovereign Renovations"></div>' +
      '<h2>Remodeling Contract</h2>' +
      '<p>This Remodeling Contract (the &ldquo;Contract&rdquo;) is entered into ' + fill(eff, 'date of homeowner signature') + ' (the &ldquo;Effective Date&rdquo;), by and between Sovereign Renovations, LLC, with an address of 2512 Hidden Meadow Dr, Fuquay-Varina, NC (the &ldquo;Contractor&rdquo;) and ' + fill(esc(f.homeowner)) + ' with an address of ' + fill(esc(f.homeAddr)) + ' (the &ldquo;Homeowner&rdquo;), also individually referred to as &ldquo;Party&rdquo;, and collectively the &ldquo;Parties.&rdquo;</p>' +
      '<ol class="ct-sec">' +
      sec('Remodeling Services.', '<p>The Homeowner wishes to obtain the Contractor&rsquo;s services to perform the following work: ' + fill(esc(f.services)) + ' (the &ldquo;Services&rdquo;). The Services are to be performed at the following address: ' + fill(esc(prop)) + ' (the &ldquo;Property&rdquo;). The Contractor agrees to furnish the labor, materials, and supplies necessary to perform the Services in accordance with the terms and conditions contained in this Contract. Upon completion of the Services, the Contractor will remove all materials, supplies, and other debris.</p>') +
      sec('Changes in the Services.', '<p>The Homeowner may request reasonable changes to the Services described in Section 1. Any changes to the Services must be in writing and signed by both the Contractor and the Homeowner. The Homeowner agrees that any changes to the Services may result in additional charges and extend the Remodeling Schedule described in Section 3.</p>') +
      sec('Remodeling Schedule.', '<p>The Contractor will complete the Services in accordance with the following schedule. The Homeowner agrees that all dates are subject to change if the Homeowner requests any changes or additions to the Services. The completion date is further subject to weather conditions and product availability.</p>' +
        '<table class="ct-tbl"><tr><td>Start Date</td><td>' + fill(dateOrTBD(f.start)) + '</td></tr><tr><td>Substantial (' + fill(esc(f.substPct)) + '%) Completion Date</td><td>' + fill(dateOrTBD(f.subst)) + '</td></tr><tr><td>Full Completion Date</td><td>' + fill(dateOrTBD(f.full)) + '</td></tr></table>') +
      sec('Payment Schedule.', '<p>The Homeowner agrees to pay the Contractor the Total Payment specified below for the Services in accordance with the following schedule:</p>' +
        '<table class="ct-tbl"><tr><td>Upon execution of the Contract</td><td>' + fill(money(pay(f, 'p1'))) + '</td></tr><tr><td>Upon completion of 75% of the Services</td><td>' + fill(money(pay(f, 'p2'))) + '</td></tr><tr><td>Remaining balance, upon completion</td><td>' + fill(money(pay(f, 'p3'))) + '</td></tr><tr class="tot"><td>TOTAL AMOUNT DUE</td><td>' + fill(money(f.total)) + '</td></tr></table>' +
        '<p>The Contractor agrees to provide the Homeowner a breakdown of all costs (i.e., materials and labor) upon the Homeowner&rsquo;s request. Deposit, due upon execution of Contract, is refundable until 60 days before Start Date, less any unrecoverable expenses (i.e., vendor or subcontract deposits, unreturnable materials, etc.) as determined by Contractor.</p>') +
      sec('Liens and Waiver of Liens.', '<p>The Contractor agrees to provide the Homeowner lien waivers, lien releases, and/or acknowledgement of full payment upon receipt of each payment laid out in the Payment Schedule in Section 4 above.</p>') +
      sec('Events Beyond the Contractor&rsquo;s Control.', '<p>The Homeowner agrees that if the Contractor is unable to complete the Services by the Completion Date because of reasons that were not caused by the Contractor (i.e., availability of necessary supplies, materials, etc.) or because of events beyond the Contractor&rsquo;s control (such as labor issues, fire, flood, acts of God, vandalism, etc.), the Contractor will not be deemed to have breached this Contract and the time for the Contractor to complete the Services will be extended by the amount of time reasonably necessary for the Contractor to complete the Services and at a schedule agreeable to the Parties. The time for the Homeowner to pay the Contractor for the Services will be extended in the same manner.</p>') +
      sec('Safety Precautions.', '<p>The Contractor will take all reasonable safety precautions in performing the Services. The Contractor will comply with all applicable laws, ordinances, rules, regulations, and orders of public authorities for the safety of persons and property. The Homeowner agrees to keep the Property clear of all known and potential hazards. The Homeowner further agrees to keep all pets out of the work area of the Property.</p>') +
      sec('Liability Waiver.', '<p>If the Contractor, any of its employees, contractors, agents, or the like are injured in the course of performing the Services, the Homeowner is exempt from liability for those injuries to the fullest extent allowed by law, unless the injury is due to the Homeowner&rsquo;s negligence.</p>') +
      sec('Termination.', '<p>The Homeowner can terminate the Contract by giving written notice: (a) if the Contractor commits any material breach of this Contract and fails to correct the breach within ten (10) days of notice of the breach; or (b) if there is any repeated failure by the Contractor to provide the Services of an acceptable standard and to the reasonable satisfaction of the Homeowner.</p><p>The Contractor can terminate the Contract by giving written notice: (a) if the Homeowner fails to make the payments required and set forth in Section 4 within five (5) days of notice of failure to make a payment; or (b) if the Homeowner commits any other material, non-financial breach and fails to correct the breach within ten (10) days of notice of the breach.</p>') +
      sec('1-Year Limited Warranty.', '<p>Sovereign Renovations provides a 1-year limited warranty on labor and workmanship for the remodeling services completed at your property. This warranty is valid for 12 months from the date of project completion.</p><p>During this warranty period, we will repair any defects due to faulty workmanship that arise under normal residential use at no cost to the homeowner.</p><p>This warranty excludes the following:</p><ul><li>Damage caused by misuse, abuse, accidents, or neglect</li><li>Issues arising from improper maintenance, including the use of harsh or non-recommended cleaning products (e.g., abrasive cleaners, bleach, or acidic substances not suitable for the installed surfaces)</li><li>Damage resulting from poor water quality, including excessive hardness, high mineral content, or corrosive water conditions</li><li>Natural wear and tear or aging of materials</li><li>Modifications or repairs made by others after project completion</li><li>Materials or products supplied by third parties (these may be covered under separate manufacturer warranties)</li></ul><p>To ensure continued performance and longevity, we recommend using only manufacturer-approved or pH-neutral cleaning products and maintaining appropriate water treatment if required for your area.</p><p>To make a warranty claim, please contact us in writing with a description of the issue. We reserve the right to inspect and assess any claims before performing repairs.</p><p>This warranty is non-transferable and applies only to the original homeowner.</p>') +
      sec('Entire Agreement.', '<p>This document reflects the entire agreement between the Parties and reflects a complete understanding of the Parties with respect to the subject matter. This Contract supersedes all prior written and oral representations. The Contract may not be amended, altered, or supplemented except in writing signed by both the Contractor and the Homeowner.</p>') +
      sec('Dispute Resolution and Legal Fees.', '<p>In the event of a dispute arising out of this Contract that cannot be resolved by mutual agreement, the Parties agree to engage in mediation. If the matter cannot be resolved through mediation, and legal action ensues, the successful Party will be entitled to its legal fees, including, but not limited to its attorneys&rsquo; fees.</p>') +
      sec('Legal and Binding Contract.', '<p>This Contract is legal and binding between the Parties as stated above. This Contract may be entered into and is legal and binding in the United States. The Parties each represent that they have the authority to enter into this Contract.</p>') +
      sec('Severability.', '<p>If any provision of this Contract shall be held to be invalid or unenforceable for any reason, the remaining provisions shall continue to be valid and enforceable. If the Court finds that any provision of this Contract is invalid or unenforceable, but that by limiting such provision it would become valid and enforceable, then such provision shall be deemed to be written, construed, and enforced as so limited.</p>') +
      sec('Waiver.', '<p>The failure of either Party to enforce any provision of this Contract shall not be construed as a waiver or limitation of that Party&rsquo;s right to subsequently enforce and compel strict compliance with every provision of this Contract.</p>') +
      sec('Applicable Law.', '<p>This Contract shall be governed and construed in accordance with the laws of the state where the Property is located, without giving effect to any conflicts of laws provisions.</p>') +
      '</ol>' +
      '<p class="ct-caps">By signing below, the customer acknowledges having read and understood this contract and that the homeowner is satisfied with the terms and conditions contained in this contract. The homeowner should not sign this contract if there are any blank spaces. The homeowner is entitled to a copy of this contract at the time of signature.</p>' +
      (f.attachEstimate ? '<div class="ct-exhibit"><div class="pt-doc-icon">PDF</div><div><b>Exhibit A &middot; Estimate &ldquo;Rusk (kitchen)&rdquo;</b><span>From QuickBooks &middot; Oct 23 &middot; attached to and part of this Contract</span></div><a href="#" class="pt-dl">View</a></div>' : '') +
      '<p>The Parties agree to the terms and conditions set forth above as demonstrated by their signatures as follows:</p>' +
      '<div class="ct-sigs">' + sigBlock('Contractor', s.contractor, f.contractor) + sigBlock('Homeowner', s.client, f.homeowner) + '</div>' +
      '</div>';
  }

  function stamp() { var t = new Date(); return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

  window.SRContract = { state: state, save: save, saveThen: saveThen, render: render, money: money, longDate: longDate, todayISO: todayISO, stamp: stamp, defaults: DEFAULTS, reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} } };
})();

/* Mount points on the dashboards */
(function () {
  var C = window.SRContract; if (!C) return;
  var s = C.state(), f = s.f;
  var admin = document.getElementById('ap-contract');
  if (admin) {
    var st = s.status, steps = [
      ['Estimate approved', 'QuickBooks estimate &middot; Oct 23', 'done'],
      ['Contract prepared', st === 'none' ? 'From your Remodeling Contract template' : 'Remodeling Contract + Exhibit A', st === 'none' ? 'now' : 'done'],
      ['Signed by Sovereign', s.contractor ? s.contractor.name + ' &middot; ' + s.contractor.stamp : '&mdash;', s.contractor ? 'done' : (st === 'draft' ? 'now' : '')],
      ['Signed by Janet', s.client ? s.client.stamp : (st === 'sent' ? 'Waiting on Janet' : '&mdash;'), s.client ? 'done' : (st === 'sent' ? 'now' : '')],
      ['Deposit invoiced', st === 'signed' ? 'Ready for you to review' : '&mdash;', st === 'signed' ? 'now' : '']
    ];
    var tag = { none: '<span class="pt-status">Not started</span>', draft: '<span class="pt-status">Draft</span>', sent: '<span class="pt-status wait">Sent &middot; waiting on Janet</span>', signed: '<span class="pt-status paid">Signed by both</span>' }[st];
    var actions = {
      none: '<a class="sr-btn" href="admin-contract-new.html">Create from template</a>',
      draft: '<a class="sr-btn" href="admin-contract-new.html">Finish &amp; send</a>',
      sent: '<a class="sr-btn ghost" href="sign.html">See what Janet sees</a><button class="sr-btn ghost" type="button" id="ct-remind">Email Janet a reminder&hellip;</button><a class="sr-btn ghost" href="admin-contract-new.html" data-void>Edit &amp; resend</a>',
      signed: '<button class="sr-btn" type="button">Create deposit invoice in QuickBooks&hellip;</button><a class="sr-btn ghost" href="sign.html">View signed contract</a>'
    }[st];
    admin.innerHTML = '<div class="ab-card-head"><h2>Build contract</h2>' + tag + '</div><ol class="ap-steps">' +
      steps.map(function (x) { return '<li class="' + x[2] + '"><b>' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('') + '</ol>' +
      '<div class="ap-actions">' + actions + (st !== 'none' ? '<button class="ab-mini ghost" type="button" id="ct-reset">' + (st === 'signed' ? 'Void signed contract&hellip;' : 'Discard &amp; start over') + '</button>' : '') + '</div>' +
      '<p class="ci-src">' + (st === 'signed'
        ? 'Signed ' + C.longDate(s.client.date) + ' by ' + s.client.name + ' (' + s.client.email + ') &middot; ' + s.client.stamp + '. The terms are now locked. Open it to print or save a PDF copy.'
        : 'Janet reads the contract and estimate in her portal and signs by typing her name. The server records who signed and when, and locks the terms. You&#39;ll see the email to her before anything is sent.') + '</p>';
    var r = document.getElementById('ct-reset'); if (r) r.onclick = function () {
      var q = st === 'signed' ? 'Void the SIGNED contract? This removes Janet\'s signature and you would need to send a new contract.' : 'Discard this contract and start over?';
      if (!confirm(q)) return;
      var done = function () { location.reload(); }, P = window.SRPortal;
      document.addEventListener('sr-portal-saved', done); C.reset(); try { localStorage.removeItem('sr-portal-contract-sig'); } catch (e) {}
      if (!(P && P.mode === 'live')) done(); else setTimeout(done, 8000); };
    var rm = document.getElementById('ct-remind'); if (rm) rm.onclick = function () { if (window.SRNotify) SRNotify.open(SRNotify.templates.reminder()); };
    if (st === 'sent' && /[?&]notify=contract/.test(location.search)) {
      history.replaceState(null, '', location.pathname);
      document.addEventListener('sr-portal-ready', function () { if (window.SRNotify) SRNotify.open(SRNotify.templates.contract()); });
    }
    var v = admin.querySelector('[data-void]'); if (v) v.onclick = function () { s.status = 'draft'; delete s.contractor; C.save(s); };
  }
  var cl = document.getElementById('pt-contract');
  if (cl) {
    if (s.status === 'sent') cl.innerHTML = '<div class="pt-doc"><div class="pt-doc-icon">PDF</div><div><b>Rusk Kitchen &ndash; Remodeling Contract</b><span>Sent by ' + f.contractor.split(' ')[0] + ' &middot; estimate attached</span></div></div><span class="pt-status wait">Ready for you to sign</span><p><a href="sign.html" class="sr-btn">Review &amp; sign</a></p>';
    else if (s.status === 'signed') cl.innerHTML = '<div class="pt-doc"><div class="pt-doc-icon">PDF</div><div><b>Rusk Kitchen &ndash; Remodeling Contract</b><span>Signed ' + C.longDate(s.client.date) + '</span></div><a href="sign.html" class="pt-dl">View</a></div><span class="pt-status paid">Signed</span>';
    else cl.innerHTML = '<div class="pt-doc"><div class="pt-doc-icon">PDF</div><div><b>Rusk Kitchen &ndash; Build Contract</b><span>We&#39;ll let you know when it&#39;s ready to sign</span></div></div><span class="pt-status">Not ready yet</span>';
  }
})();
