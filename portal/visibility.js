// Mockup only: reads show/hide choices made on admin.html (saved in this browser).
(function () {
    var hidden = {};
    try { hidden = JSON.parse(localStorage.getItem('sr-portal-hidden') || '{}'); } catch (e) {}
    document.querySelectorAll('[data-sec],[data-item]').forEach(function (el) {
        var k = el.getAttribute('data-sec') || el.getAttribute('data-item');
        if (hidden[k]) el.style.display = 'none';
    });
})();
