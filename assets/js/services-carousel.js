// "What we do": each service shows a carousel of photos of that kind of remodel,
// pulled from our Instagram posts (Behold feed) by the words in each caption.
// Falls back to the service's own photo (data-image) if a category has no posts.
(function () {
    var FEED = 'https://feeds.behold.so/JaEQbrYkzhooqOspweHl';
    var frame = document.querySelector('.sr-services .photo-frame');
    var buttons = document.querySelectorAll('#accordionExample .accordion-button[data-image]');
    if (!frame || !buttons.length) return;

    var CATS = {
        kitchenRemodel: function (t) { return first(t) === 'kitchen'; },
        bathrooms: function (t) { return first(t) === 'bath'; },
        laundry: function (t) { return /laundry|mudroom|mud room|drop zone/i.test(t.slice(0, 220)); },
        featureWall: function (t) { return /fireplace|mantel|feature wall|shiplap|batten|accent wall/i.test(t.slice(0, 300)); },
        aLaCarte: function () { return true; }
    };
    // Which room a post is mostly about: whichever of kitchen / bath is mentioned first
    function first(t) {
        var k = t.search(/kitchen/i), b = t.search(/bath|shower|vanity|powder room/i);
        if (k < 0 && b < 0) return '';
        if (k < 0) return 'bath'; if (b < 0) return 'kitchen';
        return k < b ? 'kitchen' : 'bath';
    }

    // Build the carousel inside the photo frame
    var img0 = frame.querySelector('img');
    var car = document.createElement('div'); car.className = 'svc-car';
    car.innerHTML = '<div class="svc-stage"><img class="svc-a" alt=""><img class="svc-b" alt=""></div>' +
        '<button type="button" class="svc-nav prev" aria-label="Previous photo">&#8249;</button>' +
        '<button type="button" class="svc-nav next" aria-label="Next photo">&#8250;</button>' +
        '<div class="svc-foot"><div class="svc-dots"></div><a class="svc-ig" target="_blank" rel="noopener" href="https://www.instagram.com/sovereignrenovations/">See it on Instagram &rarr;</a></div>';
    frame.innerHTML = ''; frame.appendChild(car);
    var A = car.querySelector('.svc-a'), B = car.querySelector('.svc-b'), dots = car.querySelector('.svc-dots'), ig = car.querySelector('.svc-ig');
    var slides = [], i = 0, timer = null, front = A, posts = [], current = null;

    function show(n) {
        if (!slides.length) return;
        i = (n + slides.length) % slides.length;
        var s = slides[i], back = front === A ? B : A;
        back.onload = function () { back.classList.add('on'); front.classList.remove('on'); front = back; };
        back.src = s.src; back.alt = s.alt;
        ig.href = s.link; ig.hidden = !s.link;
        Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
    }
    function play() { stop(); if (slides.length > 1) timer = setInterval(function () { show(i + 1); }, 4500); }
    function stop() { clearInterval(timer); }
    car.querySelector('.prev').onclick = function () { show(i - 1); play(); };
    car.querySelector('.next').onclick = function () { show(i + 1); play(); };
    car.addEventListener('mouseenter', stop); car.addEventListener('mouseleave', play);
    var x0 = null;
    car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); play(); } x0 = null; });

    function imagesFor(id, fallback) {
        var test = CATS[id] || function () { return false; }, out = [];
        posts.forEach(function (p) {
            var cap = p.caption || p.prunedCaption || '';
            if (!cap || /how a sovereign renovations project works/i.test(cap) || !test(cap)) return;
            var kids = (p.children || []).filter(function (c) { return c.mediaType === 'IMAGE'; });
            if (kids.length >= 3) kids = kids.slice(1);              // first slide is usually a title graphic
            if (kids.length >= 4) kids = kids.slice(0, -1);          // last slide is usually the 'contact us' card
            var list = kids.length ? kids : [p];
            var take = id === 'aLaCarte' ? 1 : 4;
            list.slice(0, take).forEach(function (c) {
                var s = c.sizes || {}, src = (s.large && s.large.mediaUrl) || (s.medium && s.medium.mediaUrl) || (c.mediaType === 'VIDEO' || p.mediaType === 'VIDEO' ? p.thumbnailUrl : c.mediaUrl) || p.thumbnailUrl;
                if (src) out.push({ src: src, alt: cap.slice(0, 100), link: p.permalink || '' });
            });
        });
        out = out.slice(0, 12);
        if (out.length < 2 && fallback) out.unshift({ src: fallback, alt: 'Sovereign Renovations project', link: '' });
        return out;
    }
    function load(btn) {
        if (current === btn.id) return; current = btn.id;
        slides = imagesFor(btn.id, btn.dataset.image);
        dots.innerHTML = slides.length > 1 ? slides.map(function (_, k) { return '<button type="button" aria-label="Photo ' + (k + 1) + '"></button>'; }).join('') : '';
        Array.prototype.forEach.call(dots.children, function (d, k) { d.onclick = function () { show(k); play(); }; });
        car.classList.toggle('single', slides.length < 2);
        show(0); play();
        // phones: the carousel sits inside the open service
        if (window.matchMedia('(max-width: 900px)').matches) {
            var body = document.querySelector(btn.dataset.bsTarget + ' .accordion-body');
            if (body && car.parentNode !== body) body.insertBefore(car, body.firstChild);
        } else if (car.parentNode !== frame) frame.appendChild(car);
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { setTimeout(function () { load(b); }, 50); }); });
    function start() { var open = document.querySelector('#accordionExample .accordion-button:not(.collapsed)') || buttons[0]; current = null; load(open); }

    // first paint: the service's own photo, then Instagram photos once loaded
    A.src = img0 ? img0.src : buttons[0].dataset.image; A.classList.add('on');
    fetch(FEED).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        posts = (Array.isArray(d) ? d : (d && d.posts) || []);
        start();
    }).catch(start);
})();
