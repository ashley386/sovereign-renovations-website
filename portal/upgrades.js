// Mockup: running total of upgrades from the client's choices (saved in this browser).
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
            if (choices[board.id] === idx) r.checked = true;
            r.addEventListener('change', function () { choices[board.id] = idx; when[board.id] = today(); save(); calc(); });
        });
        calc();
    }
    var dash = document.getElementById('dash-up');
    if (dash) {
        var saved = {}; try { saved = JSON.parse(localStorage.getItem('sr-portal-up') || '{}'); } catch (e) {}
        dash.textContent = '+' + money(saved.total || 0);
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(choices)); localStorage.setItem('sr-portal-choice-dates', JSON.stringify(when)); } catch (e) {} }
    function calc() {
        var total = 0, items = [], cos = [];
        document.querySelectorAll('.pt-sel-board').forEach(function (b) {
            var picked = b.querySelector('.pt-option input:checked');
            if (!picked) return;
            var amt = amountOf(picked.closest('.pt-option'));
            if (amt > 0) {
                var opt = picked.closest('.pt-option'), h4 = opt.querySelector('h4'), let = opt.querySelector('.pt-opt-letter');
                total += amt; items.push(b.querySelector('h2').textContent + ' +' + money(amt));
                cos.push({ board: b.id, title: b.querySelector('h2').textContent, choice: h4 ? h4.textContent : '', letter: let ? let.textContent : '', amt: amt, date: when[b.id] || today() });
            }
        });
        totalEl.textContent = '+' + money(total);
        document.getElementById('up-list').textContent = items.length ? items.join('  ·  ') : 'No upgrades selected. Everything you’ve chosen is within your estimate.';
        document.getElementById('upbar').classList.toggle('has', total > 0);
        try { localStorage.setItem('sr-portal-up', JSON.stringify({ total: total, cos: cos })); } catch (e) {}
    }
})();
