// "What we do": each service shows a carousel of photos of that kind of remodel,
// using real project photos (Gallery), not the designed social posts.
// Falls back to the service's own photo (data-image).
(function () {
    // Real project photos from the Gallery (Contentful), grouped by service. Bathrooms use
    // the cleanest photos from Instagram until bathroom project photos are added to the Gallery.
    var CF = 'https://cdn.contentful.com/spaces/ekp0fn7j0csc/environments/master/entries?content_type=galleryItem&include=2&limit=100&access_token=8maY0V_LLX50IC1x27twnmgwm7WdeC9wz9qzSHcMhLI';
    var frame = document.querySelector('.sr-services .photo-frame');
    var buttons = document.querySelectorAll('#accordionExample .accordion-button[data-image]');
    if (!frame || !buttons.length) return;
    var GROUP = {                       // gallery project title -> service
        'classic copper': 'kitchenRemodel', 'fancy farmhouse': 'kitchenRemodel', 'emerald accent': 'kitchenRemodel',
        'luxury laundry': 'laundry', 'fireplace facelifts': 'featureWall', 'alcove envy': 'featureWall'
    };
    var BATH = [
        'https://behold.pictures/eyJ1IjoiNU1MTWNWUThUMGRGNUdlVXFCUUU5emp4MW56MiIsImYiOiJKYUVRYnJZa3pob29xT3Nwd2VIbCIsInAiOiIxNzk0OTU2MTc4NTk4MzYxMSIsImgiOiIycGRkeGMiLCJjIjoiMTgxMjc4MTMzODc1ODQyNTgifQ.jpg?class=squareLarge',
        'https://behold.pictures/eyJ1IjoiNU1MTWNWUThUMGRGNUdlVXFCUUU5emp4MW56MiIsImYiOiJKYUVRYnJZa3pob29xT3Nwd2VIbCIsInAiOiIxODE4NTIyNzQ3NzM1MTgzOSIsImgiOiJkNGJndjQiLCJjIjoiMTgwOTYzMDYwMDQ3NjI2OTIifQ.jpg?class=squareLarge'
    ];
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
        if (fallback && id !== 'aLaCarte') out.unshift({ src: fallback, alt: 'Sovereign Renovations project', link: 'gallery/' });
        return out.slice(0, 12);
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

    // first paint: the service's own photo, then the project photos once loaded
    A.src = img0 ? img0.src : buttons[0].dataset.image; A.classList.add('on');
    BATH.forEach(function (u) { groups.bathrooms.push(u); });
    fetch(CF).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return start();
        var assets = {};
        ((d.includes && d.includes.Asset) || []).forEach(function (x) { if (x.fields && x.fields.file) assets[x.sys.id] = 'https:' + x.fields.file.url; });
        d.items.forEach(function (e) {
            var title = String(e.fields.title || '').trim().toLowerCase(), g = GROUP[title], seen = {}, list = [];
            Object.keys(e.fields).forEach(function (k) {
                [].concat(e.fields[k]).forEach(function (v) {
                    var u = v && v.sys && v.sys.linkType === 'Asset' && assets[v.sys.id];
                    if (u && !seen[u]) { seen[u] = 1; list.push(u + '?w=1100&fm=jpg&q=80'); }
                });
            });
            if (list.length > 2) list.push(list.shift());   // each project's cover is a close-up; show the room first
            if (g) groups[g] = groups[g].concat(list);
            if (list[0]) groups.aLaCarte.push(list[0]);
            if (list[2]) groups.aLaCarte.push(list[2]);
        });
        start();
    }).catch(start);
})();
