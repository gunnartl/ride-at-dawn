// Ride at Dawn: the screens. render() rebuilds the page from the state object S after every change.
(function () {
  'use strict';
  var C = Core;
  var Store = Data.Store;
  var SAT = C.SAT;
  var SUN = C.SUN;
  var Fmt = C.Fmt;
  var STALE_MS = 3 * 3600 * 1000;
  var TILT = [-7, 5, -3, 8, -6, 4];

  var S = {
    target: 0,          // the coming weekend's Saturday (yyyymmdd)
    saturday: 0,        // the weekend on screen
    data: null,         // data/weekends.json: markets and the bike times between them
    weekends: [],       // [{saturday, count}]
    markets: [],        // with the user's corrections applied
    plan: null,
    tab: 'sat',
    loading: false,
    loadError: '',
    busy: false,
    status: '',
    error: ''
  };

  var $ = function (id) { return document.getElementById(id); };
  var content = $('content');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICON = {
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20.5 3-.16.03L15 5.1 9 3 3.36 4.9a.5.5 0 0 0-.36.48V20.5a.5.5 0 0 0 .5.5l.16-.03L9 18.9l6 2.1 5.64-1.9a.5.5 0 0 0 .36-.48V3.5a.5.5 0 0 0-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>',
    nav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    bike: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10 2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>'
  };

  // ------------------------------------------------------------------ text helpers

  function dateLabel(date) { return T('date', C.Dates.day(date), T.months[C.Dates.month(date) - 1]); }
  function weekendRange(sat) {
    var sun = C.Dates.addDays(sat, 1);
    if (C.Dates.month(sat) === C.Dates.month(sun)) {
      return T('range_same', C.Dates.day(sat), C.Dates.day(sun), T.months[C.Dates.month(sat) - 1]);
    }
    return T('range_two', dateLabel(sat), dateLabel(sun));
  }
  function dayName(d) { return T(d === SAT ? 'saturday' : 'sunday'); }
  function dayIn(d) { return T(d === SAT ? 'saturday_in' : 'sunday_in'); }
  function nMarkets(n) { return n === 1 ? T('n_markets_1') : T('n_markets', n); }
  function when(ms) {
    var d = new Date(ms);
    var time = Fmt.time(d.getHours() * 3600 + d.getMinutes() * 60);
    var date = C.Dates.today(d);
    return date === C.Dates.today() ? time : dateLabel(date) + ' ' + time;
  }
  function isDark() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }

  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ------------------------------------------------------------------ state changes

  function marks() { return Store.marks(S.saturday); }
  function isDirty() { return !!S.plan && Store.flag('dirty_' + S.saturday); }
  function setDirty(v) { Store.setFlag('dirty_' + S.saturday, v); }

  function applyMarkets() {
    S.markets = Data.Site.markets(S.data, S.saturday);
  }

  function selectWeekend(saturday) {
    S.saturday = saturday;
    S.plan = Data.fixPlan(Store.plan(saturday));
    S.error = '';
    applyMarkets();
    S.tab = C.Dates.today() === C.Dates.addDays(saturday, 1) ? 'sun' : 'sat';
    render();
    window.scrollTo(0, 0);
  }

  function weekendOf(saturday) {
    for (var i = 0; i < S.weekends.length; i++) if (S.weekends[i].saturday === saturday) return S.weekends[i];
    return null;
  }

  /** Shows the weekend already on screen if it still exists, else the coming one, else the next with markets. */
  function showData(data) {
    S.data = data;
    S.weekends = Data.Site.weekends(data, S.target);
    var keep = weekendOf(S.saturday);
    var w = keep || C.WeekendFinder.pick(S.weekends, S.target);
    if (!w) {
      S.saturday = 0;
      S.markets = [];
      render();
    } else if (!keep) {
      selectWeekend(w.saturday);
    } else {
      applyMarkets();
      render();
    }
  }

  /** Opens with the data this browser saw last, then fetches the published file. */
  function loadData() {
    if (!S.data) {
      var cached = Store.data();
      if (cached) showData(cached);
    }
    S.loading = true;
    S.loadError = '';
    render();
    return Data.Site.fetchData().then(function (data) {
      S.loading = false;
      showData(data);
    }, function (e) {
      S.loading = false;
      S.loadError = e && e.message || 'error';
      render();
    });
  }

  function setMark(kind, id, on, day) {
    var m = marks();
    if (kind === 'must') {
      m.must[day] = Data.toggle(m.must[day], id, on);
      if (on) m.must[1 - day] = Data.toggle(m.must[1 - day], id, false); // a must belongs to one day
    } else {
      m[kind] = Data.toggle(m[kind], id, on);
    }
    Store.saveMarks(S.saturday, m);
    // Ticking off a stop on today's route is just following the plan; anything else changes it.
    var pos = S.plan ? C.PlanBuilder.find(S.plan, id) : null;
    var followingToday = kind === 'visited' && pos && C.Dates.addDays(S.saturday, pos[0]) === C.Dates.today();
    if (!followingToday) setDirty(true);
    render();
  }

  // ------------------------------------------------------------------ planning

  function locate() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Data.Failure(T('err_location', 'geolocation')));
        return;
      }
      navigator.geolocation.getCurrentPosition(function (p) {
        resolve({ label: T('your_location'), lat: p.coords.latitude, lng: p.coords.longitude, address: '' });
      }, function (e) {
        reject(new Data.Failure(T('err_location', e && e.message || 'error')));
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 120000 });
    });
  }

  function startPlanning() {
    if (S.busy || !S.markets.length) return;
    var saturday = S.saturday;
    var address = Store.startAddress();
    S.busy = true;
    S.error = '';
    S.status = address ? T('status_addresses') : T('status_locating');
    render();
    var start = address ? Promise.resolve({ label: address, lat: NaN, lng: NaN, address: address }) : locate();
    start.then(function (st) {
      var auto = Data.Planner.autoMarkSaturday(saturday);
      return Data.Planner.plan(S.data, saturday, S.markets, st, function (text) {
        S.status = text;
        $('status-text').textContent = text;
      }).then(function (plan) {
        if (auto > 0) plan.warnings.unshift(T('auto_visited', auto));
        Store.savePlan(saturday, plan);
        Store.setFlag('dirty_' + saturday, false);
        if (S.saturday !== saturday) return;
        S.plan = plan;
        if (S.tab === 'all' || !plan.days[S.tab === 'sun' ? SUN : SAT].stops.length) {
          S.tab = plan.days[SAT].stops.length || !plan.days[SUN].stops.length ? 'sat' : 'sun';
        }
        window.scrollTo(0, 0);
      });
    }).catch(function (e) {
      S.error = e && e.message ? e.message : String(e);
    }).then(function () {
      S.busy = false;
      render();
    });
  }

  // ------------------------------------------------------------------ rendering

  function banner(text, button) {
    return '<div class="banner">' + ICON.warn + '<div class="grow">' + esc(text) + (button || '') + '</div></div>';
  }

  function empty(title, body, action, label) {
    return '<div class="pad empty"><h2>' + esc(title) + '</h2><p>' + esc(body) + '</p>' +
      (action ? '<button type="button" class="btn-outline" data-act="' + action + '">' + esc(label) + '</button>' : '') + '</div>';
  }

  function topBanners() {
    var h = '';
    if (S.error) h += banner(S.error);
    if (S.loadError && S.markets.length) h += banner(T('load_failed', S.loadError));
    if (S.saturday && S.saturday !== S.target && weekendOf(S.target) === null && S.saturday === (C.WeekendFinder.pick(S.weekends, S.target) || {}).saturday) {
      h += banner(T('other_weekend'));
    }
    if (isDirty() && !S.busy) {
      h += banner(T('stale'), '<div><button type="button" class="btn-small" data-act="plan">' + esc(T('plan_again')) + '</button></div>');
    }
    if (S.plan) S.plan.warnings.forEach(function (w) { h += banner(w); });
    return h;
  }

  function footer(plan) {
    var updated = plan.dataAt ? dateLabel(C.Dates.today(new Date(plan.dataAt))) : '';
    return '<p class="foot">' + esc(T(plan.exact ? 'footer_exact' : 'footer_inexact', updated, when(plan.createdAt))) + '</p>';
  }

  var MAP_W = 512;
  var MAP_H = 288;
  var TILE = 256;

  /** Web Mercator pixel position of a point at a zoom level (the scheme OpenStreetMap tiles use). */
  function mercator(lat, lng, zoom) {
    var size = TILE * Math.pow(2, zoom);
    var sin = Math.sin(lat * Math.PI / 180);
    return [(lng + 180) / 360 * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
  }

  /**
   * The day's route on an OpenStreetMap background: start and stops joined in visiting order.
   * The map tiles are free and need no key. If they cannot be loaded, the stops still show on a
   * plain background. Tapping the map opens the route in Google Maps.
   */
  function routeMap(plan, day, d) {
    var pts = [];
    if (C.hasCoords({ lat: plan.startLat, lng: plan.startLng })) pts.push({ lat: plan.startLat, lng: plan.startLng, label: '' });
    day.stops.forEach(function (s, i) { if (C.hasCoords(s)) pts.push({ lat: s.lat, lng: s.lng, label: String(i + 1) }); });
    if (pts.length < 2) return '';
    var PAD = 30;
    // The closest zoom at which every point fits inside the picture.
    var zoom = 16;
    var xy, minX, maxX, minY, maxY;
    for (; zoom >= 3; zoom--) {
      xy = pts.map(function (p) { return mercator(p.lat, p.lng, zoom); });
      minX = Math.min.apply(null, xy.map(function (q) { return q[0]; }));
      maxX = Math.max.apply(null, xy.map(function (q) { return q[0]; }));
      minY = Math.min.apply(null, xy.map(function (q) { return q[1]; }));
      maxY = Math.max.apply(null, xy.map(function (q) { return q[1]; }));
      if (maxX - minX <= MAP_W - 2 * PAD && maxY - minY <= MAP_H - 2 * PAD) break;
    }
    var x0 = (minX + maxX) / 2 - MAP_W / 2;
    var y0 = (minY + maxY) / 2 - MAP_H / 2;
    var svg = '<svg viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" role="img" aria-label="' + esc(T('map_alt')) + '">';
    var count = Math.pow(2, zoom);
    for (var tx = Math.floor(x0 / TILE); tx * TILE < x0 + MAP_W; tx++) {
      for (var ty = Math.floor(y0 / TILE); ty * TILE < y0 + MAP_H; ty++) {
        if (ty < 0 || ty >= count) continue;
        svg += '<image class="tile" href="https://tile.openstreetmap.org/' + zoom + '/' + ((tx % count + count) % count) + '/' + ty +
          '.png" x="' + (tx * TILE - x0).toFixed(1) + '" y="' + (ty * TILE - y0).toFixed(1) + '" width="' + TILE + '" height="' + TILE + '"/>';
      }
    }
    var at = xy.map(function (q) { return [(q[0] - x0).toFixed(1), (q[1] - y0).toFixed(1)]; });
    svg += '<polyline class="path-edge" points="' + at.map(function (q) { return q.join(','); }).join(' ') + '"/>' +
      '<polyline class="path" points="' + at.map(function (q) { return q.join(','); }).join(' ') + '"/>';
    // Drawn last to first, so stop 1 ends up on top where stops overlap.
    for (var i = pts.length - 1; i >= 0; i--) {
      if (!pts[i].label) {
        svg += '<circle class="start" cx="' + at[i][0] + '" cy="' + at[i][1] + '" r="8"/>';
      } else {
        svg += '<circle class="dot' + (d === SUN ? ' sun' : '') + '" cx="' + at[i][0] + '" cy="' + at[i][1] + '" r="14"/>' +
          '<text x="' + at[i][0] + '" y="' + (Number(at[i][1]) + 6).toFixed(1) + '">' + pts[i].label + '</text>';
      }
    }
    return svg + '</svg>';
  }

  function renderDay(d) {
    if (!S.markets.length) return renderNoMarkets();
    var plan = S.plan;
    var settings = Store.settings();
    var h = topBanners();
    if (!plan) {
      var m = marks();
      var open = S.markets.filter(function (x) {
        return C.isOpen(x, d) && m.visited.indexOf(x.id) < 0 && m.skip.indexOf(x.id) < 0;
      }).length;
      return h + empty(T('empty_title'), T('empty_body', nMarkets(open), dayIn(d), Math.round(settings.service / 60)),
        S.busy ? '' : 'plan', T('plan_route'));
    }
    var day = plan.days[d];
    if (!day.stops.length) {
      var body;
      if (day.skipped === 'past') body = T('day_past', dayName(d));
      else if (day.skipped === 'disabled') body = T('day_disabled', dayIn(d));
      else if (day.openCount === 0) body = T('day_none_open', dayIn(d));
      else body = T('day_none_fit', dayIn(d), Fmt.time(day.departure));
      return h + empty(T('day_none_title'), body) + footer(plan);
    }

    var last = day.stops[day.stops.length - 1];
    var route = C.MapsLinks.dayRoute(plan, day);
    h += '<section class="pad"><h2 class="display">' + esc(nMarkets(day.stops.length)) + '</h2>' +
      '<p class="soft">' + esc(day.distanceM > 0 ? T('cycling', Fmt.duration(day.travelSec), Fmt.distance(day.distanceM))
        : T('cycling_no_distance', Fmt.duration(day.travelSec))) + '</p>' +
      '<p class="small" style="margin-top:6px">' + esc(T('summary_times', Fmt.time(day.leaveStart), Fmt.time(last.leave))) + '</p>';
    var picture = settings.showMap ? routeMap(plan, day, d) : '';
    if (picture) {
      h += '<a class="map" href="' + esc(route) + '" target="_blank" rel="noopener">' + picture + '</a>' +
        '<p class="credit">' + esc(T('map_credit')) + ' <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></p>';
    }
    h += '<div class="actions"><a class="btn-outline" href="' + esc(route) + '" target="_blank" rel="noopener">' + ICON.map +
      esc(T('open_in_maps')) + '</a><button type="button" class="btn-text" data-act="share" data-day="' + d + '">' + esc(T('share')) +
      '</button></div></section>';

    // start row
    h += '<div class="row first"><div class="time"><b>' + Fmt.time(day.leaveStart) + '</b></div><div class="rail"><span class="ring"></span></div>' +
      '<div class="body"><h3>' + esc(plan.startAddress ? T('start_from_address', plan.startAddress) : T('start_from_location')) + '</h3>' +
      (day.latestLeaveStart >= day.leaveStart + 60 ? '<p class="line soft">' + esc(T('start_latest', Fmt.time(day.latestLeaveStart))) + '</p>' : '') +
      '</div></div>';

    var visited = marks().visited;
    day.stops.forEach(function (s, i) {
      var isLast = i === day.stops.length - 1;
      var legText = s.legEstimated ? T('leg_estimated', Fmt.duration(s.legSec))
        : (s.legMeters > 0 ? T('leg', Fmt.duration(s.legSec), Fmt.distance(s.legMeters)) : T('leg_no_distance', Fmt.duration(s.legSec)));
      h += '<div class="row leg"><div class="time"></div><div class="rail"><span class="bike">' + ICON.bike + '</span></div>' +
        '<div class="body">' + esc(legText) + '</div></div>';

      var market = marketById(s.marketId);
      var lines = '';
      if (market && market.organizer) lines += '<p class="line soft">' + esc(market.organizer) + '</p>';
      if (s.address) lines += '<p class="line soft">' + esc(s.address) + '</p>';
      lines += '<p class="line gap">' + esc(T('open_hours', Fmt.time(s.open) + '–' + Fmt.time(s.close))) + '</p>';
      // The first ride starts at the "leave at" time above, which is already set to arrive at opening.
      var arrive = i === 0 ? Math.max(s.arrive, day.leaveStart + s.legSec) : s.arrive;
      if (s.begin - arrive >= 120) lines += '<p class="line">' + esc(T('wait', Fmt.time(arrive), Fmt.duration(s.begin - arrive))) + '</p>';
      if (isLast) {
        lines += '<p class="line">' + esc(s.leave - s.begin < settings.service
          ? T('last_short', Fmt.duration(s.leave - s.begin), Fmt.time(s.close)) : T('last_full', Fmt.time(s.close))) + '</p>';
      } else if (s.latestLeave - s.leave >= 60) {
        lines += '<p class="line">' + esc(T('leave_by', Fmt.time(s.latestLeave))) + '</p>';
      }
      if (market) market.notes.forEach(function (n) { lines += '<p class="note">' + esc(n) + '</p>'; });
      h += '<div class="row' + (isLast ? ' last' : '') + '"><div class="time"><b>' + Fmt.time(s.begin) + '</b><span>' + Fmt.time(s.leave) + '</span></div>' +
        '<div class="rail"><span class="sticker' + (d === SUN ? ' sun' : '') + '" style="transform:rotate(' + TILT[i % TILT.length] + 'deg)">' + (i + 1) + '</span></div>' +
        '<div class="body"><h3>' + esc(s.name) + '</h3>' + lines +
        '<div class="stop-actions"><a class="btn-small" target="_blank" rel="noopener" href="' + esc(C.MapsLinks.directionsTo(C.MapsLinks.stopPoint(s))) + '">' +
        ICON.nav + esc(T('navigate')) + '</a>' + check('visited', s.marketId, visited.indexOf(s.marketId) >= 0, T('visited'), '') +
        '</div></div></div>';
    });
    return h + footer(plan);
  }

  function check(kind, id, on, label, cls, day) {
    return '<label class="check ' + cls + '"><input type="checkbox" data-mark="' + kind + '" data-id="' + esc(id) + '"' +
      (day != null ? ' data-day="' + day + '"' : '') + (on ? ' checked' : '') + '>' + esc(label) + '</label>';
  }

  function marketById(id) {
    for (var i = 0; i < S.markets.length; i++) if (S.markets[i].id === id) return S.markets[i];
    return null;
  }

  function renderNoMarkets() {
    if (S.loading) return '<div class="pad empty"><p>' + esc(T('loading')) + '</p></div>';
    if (S.loadError) return empty(T('load_failed', S.loadError), '', 'refresh', T('try_again'));
    return '<div class="pad empty"><p>' + esc(T('no_weekends')) + '</p></div>';
  }

  function renderAll() {
    if (!S.markets.length) return renderNoMarkets();
    var m = marks();
    var h = topBanners() + '<p class="pad meta">' + esc(T('markets_intro')) + '</p>';
    S.markets.forEach(function (x) {
      var pos = S.plan ? C.PlanBuilder.find(S.plan, x.id) : null;
      h += '<article class="market"><h3>' + esc(x.name) + '</h3>';
      if (pos) {
        h += '<span class="sticker' + (pos[0] === SUN ? ' sun' : '') + '" style="transform:rotate(' + TILT[(pos[1] - 1) % TILT.length] + 'deg)">' + pos[1] + '</span>';
      }
      if (x.organizer) h += '<p class="soft">' + esc(x.organizer) + '</p>';
      if (pos) h += '<p class="status">' + esc(T('in_plan', dayName(pos[0]), pos[1])) + '</p>';
      else if (S.plan) h += '<p class="status soft">' + esc(T('not_in_plan')) + '</p>';
      if (C.anyHours(x)) {
        h += '<div class="hours">';
        [SAT, SUN].forEach(function (d) {
          h += '<p>' + esc(C.isOpen(x, d) ? T('hours_day', dayName(d), C.hoursText(x, d)) : T('closed_day', dayName(d))) + '</p>';
        });
        h += '</div>';
      } else {
        h += '<p class="note">' + esc(T('hours_missing')) + '</p>';
      }
      h += '<p class="soft" style="margin-top:4px">' + esc(x.address || T('address_missing')) + '</p>';
      x.notes.forEach(function (n) { h += '<p class="note">' + esc(n) + '</p>'; });
      if (x.hoursEdited || x.addressEdited) h += '<p class="meta">' + esc(T('edited')) + '</p>';
      h += '<div class="checks">';
      if (C.isOpen(x, SAT)) h += check('must', x.id, m.must[SAT].indexOf(x.id) >= 0, T('must_sat'), 'sat', SAT);
      if (C.isOpen(x, SUN)) h += check('must', x.id, m.must[SUN].indexOf(x.id) >= 0, T('must_sun'), 'sun', SUN);
      h += '</div><div class="checks">' + check('visited', x.id, m.visited.indexOf(x.id) >= 0, T('visited'), '') +
        check('skip', x.id, m.skip.indexOf(x.id) >= 0, T('skip'), 'plain') + '<span class="spacer"></span>' +
        '<button type="button" class="tool" data-act="edit" data-id="' + esc(x.id) + '" aria-label="' + esc(T('edit')) + '">' + ICON.edit + '</button>';
      if (x.url) h += '<a class="tool" href="' + esc(x.url) + '" target="_blank" rel="noopener" aria-label="' + esc(T('web_page')) + '">' + ICON.open + '</a>';
      h += '</div></article>';
    });
    return h + (S.plan ? footer(S.plan) : '');
  }

  function render() {
    var sel = $('weekend');
    var options = S.weekends.map(function (w) {
      return '<option value="' + w.saturday + '"' + (w.saturday === S.saturday ? ' selected' : '') + '>' +
        esc(T('weekend_option', T('weekend', weekendRange(w.saturday)), w.count)) + '</option>';
    }).join('');
    if (sel.innerHTML !== options) sel.innerHTML = options;
    sel.hidden = S.weekends.length === 0;

    var sat = S.saturday || S.target;
    var labels = { sat: T('tab_day', dayName(SAT), C.Dates.day(sat)), sun: T('tab_day', dayName(SUN), C.Dates.day(C.Dates.addDays(sat, 1))), all: T('tab_all') };
    Array.prototype.forEach.call(document.querySelectorAll('#tabs button'), function (b) {
      b.textContent = labels[b.dataset.tab];
      b.setAttribute('aria-selected', b.dataset.tab === S.tab ? 'true' : 'false');
    });

    content.innerHTML = S.tab === 'all' ? renderAll() : renderDay(S.tab === 'sun' ? SUN : SAT);

    $('status').hidden = !S.busy && !(S.loading && S.markets.length);
    $('status-text').textContent = S.busy ? S.status : T('loading');
    $('refresh').classList.toggle('spin', S.loading);
    var address = Store.startAddress();
    $('start-text').textContent = address ? T('start_line_address', address) : T('start_line_location');
    $('start').disabled = S.busy;
    var plan = $('plan');
    plan.textContent = S.plan ? T('plan_again') : T('plan_route');
    plan.disabled = S.busy || !S.markets.length;
  }

  // ------------------------------------------------------------------ dialogs

  var dialog = $('dialog');

  function openDialog(html, onSubmit) {
    dialog.innerHTML = '<form method="dialog">' + html + '</form>';
    var form = dialog.querySelector('form');
    var clicked = '';
    // Which button submitted the form (event.submitter is missing on older iPhones). Enter in a field means save.
    form.addEventListener('click', function (e) {
      var b = e.target.closest('button[value]');
      if (b) clicked = b.value;
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var action = clicked || 'save';
      clicked = '';
      if (onSubmit(action, form) !== false) dialog.close();
    });
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    return form;
  }

  function actions(left) {
    return '<div class="dialog-actions">' + (left || '') +
      '<button class="btn-text" value="cancel" formnovalidate>' + esc(T('cancel')) + '</button>' +
      '<button class="btn-text strong" value="save">' + esc(T('save')) + '</button></div>';
  }

  function startDialog() {
    openDialog('<h2>' + esc(T('start_title')) + '</h2>' +
      '<label class="field"><input type="text" name="address" autocomplete="street-address" placeholder="' + esc(T('start_hint')) +
      '" value="' + esc(Store.startAddress()) + '"></label><p class="help">' + esc(T('start_help')) + '</p>' +
      actions('<button class="btn-text left" value="location">' + esc(T('start_use_location')) + '</button>'),
    function (action, form) {
      if (action === 'cancel') return;
      var a = action === 'location' ? '' : form.elements.address.value.trim();
      if (a === Store.startAddress()) return;
      Store.setStartAddress(a);
      if (S.plan) setDirty(true);
      render();
    });
  }

  function editDialog(id) {
    var m = marketById(id);
    if (!m) return;
    var raw = null;
    var file = Data.Site.weekend(S.data, S.saturday);
    (file ? file.markets : []).forEach(function (x) { if (x.id === id) raw = x; });
    function range(d) { return C.isOpen(m, d) ? Fmt.time(m.open[d]) + '-' + Fmt.time(m.close[d]) : ''; }
    openDialog('<h2>' + esc(T('edit_title', m.name)) + '</h2>' +
      '<label class="field"><span>' + esc(T('edit_sat')) + '</span><input type="text" name="sat" inputmode="numeric" placeholder="' + esc(T('edit_hours_hint')) + '" value="' + range(SAT) + '"></label>' +
      '<label class="field"><span>' + esc(T('edit_sun')) + '</span><input type="text" name="sun" inputmode="numeric" placeholder="' + esc(T('edit_hours_hint')) + '" value="' + range(SUN) + '"></label>' +
      '<label class="field"><span>' + esc(T('edit_address')) + '</span><input type="text" name="address" value="' + esc(m.address) + '"></label>' +
      '<p class="error" hidden>' + esc(T('invalid_hours')) + '</p>' +
      actions('<button class="btn-text left" value="reset">' + esc(T('use_web_page')) + '</button>'),
    function (action, form) {
      if (action === 'cancel') return undefined;
      if (action === 'reset') {
        Store.saveCorrection(S.saturday, id, null, null);
      } else {
        var h = [form.elements.sat.value, form.elements.sun.value].map(function (v) {
          return v.trim() === '' ? [-1, -1] : Fmt.parseRange(v);
        });
        if (!h[0] || !h[1]) {
          form.querySelector('.error').hidden = false;
          return false;
        }
        var hours = [h[0][0], h[0][1], h[1][0], h[1][1]];
        var same = raw && raw.open[0] === hours[0] && raw.close[0] === hours[1] && raw.open[1] === hours[2] && raw.close[1] === hours[3];
        var a = form.elements.address.value.trim();
        Store.saveCorrection(S.saturday, id, same ? null : hours, !a || (raw && a === raw.address) ? null : a);
      }
      applyMarkets();
      if (S.plan) setDirty(true);
      render();
      return undefined;
    });
  }

  function hhmm(sec) { return Fmt.time(sec); }

  /** The settings that change a plan (the map switch does not). */
  function planningSettings() {
    var x = Store.settings();
    return JSON.stringify([x.service, x.minLast, x.bikePct, x.legBuffer, x.departure, x.planDay]);
  }

  function settingsDialog() {
    var s = Store.settings();
    function num(name, label, value, min, max) {
      return '<label class="field inline"><span>' + esc(label) + '</span><input type="number" inputmode="numeric" name="' + name +
        '" min="' + min + '" max="' + max + '" value="' + value + '"></label>';
    }
    function time(name, label, sec) {
      return '<label class="field inline"><span>' + esc(label) + '</span><input type="time" name="' + name + '" value="' + hhmm(sec) + '"></label>';
    }
    function box(name, label, on) {
      return '<label class="check plain" style="display:flex"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '>' + esc(label) + '</label>';
    }
    openDialog('<h2>' + esc(T('settings')) + '</h2>' +
      '<h3>' + esc(T('s_days')) + '</h3>' + box('planSat', T('s_plan_sat'), s.planDay[0]) + time('depSat', T('s_leave_sat'), s.departure[0]) +
      box('planSun', T('s_plan_sun'), s.planDay[1]) + time('depSun', T('s_leave_sun'), s.departure[1]) +
      '<h3>' + esc(T('s_visits')) + '</h3>' + num('service', T('s_service'), Math.round(s.service / 60), 5, 240) +
      num('minLast', T('s_min_last'), Math.round(s.minLast / 60), 0, 240) +
      '<h3>' + esc(T('s_cycling')) + '</h3>' + num('bikePct', T('s_bike_pct'), s.bikePct, 30, 300) +
      num('legBuffer', T('s_buffer'), Math.round(s.legBuffer / 60), 0, 30) + box('showMap', T('s_map'), s.showMap) +
      actions(), function (action, f) {
      if (action === 'cancel') return;
      var e = f.elements;
      function n(name, fallback, min, max) {
        var v = parseInt(e[name].value, 10);
        return isNaN(v) ? fallback : Math.max(min, Math.min(max, v));
      }
      var next = {
        service: n('service', 60, 5, 240) * 60, minLast: n('minLast', 20, 0, 240) * 60,
        bikePct: n('bikePct', 100, 30, 300), legBuffer: n('legBuffer', 2, 0, 30) * 60,
        departure: [Math.max(0, Fmt.parseTime(e.depSat.value)), Math.max(0, Fmt.parseTime(e.depSun.value))],
        planDay: [e.planSat.checked, e.planSun.checked], showMap: e.showMap.checked
      };
      var before = planningSettings();
      Store.saveSettings(next);
      if (S.plan && planningSettings() !== before) setDirty(true);
      render();
    });
  }

  function copy(text) {
    function done() { toast(T('copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt('', text); });
    } else {
      window.prompt('', text);
    }
  }

  function share(d) {
    var plan = S.plan;
    var day = plan.days[d];
    var text = dayName(d) + ' ' + dateLabel(C.Dates.addDays(plan.saturday, d)) + ' – ' + nMarkets(day.stops.length) + '\n';
    day.stops.forEach(function (s, i) {
      text += (i + 1) + '. ' + Fmt.time(s.begin) + '–' + Fmt.time(s.leave) + '  ' + s.name + '\n';
    });
    text += '\n' + C.MapsLinks.dayRoute(plan, day);
    if (navigator.share) navigator.share({ text: text }).catch(function () { /* cancelled */ });
    else copy(text);
  }

  // ------------------------------------------------------------------ events and start-up

  function act(name, el) {
    if (name === 'plan') startPlanning();
    else if (name === 'settings') settingsDialog();
    else if (name === 'refresh') loadData();
    else if (name === 'share') share(Number(el.dataset.day));
    else if (name === 'edit') editDialog(el.dataset.id);
  }

  content.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (el) act(el.dataset.act, el);
  });
  content.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.mark) setMark(el.dataset.mark, el.dataset.id, el.checked, el.dataset.day != null ? Number(el.dataset.day) : undefined);
  });
  $('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || b.dataset.tab === S.tab) return;
    S.tab = b.dataset.tab;
    render();
    window.scrollTo(0, 0);
  });
  $('weekend').addEventListener('change', function () { selectWeekend(Number(this.value)); });
  $('refresh').addEventListener('click', loadData);
  $('settings').addEventListener('click', settingsDialog);
  $('start').addEventListener('click', startDialog);
  $('plan').addEventListener('click', startPlanning);

  function init() {
    document.documentElement.lang = T.lang;
    Fmt.hourUnit = T('hour_unit');
    Fmt.decimal = T('decimal');
    $('refresh').setAttribute('aria-label', T('refresh'));
    $('settings').setAttribute('aria-label', T('settings'));
    S.target = C.Dates.upcomingSaturday(C.Dates.today(), C.Dates.secondsNow());
    render();
    loadData();
  }

  // For the browser test page (test/e2e.html).
  window.RideAtDawn = { state: S, render: render, startPlanning: startPlanning };
  init();
})();
