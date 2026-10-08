// Ride at Dawn: storage in this browser, the published market data, address lookup for the
// start point, and the planning pass. No DOM in here.
//
// The app never talks to Google and holds no key. Markets, opening hours, coordinates and the
// bike times between markets come from data/weekends.json, which tools/update-data.js writes on
// the owner's computer. Only the ride from your own start to a market is estimated here.
(function (root) {
  'use strict';
  var C = root.Core;
  var T = root.T;
  var SAT = C.SAT;
  var SUN = C.SUN;

  // ------------------------------------------------------------------ storage (this browser only)

  var PREFIX = 'rideatdawn.';
  var memory = {}; // fallback when localStorage is blocked (private mode on some browsers)

  function read(key, fallback) {
    var raw;
    try {
      raw = root.localStorage.getItem(PREFIX + key);
    } catch (e) {
      raw = Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    }
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e2) {
      return fallback;
    }
  }

  function write(key, value) {
    var raw = JSON.stringify(value);
    try {
      root.localStorage.setItem(PREFIX + key, raw);
    } catch (e) {
      memory[key] = raw;
    }
  }

  function toggle(list, id, on) {
    var out = list.filter(function (x) { return x !== id; });
    if (on) out.push(id);
    return out;
  }

  var Store = {
    startAddress: function () { return String(read('start', '') || ''); },
    setStartAddress: function (a) { write('start', String(a || '').trim()); },
    settings: function () {
      var s = C.PlanBuilder.defaults();
      var saved = read('settings', {}) || {};
      ['service', 'minLast', 'bikePct', 'legBuffer'].forEach(function (k) {
        if (typeof saved[k] === 'number' && saved[k] >= 0) s[k] = saved[k];
      });
      if (saved.departure && saved.departure.length === 2) s.departure = saved.departure;
      if (saved.planDay && saved.planDay.length === 2) s.planDay = saved.planDay;
      s.showMap = saved.showMap !== false;
      return s;
    },
    saveSettings: function (s) { write('settings', s); },
    /** Per weekend: {visited: [], skip: [], must: [[], []]} of market ids. */
    marks: function (saturday) {
      var m = read('marks.' + saturday, null) || {};
      return {
        visited: m.visited || [], skip: m.skip || [],
        must: [m.must && m.must[0] || [], m.must && m.must[1] || []]
      };
    },
    saveMarks: function (saturday, m) { write('marks.' + saturday, m); },
    flag: function (name) { return read('flag.' + name, false) === true; },
    setFlag: function (name, v) { write('flag.' + name, !!v); },
    plan: function (saturday) { return read('plan.' + saturday, null); },
    savePlan: function (saturday, plan) { write('plan.' + saturday, plan); },
    /** The last data file this browser fetched, so the app also opens without a connection. */
    data: function () { return read('data', null); },
    saveData: function (d) { write('data', d); },
    /** The user's own opening hours / address for a market: key "saturday:id" -> {hours, address}. */
    corrections: function () { return read('corrections', {}) || {}; },
    saveCorrection: function (saturday, id, hours, address) {
      var all = Store.corrections();
      if (!hours && !address) delete all[saturday + ':' + id];
      else all[saturday + ':' + id] = { hours: hours || null, address: address || null };
      write('corrections', all);
    },
    addresses: function () { return read('addresses', {}) || {}; },
    saveAddresses: function (a) { write('addresses', a); }
  };

  // JSON cannot hold NaN: coordinates come back as null and are turned into NaN again here.
  function fixCoords(o) {
    if (o && typeof o.lat !== 'number') o.lat = NaN;
    if (o && typeof o.lng !== 'number') o.lng = NaN;
    return o;
  }
  function fixPlan(plan) {
    if (!plan) return null;
    if (typeof plan.startLat !== 'number') plan.startLat = NaN;
    if (typeof plan.startLng !== 'number') plan.startLng = NaN;
    plan.days.forEach(function (d) { d.stops.forEach(fixCoords); });
    return plan;
  }

  function Failure(message) { this.message = message; }

  // ------------------------------------------------------------------ the published data file

  var Site = {
    /** Fetches data/weekends.json. Rejects with a short reason when it cannot be read. */
    fetchData: function () {
      return root.fetch('data/weekends.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Failure('HTTP ' + r.status);
        return r.json();
      }, function () {
        throw new Failure('network');
      }).then(function (d) {
        if (!d || !Array.isArray(d.weekends)) throw new Failure('format');
        Store.saveData(d);
        return d;
      });
    },
    /** Weekends from this Saturday on that have markets: [{saturday, count}], earliest first. */
    weekends: function (data, fromSaturday) {
      if (!data) return [];
      return data.weekends.filter(function (w) { return w.saturday >= fromSaturday && w.markets.length > 0; })
        .map(function (w) { return { saturday: w.saturday, count: w.markets.length }; })
        .sort(function (a, b) { return a.saturday - b.saturday; });
    },
    weekend: function (data, saturday) {
      var found = null;
      if (data) data.weekends.forEach(function (w) { if (w.saturday === saturday) found = w; });
      return found;
    },
    /** The weekend's markets as full market objects with the user's corrections applied. */
    markets: function (data, saturday) {
      var w = Site.weekend(data, saturday);
      if (!w) return [];
      var all = Store.corrections();
      return w.markets.map(function (raw) {
        var m = C.newMarket();
        ['id', 'name', 'url', 'organizer', 'address', 'resolvedAddress'].forEach(function (k) { m[k] = raw[k] || ''; });
        m.notes = (raw.notes || []).slice();
        m.open = raw.open.slice();
        m.close = raw.close.slice();
        m.lat = typeof raw.lat === 'number' ? raw.lat : NaN;
        m.lng = typeof raw.lng === 'number' ? raw.lng : NaN;
        var c = all[saturday + ':' + m.id];
        if (c && c.hours) {
          m.open = [c.hours[0], c.hours[2]];
          m.close = [c.hours[1], c.hours[3]];
          m.hoursEdited = true;
        }
        if (c && c.address) {
          m.address = c.address;
          m.addressEdited = true;
        }
        return m;
      });
    }
  };

  // ------------------------------------------------------------------ address lookup (Kartverket, free, no key)

  var ADDRESS_URL = 'https://ws.geonorge.no/adresser/v1/sok';

  var Addresses = {
    /**
     * Coordinates for a typed Norwegian address, or null. When several places match, the one
     * closest to {@code near} ({lat, lng}, the middle of the weekend's markets) wins.
     */
    lookup: function (text, near) {
      var q = String(text || '').trim();
      if (!q) return Promise.resolve(null);
      var cache = Store.addresses();
      var k = q.toLowerCase();
      if (cache[k]) return Promise.resolve(cache[k]);
      // "Name, Street 1, 0123 Oslo" is tried whole, then without its first part, then as its first part only.
      var parts = q.split(',').map(function (p) { return p.trim(); }).filter(function (p) { return p; });
      var tries = [parts.join(' ')];
      if (parts.length >= 3) tries.push(parts.slice(1).join(' '));
      if (parts.length >= 2) tries.push(parts[0]);
      function attempt(i) {
        if (i >= tries.length) return Promise.resolve(null);
        return root.fetch(ADDRESS_URL + '?fuzzy=true&treffPerSide=10&sok=' + encodeURIComponent(tries[i])).then(function (r) {
          if (!r.ok) throw new Failure('HTTP ' + r.status);
          return r.json();
        }, function () {
          throw new Failure(T('err_network', 'Kartverket'));
        }).then(function (o) {
          var best = null;
          var bestKm = Infinity;
          (o.adresser || []).forEach(function (a) {
            var p = a.representasjonspunkt;
            if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
            var km = near ? C.PlanBuilder.km(near.lat, near.lng, p.lat, p.lon) : 0;
            if (km < bestKm) {
              bestKm = km;
              best = { lat: p.lat, lng: p.lon, formatted: a.adressetekst + ', ' + a.postnummer + ' ' + a.poststed };
            }
          });
          return best || attempt(i + 1);
        });
      }
      return attempt(0).then(function (hit) {
        if (hit) {
          cache[k] = hit;
          Store.saveAddresses(cache);
        }
        return hit;
      });
    }
  };

  // ------------------------------------------------------------------ planning pass

  function quantile(list, q, fallback) {
    if (!list.length) return fallback;
    var s = list.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(s.length * q))];
  }

  /**
   * How this weekend's real bike rides relate to straight lines: seconds and metres per
   * straight-line km over all pairs in the file. Used to estimate rides that are not in the file.
   * Time uses the slower end (three quarters of the rides are quicker), because leaving early
   * costs a short wait while leaving late can cost a market. Falls back to 15 km/h with a 35 % detour.
   */
  function calibrate(w) {
    var sec = [];
    var met = [];
    if (w) {
      w.markets.forEach(function (a, i) {
        w.markets.forEach(function (b, j) {
          if (i === j || typeof a.lat !== 'number' || typeof b.lat !== 'number' || w.seconds[i][j] == null) return;
          var km = C.PlanBuilder.km(a.lat, a.lng, b.lat, b.lng);
          if (km < 0.5) return;
          sec.push(w.seconds[i][j] / km);
          met.push(w.meters[i][j] / km);
        });
      });
    }
    return { secPerKm: quantile(sec, 0.75, 324), metersPerKm: quantile(met, 0.5, 1350) };
  }

  var Planner = {
    calibrate: calibrate,

    /**
     * candidates -> coordinates -> bike times (from the file, estimates for the start) -> solve.
     * start = {label, lat, lng, address}. Resolves to a plan; rejects with a Failure (message for the user).
     */
    plan: function (data, saturday, markets, start, progress) {
      var settings = Store.settings();
      var status = C.PlanBuilder.dayStatus(saturday, C.Dates.today(), C.Dates.secondsNow(), settings);
      var dep = status.dep;
      if (dep[0] < 0 && dep[1] < 0) return Promise.reject(new Failure(T('err_no_days')));

      var warnings = [];
      var marks = Store.marks(saturday);
      var cands = [];
      var noHours = [];
      markets.forEach(function (m) {
        if (marks.visited.indexOf(m.id) >= 0 || marks.skip.indexOf(m.id) >= 0) return;
        if (!C.anyHours(m)) {
          noHours.push(m.name);
          return;
        }
        if ((dep[0] >= 0 && C.isOpen(m, SAT)) || (dep[1] >= 0 && C.isOpen(m, SUN))) cands.push(fixCoords(JSON.parse(JSON.stringify(m))));
      });
      if (noHours.length) warnings.push(T('warn_hours_missing', noHours.join(', ')));
      if (!cands.length) return Promise.reject(new Failure(T('err_nothing')));
      if (cands.length > C.Solver.MAX_MARKETS) {
        cands = cands.slice(0, C.Solver.MAX_MARKETS);
        warnings.push(T('warn_too_many', C.Solver.MAX_MARKETS));
      }

      var w = Site.weekend(data, saturday);
      var index = {};
      var near = { lat: 0, lng: 0 };
      var located = 0;
      if (w) {
        w.markets.forEach(function (m, i) {
          index[m.id] = i;
          if (typeof m.lat === 'number') {
            near.lat += m.lat;
            near.lng += m.lng;
            located++;
          }
        });
      }
      near = located ? { lat: near.lat / located, lng: near.lng / located } : { lat: 59.9139, lng: 10.7522 };

      // 1. Coordinates. Markets come with theirs; an address the user typed in is looked up.
      progress(T('status_addresses'));
      var moved = {};
      function locateEdited(i) {
        if (i >= cands.length) return Promise.resolve();
        var m = cands[i];
        if (!m.addressEdited && C.hasCoords(m)) return locateEdited(i + 1);
        return Addresses.lookup(m.address || m.name, near).then(function (hit) {
          moved[m.id] = true;
          m.lat = hit ? hit.lat : NaN;
          m.lng = hit ? hit.lng : NaN;
          return locateEdited(i + 1);
        });
      }
      var startPoint = { lat: start.lat, lng: start.lng };
      return locateEdited(0).then(function () {
        if (C.hasCoords(startPoint)) return null;
        return Addresses.lookup(start.address, near).then(function (hit) {
          if (!hit) throw new Failure(T('err_address', start.address));
          startPoint = { lat: hit.lat, lng: hit.lng };
        });
      }).then(function () {
        // 2. Bike times: the file's Google times between markets, estimates for everything else.
        var cal = calibrate(w);
        var nodes = cands.length + 1;
        var points = [startPoint].concat(cands);
        var mx = [];
        var est = [];
        var i, j;
        for (i = 0; i < nodes; i++) {
          mx.push([]);
          est.push([]);
          for (j = 0; j < nodes; j++) {
            mx[i].push(i === j ? [0, 0] : null);
            est[i].push(false);
            if (i === j || j === 0) continue;
            var a = points[i];
            var b = points[j];
            var fi = i > 0 && !moved[a.id] ? index[a.id] : undefined;
            var tj = !moved[b.id] ? index[b.id] : undefined;
            if (fi !== undefined && tj !== undefined && w.seconds[fi][tj] != null) {
              mx[i][j] = [w.seconds[fi][tj], w.meters[fi][tj]];
            } else if (C.hasCoords(a) && C.hasCoords(b)) {
              var km = C.PlanBuilder.km(a.lat, a.lng, b.lat, b.lng);
              mx[i][j] = [Math.round(km * cal.secPerKm), Math.round(km * cal.metersPerKm)];
              est[i][j] = true;
            }
          }
        }
        var unreachable = [];
        for (j = 1; j < nodes; j++) {
          var any = false;
          for (i = 0; i < nodes; i++) any = any || (i !== j && !!mx[i][j]);
          if (!any) unreachable.push(cands[j - 1].name);
        }
        if (unreachable.length) warnings.push(T('warn_no_location', unreachable.join(', ')));

        // 3. Solve
        progress(T('status_solving'));
        var plan = C.PlanBuilder.build(saturday, cands, mx, est, settings, dep, status.skip, marks.must);
        for (var d = 0; d < 2; d++) {
          if (dep[d] < 0) continue;
          var missed = [];
          cands.forEach(function (m) {
            if (marks.must[d].indexOf(m.id) < 0) return;
            var pos = C.PlanBuilder.find(plan, m.id);
            if (!pos || pos[0] !== d) missed.push(m.name);
          });
          if (missed.length) warnings.push(T('warn_must_missed', T(d === SAT ? 'saturday_in' : 'sunday_in'), missed.join(', ')));
        }
        plan.startLabel = start.label;
        plan.startLat = startPoint.lat;
        plan.startLng = startPoint.lng;
        plan.startAddress = start.address || '';
        plan.dataAt = data && data.generatedAt || '';
        plan.warnings = warnings;
        return plan;
      });
    },

    /**
     * On Sunday, Saturday's planned stops count as visited (once), unless the user already
     * started ticking markets off. Returns how many were marked.
     */
    autoMarkSaturday: function (saturday) {
      if (C.Dates.today() <= saturday) return 0;
      var flag = 'auto_sat_' + saturday;
      if (Store.flag(flag)) return 0;
      var prev = Store.plan(saturday);
      if (!prev || !prev.days[SAT].stops.length) return 0;
      Store.setFlag(flag, true);
      var marks = Store.marks(saturday);
      var ids = prev.days[SAT].stops.map(function (s) { return s.marketId; });
      if (ids.some(function (id) { return marks.visited.indexOf(id) >= 0; })) return 0;
      marks.visited = marks.visited.concat(ids);
      Store.saveMarks(saturday, marks);
      return ids.length;
    }
  };

  root.Data = { Store: Store, Site: Site, Addresses: Addresses, Planner: Planner, Failure: Failure,
    toggle: toggle, fixPlan: fixPlan, fixCoords: fixCoords };
})(typeof self !== 'undefined' ? self : this);
