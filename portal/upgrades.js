// Running total of upgrades from the client's choices. Choices save to the portal server through auth.js.
(function () {
    var KEY = 'sr-portal-choices';
    var choices = {}, when = {};
    try { choices = JSON.parse(localStorage.getItem(KEY) || '{}'); when = JSON.parse(localStorage.getItem('sr-portal-choice-dates') || '{}'); } catch (e) {}
    var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function today() { var t = new Date(); return MON[t.getMonth()] + ' ' + t.getDate(); }
    function money(n) { return '$' + n.toLocaleString('en-US'); }
    function amountOf(label) {
        var tag = label.querySelector('.pt-budget.over');
        if (!tag) return 0;
        var m = tag.textContent.replace(/,/g, '').match(/\$(\d+)/);
        return m ? Number(m[1]) : 0;
    }
    var totalEl = document.getElementById('up-total');
    if (totalEl) {
        // selections page: restore choices, recalc on change
        document.querySelectorAll('.pt-option input[type=radio]').forEach(function (r, i) {
            var board = r.closest('.pt-sel-board');
            var opts = Array.prototype.slice.call(board.querySelectorAll('.pt-option'));
            var idx = opts.indexOf(r.closest('.pt-option'));
            var val = r.value && r.value !== 'on' ? r.value : idx;   // live boards use option ids; older pages used the position
            if (choices[board.id] === val || choices[board.id] === idx && typeof choices[board.id] === 'number' && val === idx) r.checked = true;
            r.addEventListener('change', function () { if (board.dataset.locked) return; choices[board.id] = val; when[board.id] = today(); save(); calc(); clears(); });
        });
        // "Clear my choice" (only on boards that aren't locked)
        document.querySelectorAll('.pt-clear').forEach(function (c) {
            c.addEventListener('click', function () {
                var board = document.getElementById(c.dataset.board); if (!board || board.dataset.locked) return;
                if (!confirm('Clear your choice for ' + board.querySelector('h2').textContent + '?')) return;
                board.querySelectorAll('.pt-option input').forEach(function (i) { i.checked = false; });
                delete choices[board.id]; delete when[board.id]; save(); calc(); clears();
            });
        });
        calc(); clears();
    }
    var dash = document.getElementById('dash-up');
    if (dash) {
        var saved = {}; try { saved = JSON.parse(localStorage.getItem('sr-portal-up') || '{}'); } catch (e) {}
        dash.textContent = '+' + money(saved.total || 0);
    }
    function clears() { document.querySelectorAll('.pt-clear').forEach(function (c) { c.hidden = choices[c.dataset.board] === undefined; }); }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(choices)); localStorage.setItem('sr-portal-choice-dates', JSON.stringify(when)); } catch (e) {} }
    function calc() {
        var total = 0, items = [], cos = [];
        document.querySelectorAll('.pt-sel-board').forEach(function (b) {
            var picked = b.querySelector('.pt-option input:checked');
            if (!picked) return;
            var amt = amountOf(picked.closest('.pt-option'));
            if (amt > 0) {
                var opt = picked.closest('.pt-option'), h4 = opt.querySelector('h4'), lt = opt.querySelector('.pt-opt-letter');
                total += amt; items.push(b.querySelector('h2').textContent + ' +' + money(amt));
                cos.push({ board: b.id, title: b.querySelector('h2').textContent, choice: h4 ? h4.textContent : '', letter: lt ? lt.textContent : '', amt: amt, date: when[b.id] || today() });
            }
        });
        totalEl.textContent = '+' + money(total);
        document.getElementById('up-list').textContent = items.length ? items.join('  ·  ') : 'No upgrades selected. Everything you’ve chosen is within your estimate.';
        document.getElementById('upbar').classList.toggle('has', total > 0);
        try { localStorage.setItem('sr-portal-up', JSON.stringify({ total: total, cos: cos })); } catch (e) {}
    }
})();
