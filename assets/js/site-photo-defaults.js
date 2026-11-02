// Default photos per service (used until Ashley adds her own on the Website photos page):
// real project photos from the Gallery (Contentful) plus two clean bathroom shots from Instagram.
window.SRPhotoDefaults = function (base) {
    base = base || '';
    var CF = 'https://cdn.contentful.com/spaces/ekp0fn7j0csc/environments/master/entries?content_type=galleryItem&include=2&limit=100&access_token=8maY0V_LLX50IC1x27twnmgwm7WdeC9wz9qzSHcMhLI';
    var GROUP = { 'classic copper': 'kitchenRemodel', 'fancy farmhouse': 'kitchenRemodel', 'emerald accent': 'kitchenRemodel',
        'luxury laundry': 'laundry', 'fireplace facelifts': 'featureWall', 'alcove envy': 'featureWall' };
    var BEFORE = /\/(Cross_5|McDonald_7|McDonald_8)\.jpg$/i;   // before photos: never used
    var g = {
        kitchenRemodel: [base + 'assets/images/sovereign/kitchen-remodel.jpg'],
        bathrooms: [base + 'assets/images/sovereign/1c-bathroom.jpg',
            'https://behold.pictures/eyJ1IjoiNU1MTWNWUThUMGRGNUdlVXFCUUU5emp4MW56MiIsImYiOiJKYUVRYnJZa3pob29xT3Nwd2VIbCIsInAiOiIxNzk0OTU2MTc4NTk4MzYxMSIsImgiOiIycGRkeGMiLCJjIjoiMTgxMjc4MTMzODc1ODQyNTgifQ.jpg?class=squareLarge',
            'https://behold.pictures/eyJ1IjoiNU1MTWNWUThUMGRGNUdlVXFCUUU5emp4MW56MiIsImYiOiJKYUVRYnJZa3pob29xT3Nwd2VIbCIsInAiOiIxODE4NTIyNzQ3NzM1MTgzOSIsImgiOiJkNGJndjQiLCJjIjoiMTgwOTYzMDYwMDQ3NjI2OTIifQ.jpg?class=squareLarge'],
        laundry: [], featureWall: [base + 'assets/images/sovereign/1d-feature-wall.jpg'], aLaCarte: []
    };
    return fetch(CF).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d) return g;
        var assets = {};
        ((d.includes && d.includes.Asset) || []).forEach(function (x) { if (x.fields && x.fields.file) assets[x.sys.id] = 'https:' + x.fields.file.url; });
        d.items.forEach(function (e) {
            var key = GROUP[String(e.fields.title || '').trim().toLowerCase()], seen = {}, list = [];
            Object.keys(e.fields).forEach(function (k) {
                [].concat(e.fields[k]).forEach(function (v) {
                    var u = v && v.sys && v.sys.linkType === 'Asset' && assets[v.sys.id];
                    if (u && !seen[u] && !BEFORE.test(u)) { seen[u] = 1; list.push(u + '?w=1100&fm=jpg&q=80'); }
                });
            });
            if (list.length > 2) list.push(list.shift());   // each project's cover is a close-up; show the room first
            if (key) g[key] = g[key].concat(list);
            if (list[0]) g.aLaCarte.push(list[0]);
            if (list[2]) g.aLaCarte.push(list[2]);
        });
        Object.keys(g).forEach(function (k) { g[k] = g[k].slice(0, 12); });
        return g;
    }).catch(function () { return g; });
};
