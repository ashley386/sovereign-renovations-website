// Client stories: Google reviews (via /api/reviews) first, then our hand-picked reviews.
(function () {
    var box = document.querySelector('.testimonials .testimonialContainer');
    if (!box) return;
    var controls = box.querySelector('.controls');
    var stars = document.querySelector('.testimonials .sr-stars');
    var index = 0, timer = null;

    function items() { return box.querySelectorAll('.testimonial'); }
    function show(i) {
        var list = items(); if (!list.length) return;
        index = (i + list.length) % list.length;
        list.forEach(function (el, k) { el.classList.toggle('active', k === index); });
    }
    function start() { stop(); timer = setInterval(function () { show(index + 1); }, 8000); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    var left = box.querySelector('.left'), right = box.querySelector('.right');
    if (left) left.addEventListener('click', function () { show(index - 1); stop(); });
    if (right) right.addEventListener('click', function () { show(index + 1); stop(); });

    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function norm(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, ''); }

    fetch('/api/reviews?v=2').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
        if (!data || !data.reviews || !data.reviews.length) return;
        var existing = Array.prototype.map.call(items(), function (el) { return norm((el.querySelector('h6') || {}).textContent); });
        var first = items()[0];
        data.reviews.filter(function (r) { return r.rating >= 4; }).forEach(function (r) {
            if (existing.indexOf(norm(r.author)) !== -1) return; // already shown as a hand-picked review
            var div = document.createElement('div');
            div.className = 'testimonial google';
            var text = r.text.length > 520 ? r.text.slice(0, 500).replace(/\s+\S*$/, '') + '…' : r.text;
            div.innerHTML = '<p>&ldquo;' + esc(text) + '&rdquo;</p><h6>' + esc(r.author) +
                ' <span class="g-src">&middot; Google review' + (r.when ? ', ' + esc(r.when) : '') + '</span></h6>';
            box.insertBefore(div, first);
        });
        if (stars && data.rating) {
            stars.innerHTML = '&#9733;&#9733;&#9733;&#9733;&#9733; <span class="g-sum">' + Number(data.rating).toFixed(1) +
                ' on Google' + (data.count ? ' &middot; ' + data.count + ' reviews' : '') + '</span>';
        }
        if (data.url) {
            var a = document.createElement('a');
            a.className = 'g-link'; a.href = data.url; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = 'Read all our reviews on Google';
            box.parentNode.appendChild(a);
        }
        show(0); start();
    }).catch(function () {});
    show(0); start();
})();
