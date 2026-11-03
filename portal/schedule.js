/* Build schedule from the Sovereign SOP, counted from the job's approximate start date (Day 0 = demo). Cabinets are due and ordered 6 weeks before; everything else is due and ordered 3 weeks before.
   Each milestone is a row in the project's Key dates (sr-portal-dates) marked with sop:<key> and its day offset,
   so changing the start date moves them all. A milestone whose date Ashley changed by hand is "pinned" and stays put.
   SRSchedule.build(startISO)  -> add any missing SOP milestones and move the unpinned ones
   SRSchedule.setStart(startISO) -> move the schedule (adds just the start row if there's no schedule yet)
   SRSchedule.start()          -> the approximate start date, or ''  */
(function () {
  var KEY = 'sr-portal-dates';
  var SOP = [
    { k: 'cab-due', d: -42, what: 'Cabinet selections due', who: 'Ashley', show: true, note: 'Cabinets are chosen first so they can be ordered about 6 weeks ahead' },
    { k: 'cab-review', d: -42, what: 'Go over the cabinet order and add or remove details', who: 'Ashley', show: false },
    { k: 'cab-order', d: -42, what: 'Order cabinets', who: 'Ashley', show: false },
    { k: 'sel-due', d: -21, what: 'Selections due', who: 'Ashley', show: true, note: 'All other selections chosen and approved, about 3 weeks before we start' },
    { k: 'counter', d: -21, what: 'Countertop appointment set and plan sent to Kate', who: 'Ashley', show: false },
    { k: 'tile', d: -21, what: 'Tile selection appointment set', who: 'Ashley', show: false },
    { k: 'order', d: -21, what: 'Order appliances and all other selections', who: 'Ashley', show: false, note: 'Upload receipts if not Home Depot or Lowe\u2019s' },
    { k: 'confirm', d: -21, what: 'Confirm every item is ordered', who: 'Ashley', show: false },
    { k: 'start', d: 0, what: 'Construction start (demo, Day 0)', who: 'Greg', show: true, note: 'Approximate, we\u2019ll confirm as it gets closer' },
    { k: 'pay75', d: 20, what: 'Progress payment due (about 75% complete)', who: 'Ashley', show: false },
    { k: 'walk', d: 27, what: 'Final walk-through (Day 27)', who: 'Greg', show: true, note: 'Approximate' }
  ];
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function add(iso, n) { var t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); }
  function start() {
    var d = load(), s = d.filter(function (x) { return x.sop === 'start' && x.date; })[0];
    if (s) return s.date;
    var k = d.filter(function (x) { return x.date && /construction start|demo/i.test(x.what || ''); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    return k ? k.date : '';
  }
  function sync(d) {
    var by = {}; SOP.forEach(function (m) { by[m.k] = m; });
    return d.filter(function (x) { return !x.sop || by[x.sop] || x.pinned; }).map(function (x) {
      var m = x.sop && by[x.sop]; if (!m) return x;
      if (!x.pinned) x.offset = m.d;
      if (!x.edited) { x.what = m.what; x.note = m.note || ''; }
      return x;
    });
  }
  function move(d, iso) { d.forEach(function (x) { if (x.sop && !x.pinned && typeof x.offset === 'number') x.date = add(iso, x.offset); }); return d; }
  function build(iso) {
    var d = sync(load());
    SOP.forEach(function (m) {
      if (d.some(function (x) { return x.sop === m.k; })) return;
      d.push({ id: uid(), sop: m.k, offset: m.d, approx: true, what: m.what, date: add(iso, m.d), time: '', who: m.who, note: m.note || '', show: m.show });
    });
    save(move(d, iso)); return d;
  }
  function setStart(iso) {
    var d = sync(load());
    if (!d.some(function (x) { return x.sop === 'start'; })) { var m = SOP.filter(function (x) { return x.k === 'start'; })[0]; d.push({ id: uid(), sop: 'start', offset: 0, approx: true, what: m.what, date: iso, who: m.who, note: m.note, show: m.show }); }
    d.forEach(function (x) { if (x.sop === 'start') x.pinned = false; });
    save(move(d, iso)); return d;
  }
  function has() { return load().some(function (x) { return x.sop && x.sop !== 'start'; }); }
  window.SRSchedule = { SOP: SOP, build: build, setStart: setStart, start: start, has: has };
})();
