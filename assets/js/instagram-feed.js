// "See what we've been up to lately" — Instagram posts via a Behold.so JSON feed.
// To connect: put the Behold feed ID in data-behold-feed on #instagram-feed (index.html).
(function () {
    var section = document.getElementById('instagram-feed');
    if (!section) return;
    var track = section.querySelector('.ig-track');
    var feedId = (section.getAttribute('data-behold-feed') || '').trim();
    var isPreview = !/(^|\.)sovereign-renovations\.com$/.test(location.hostname);

    function card(href, img, caption, badge) {
        var a = document.createElement('a');
        a.className = 'ig-card'; a.href = href; a.target = '_blank'; a.rel = 'noopener';
        var i = document.createElement('img'); i.src = img; i.loading = 'lazy';
        i.alt = caption ? caption.slice(0, 120) : 'Sovereign Renovations on Instagram';
        a.appendChild(i);
        if (badge) { var b = document.createElement('span'); b.className = 'ig-badge'; b.textContent = badge; a.appendChild(b); }
        if (caption) { var c = document.createElement('div'); c.className = 'ig-caption'; c.textContent = caption; a.appendChild(c); }
        track.appendChild(a);
    }

    function placeholder() {
        // Preview-only stand-in until the Behold feed is connected; hidden on the live site.
        if (!isPreview) { section.style.display = 'none'; return; }
        var note = document.createElement('p'); note.className = 'ig-note';
        note.textContent = 'Preview: sample photos shown. Your latest Instagram posts will appear here once the feed is connected.';
        section.querySelector('.ig-header').appendChild(note);
        ['kitchen-remodel.jpg','counter-install.jpg','1d-feature-wall.jpg','1c-bathroom.jpg','cabinets-install.jpg','1e-a-la-carte.jpg','1f-transforming-kitchens.jpg']
            .forEach(function (f) { card('https://www.instagram.com/sovereignrenovations/', 'assets/images/sovereign/' + f, '', ''); });
    }

    function render(data) {
        var posts = Array.isArray(data) ? data : (data && data.posts) || [];
        posts = posts.filter(function (p) { return p && (p.mediaUrl || p.thumbnailUrl || p.sizes); });
        if (!posts.length) return placeholder();
        posts.slice(0, 12).forEach(function (p) {
            var s = p.sizes || {};
            var img = (s.medium && s.medium.mediaUrl) || (s.large && s.large.mediaUrl) ||
                      (p.mediaType === 'VIDEO' ? p.thumbnailUrl : p.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
            var badge = p.mediaType === 'VIDEO' ? 'VIDEO' : (p.mediaType === 'CAROUSEL_ALBUM' ? 'GALLERY' : '');
            card(p.permalink || 'https://www.instagram.com/sovereignrenovations/', img, (p.prunedCaption || p.caption || '').trim(), badge);
        });
    }

    if (feedId) {
        fetch('https://feeds.behold.so/' + encodeURIComponent(feedId))
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(render).catch(placeholder);
    } else { placeholder(); }

    function step(dir) {
        var c = track.querySelector('.ig-card');
        var w = c ? c.getBoundingClientRect().width + 18 : 300;
        track.scrollBy({ left: dir * w * (window.innerWidth > 991 ? 2 : 1), behavior: 'smooth' });
    }
    section.querySelector('.ig-prev').addEventListener('click', function () { step(-1); });
    section.querySelector('.ig-next').addEventListener('click', function () { step(1); });
})();
