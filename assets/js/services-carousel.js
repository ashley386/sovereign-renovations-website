// "What we do": each service shows a carousel of photos of that kind of remodel,
// using real project photos (Gallery), not the designed social posts.
// Falls back to the service's own photo (data-image).
(function () {
    // Photos come from the admin "Website photos" page; any service with none there uses the defaults.
    var frame = document.querySelector('.sr-services .photo-frame');
    var buttons = document.querySelectorAll('#accordionExample .accordion-button[data-image]');
    if (!frame || !buttons.length) return;
    var groups = { kitchenRemodel: [], bathrooms: [], laundry: [], featureWall: [], aLaCarte: [] };

    // Build the carousel inside the photo frame
    var img0 = frame.querySelector('img');
    var car = document.createElement('div'); car.className = 'svc-car';
    car.innerHTML = '<div class="svc-stage"><img class="svc-a" alt=""><img class="svc-b" alt=""></div>' +
        '<button type="button" class="svc-nav prev" aria-label="Previous photo">&#8249;</button>' +
        '<button type="button" class="svc-nav next" aria-label="Next photo">&#8250;</button>' +
        '<div class="svc-foot"><div class="svc-dots"></div><a class="svc-ig" href="gallery/">See more in our gallery &rarr;</a></div>';
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
        var out = (groups[id] || []).map(function (src) { return { src: src, alt: 'Sovereign Renovations project', link: 'gallery/' }; });
        if (!out.length && fallback) out.push({ src: fallback, alt: 'Sovereign Renovations project', link: '' });
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

    // first paint: the service's own photo, then the real set once loaded
    A.src = img0 ? img0.src : buttons[0].dataset.image; A.classList.add('on');
    var mine = fetch('/api/site-photos').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    var defs = window.SRPhotoDefaults ? window.SRPhotoDefaults('') : Promise.resolve({});
    Promise.all([mine, defs]).then(function (res) {
        var m = (res[0] && res[0].services) || {}, d = res[1] || {};
        Object.keys(groups).forEach(function (k) {
            var own = (m[k] || []).map(function (x) { return x.id ? '/api/site-photos/img/' + x.id : x.url; }).filter(Boolean);
            groups[k] = own.length ? own : (d[k] || []);
        });
        start();
    });
})();
