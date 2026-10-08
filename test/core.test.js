// Run with: node test/core.test.js
// Checks the solver against brute force on random weekends (with and without must-visit marks),
// and the parser, weekend finder and Maps links on known cases.
'use strict';
var C = require('../core.js');
var Solver = C.Solver;
var checks = 0;
var failures = 0;

function eq(expected, actual, what) {
  checks++;
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    failures++;
    if (failures <= 30) console.log('FAIL ' + what + '\n  expected ' + JSON.stringify(expected) + '\n  actual   ' + JSON.stringify(actual));
  }
}
function ok(cond, what) { eq(true, !!cond, what); }

// Small deterministic random generator (mulberry32).
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function t(s) { return C.Fmt.parseTime(s); }

function randomProblem(r, n) {
  var p = Solver.problem(n);
  var i, j, d;
  for (i = 0; i <= n; i++) {
    for (j = 0; j <= n; j++) {
      if (i === j) continue;
      p.travel[i][j] = r() < 0.05 ? -1 : 300 + Math.floor(r() * 3300);
    }
  }
  for (d = 0; d < 2; d++) {
    p.departure[d] = r() < 0.1 ? -1 : t('09:00') + Math.floor(r() * 4) * 1800;
    for (i = 0; i < n; i++) {
      if (r() < 0.15) continue; // closed that day
      p.open[d][i] = t('09:30') + Math.floor(r() * 6) * 1800;
      p.close[d][i] = p.open[d][i] + 3600 + Math.floor(r() * 9) * 1800;
    }
  }
  p.service = r() < 0.2 ? 2700 : 3600;
  p.minLast = r() < 0.3 ? p.service : 1200;
  return p;
}

/** Every feasible route of day d by exhaustive search: Map mask -> best value. */
function bruteDay(p, d) {
  var best = new Map();
  best.set(0, 0);
  if (p.departure[d] < 0) return best;
  function rec(order, mask) {
    if (order.length > 0) {
      var v = Solver.dayValue(p, d, order);
      if (v >= 0 && (!best.has(mask) || v > best.get(mask))) best.set(mask, v);
    }
    for (var i = 0; i < p.n; i++) {
      if ((mask & (1 << i)) !== 0) continue;
      order.push(i);
      // Prune: a prefix that is infeasible even as "all but last" cannot be extended.
      var s = Solver.schedule(p, d, order);
      var k = order.length - 1;
      var reach = p.travel[k === 0 ? 0 : order[k - 1] + 1][i + 1] >= 0 && Solver.usable(p, d, i) &&
        s.begin[k] + p.minLast <= p.close[d][i];
      var prefixOk = true;
      for (var q = 0; q < k; q++) prefixOk = prefixOk && s.begin[q] + p.service <= p.close[d][order[q]];
      if (reach && prefixOk) rec(order, mask | (1 << i));
      order.pop();
    }
  }
  rec([], 0);
  return best;
}

function bruteWeekend(p) {
  var a = bruteDay(p, 0);
  var b = bruteDay(p, 1);
  var best = -1;
  a.forEach(function (va, ma) {
    b.forEach(function (vb, mb) {
      if ((ma & mb) !== 0) return;
      var v = va + vb;
      for (var i = 0; i < p.n; i++) {
        if (p.must[0][i] && (ma & (1 << i)) !== 0) v += Solver.MUST_W;
        if (p.must[1][i] && (mb & (1 << i)) !== 0) v += Solver.MUST_W;
      }
      if (v > best) best = v;
    });
  });
  return best;
}

function checkSolution(p, s, what) {
  var total = 0;
  var seen = 0;
  for (var d = 0; d < 2; d++) {
    var order = s.days[d].order;
    var v = Solver.dayValue(p, d, order);
    ok(v >= 0, what + ' day ' + d + ' feasible');
    total += Math.max(0, v);
    order.forEach(function (i) {
      ok((seen & (1 << i)) === 0, what + ' market visited twice');
      seen |= 1 << i;
      if (p.must[d][i]) total += Solver.MUST_W;
    });
  }
  eq(s.value, total, what + ' reported value equals recomputed value');
}

function testSolver() {
  var r = rng(42);
  var forced = 0;
  for (var iter = 0; iter < 1500; iter++) {
    var n = 1 + Math.floor(r() * (iter < 1100 ? 6 : 8));
    var p = randomProblem(r, n);
    var withMust = iter % 2 === 1;
    var plain = Solver.solve(p).value;
    if (withMust) {
      for (var i = 0; i < n; i++) {
        var k = Math.floor(r() * 6);
        if (k < 2) p.must[k][i] = true;
      }
    }
    var brute = bruteWeekend(p);
    [20, 0].forEach(function (limit) {
      Solver.sosLimit = limit;
      var s = Solver.solve(p);
      eq(brute, s.value, 'optimum n=' + n + ' iter=' + iter + ' sos=' + limit + ' must=' + withMust);
      checkSolution(p, s, 'iter ' + iter + ' sos ' + limit);
    });
    Solver.sosLimit = 20;
    if (withMust && brute % Solver.MUST_W !== plain % Solver.MUST_W) forced++;
  }
  ok(forced > 10, 'must marks changed the plan in some instances (' + forced + ')');
}

function testPerformance() {
  var r = rng(7);
  [11, 16, 20, 24].forEach(function (n) {
    var p = Solver.problem(n);
    var xy = [];
    var i, j;
    for (i = 0; i <= n; i++) xy.push([r() * 12, r() * 9]);
    for (i = 0; i <= n; i++) {
      for (j = 0; j <= n; j++) {
        var km = Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]) * 1.3;
        p.travel[i][j] = Math.floor(km / 15.0 * 3600) + (i === j ? 0 : 120);
      }
    }
    for (i = 0; i < n; i++) {
      p.open[0][i] = t(r() < 0.5 ? '10:00' : '11:00');
      p.close[0][i] = t('16:00');
      p.open[1][i] = t(r() < 0.5 ? '11:00' : '12:00');
      p.close[1][i] = t(r() < 0.5 ? '15:00' : '16:00');
    }
    p.departure[0] = t('09:00');
    p.departure[1] = t('09:00');
    var t0 = Date.now();
    var s = Solver.solve(p);
    checkSolution(p, s, 'perf n=' + n);
    console.log('n=' + n + ': ' + s.days[0].order.length + ' Sat + ' + s.days[1].order.length + ' Sun, exact=' +
      s.exact + ', ' + (Date.now() - t0) + ' ms');
  });
}

function post(title, html) { return C.MarketParser.parse('1', title, 'https://x/y/', html); }
function hours(m) { return [C.hoursText(m, 0), C.hoursText(m, 1)]; }

function testParser() {
  var m = post('Tåsen skole 10. og 11. oktober',
    '<p>Tåsen skolekorps arrangerer loppemarked på Tåsen skole 10. og 11. oktober 2026.</p>' +
    '<p><strong>Åpningstider:9</strong><br />Lørdag 10. oktober: 10:00 &#8211; 16:00<br />Søndag 11. oktober: 11:00 – 16:00</p>' +
    '<p>Auksjon søndag klokka 13:00.</p><p><strong>Adresse:</strong><br />Tåsen skole, Nordbergveien 15, 0875 Oslo</p>' +
    '<p>Nettside: <a href="https://x">x</a></p><p>0875 Oslo, Norge</p>');
  eq('Tåsen skole', m.name, 'name without the date');
  eq(['10:00–16:00', '11:00–16:00'], hours(m), 'hours with stray 9, entity dash, auction ignored');
  eq('Tåsen skole, Nordbergveien 15, 0875 Oslo', m.address, 'address on the line after the label');
  eq('Tåsen skolekorps', m.organizer, 'organiser');
  eq(['Auksjon søndag klokka 13:00.'], m.notes, 'auction note');

  m = post('Ammerud skole', '<p>Korpset arrangerer loppemarked.</p><p>Åpningstider:<br>Lørdag 10. oktober : 11:00 – 16:00<br>' +
    'Søndag 11. oktober: 12:00 - 16:00</p><p>Ammmerud skole, Ammerudveien 49, 0958 Oslo</p><p>0958 Oslo, Norge</p>');
  eq(['11:00–16:00', '12:00–16:00'], hours(m), 'space before the colon');
  eq('Ammmerud skole, Ammerudveien 49, 0958 Oslo', m.address, 'address without a label');

  var variants = [
    ['Lør og søn kl. 11-15', ['11:00–15:00', '11:00–15:00']],
    ['Åpningstider: 10.00-16.00 begge dager', ['10:00–16:00', '10:00–16:00']],
    ['Lørdag og søndag 10–16', ['10:00–16:00', '10:00–16:00']],
    ['Åpningstider: 10–16', ['10:00–16:00', '10:00–16:00']],
    ['Lørdag 10. og søndag 11. oktober: 10–15', ['10:00–15:00', '10:00–15:00']],
    ['Åpent 10–16 lørdag og søndag', ['10:00–16:00', '10:00–16:00']],
    ['Lørdag: 10-16<br>Søndag: stengt', ['10:00–16:00', '']],
    ['Lørdag kl 10 til 15, søndag kl 12 til 15', ['10:00–15:00', '12:00–15:00']],
    ['Levering av lopper fredag 17-20.<br>Lørdag 10:00-16:00', ['10:00–16:00', '']],
    ['Ingen tider her, bare 2026 og tlf 22 33 44 55', ['', '']]
  ];
  variants.forEach(function (v) { eq(v[1], hours(post('X skole', '<p>' + v[0] + '</p>')), 'hours: ' + v[0]); });
}

function testWeekends() {
  var W = C.WeekendFinder;
  eq(20261010, W.saturdayOf('Helgen 10. og 11. oktober 2026'), 'two days, one month');
  eq(20261031, W.saturdayOf('Helgen 31. oktober og 1. november 2026'), 'two months');
  eq(20261226, W.saturdayOf('Helgen 26.-27. desember 2026'), 'dash');
  eq(20270102, W.saturdayOf('Helgen 2. og 3. januar 2027'), 'january');
  eq(0, W.saturdayOf('Ventekategori høst 2025 2'), 'not a weekend');
  var ws = W.group([{ id: 1, name: 'Helgen 17. og 18. oktober 2026', count: 7 }, { id: 2, name: 'Helgen 10. og 11. oktober 2026', count: 11 },
    { id: 3, name: 'Helgen 3. og 4. oktober 2026', count: 4 }, { id: 4, name: 'Helgen 24. og 25. oktober 2026', count: 0 }], 20261010);
  eq([20261010, 20261017], ws.map(function (w) { return w.saturday; }), 'grouped, past and empty left out');
  eq(20261017, W.pick(ws, 20261011).saturday, 'next weekend with markets');
  var D = C.Dates;
  eq(20261010, D.upcomingSaturday(20261008, 0), 'Thursday');
  eq(20261010, D.upcomingSaturday(20261010, 0), 'Saturday');
  eq(20261010, D.upcomingSaturday(20261011, 16 * 3600), 'Sunday afternoon');
  eq(20261017, D.upcomingSaturday(20261011, 17 * 3600), 'Sunday evening');
  eq(20261101, D.addDays(20261031, 1), 'month rollover');
}

function testLinks() {
  var plan = { startLat: 59.9109, startLng: 10.7502, startAddress: '' };
  var d = { stops: [] };
  eq('', C.MapsLinks.dayRoute(plan, d), 'no stops, no link');
  d.stops.push({ name: 'A', address: '', lat: 59.95333, lng: 10.750649 });
  d.stops.push({ name: 'B', address: '', lat: 59.935226, lng: 10.722656 });
  d.stops.push({ name: 'C', address: 'Økern Torgvei 4, 0580 Oslo', lat: NaN, lng: NaN });
  eq(C.MapsLinks.DIR + '&origin=59.910900%2C10.750200&destination=%C3%98kern%20Torgvei%204%2C%200580%20Oslo' +
    '&waypoints=59.953330%2C10.750649%7C59.935226%2C10.722656', C.MapsLinks.dayRoute(plan, d), 'stops in order');
  plan.startLat = NaN;
  ok(C.MapsLinks.dayRoute(plan, d).indexOf('origin=') < 0, 'no origin without a start point');
}

function testPlan() {
  function mk(id, o0, c0, o1, c1) {
    var m = C.newMarket();
    m.id = id; m.name = id;
    m.open = [t(o0), t(o1)]; m.close = [t(c0), t(c1)];
    return m;
  }
  // a and b are neighbours; "far" is 90 minutes from everything and closes early, so it costs both of them.
  var cands = [mk('a', '10:00', '12:30', '-1', '-1'), mk('b', '10:00', '12:30', '11:00', '16:00'), mk('far', '10:00', '11:30', '-1', '-1')];
  var n = cands.length;
  var mx = [];
  for (var i = 0; i <= n; i++) {
    mx.push([]);
    for (var j = 0; j <= n; j++) mx[i].push(i === j ? [0, 0] : [(i === 3 || j === 3) ? 5400 : 600, 1000]);
  }
  var s = C.PlanBuilder.defaults();
  s.planDay = [true, false];
  var st = C.PlanBuilder.dayStatus(20261010, 20261008, 0, s);
  var plan = C.PlanBuilder.build(20261010, cands, mx, null, s, st.dep, st.skip, null);
  eq(2, plan.days[0].stops.length, 'two neighbours fit on Saturday');
  ok(C.PlanBuilder.find(plan, 'far') === null, 'far market left out without a must');
  plan = C.PlanBuilder.build(20261010, cands, mx, null, s, st.dep, st.skip, [['far'], []]);
  eq([0, 1], C.PlanBuilder.find(plan, 'far'), 'must on Saturday puts it on Saturday, at the cost of the others');
  s.planDay = [true, true];
  st = C.PlanBuilder.dayStatus(20261010, 20261008, 0, s);
  plan = C.PlanBuilder.build(20261010, cands, mx, null, s, st.dep, st.skip, [['b'], []]);
  eq(0, C.PlanBuilder.find(plan, 'b')[0], 'must on Saturday keeps it on Saturday');
  plan = C.PlanBuilder.build(20261010, cands, mx, null, s, st.dep, st.skip, [[], ['b']]);
  eq(1, C.PlanBuilder.find(plan, 'b')[0], 'must on Sunday moves it to Sunday');
  st = C.PlanBuilder.dayStatus(20261010, 20261011, 13 * 3600 + 5, s);
  eq([-1, 13 * 3600 + 60], st.dep, 'on Sunday: Saturday is past, Sunday starts now (rounded up)');
  eq(['past', ''], st.skip, 'skip reasons');
}

testParser();
testWeekends();
testLinks();
testPlan();
testSolver();
testPerformance();
console.log('core tests: ' + checks + ' checks, ' + failures + ' failures');
process.exit(failures > 0 ? 1 : 0);
