#!/usr/bin/env node
// Updates data/weekends.json: every upcoming weekend on loppemarkeder.com with its markets
// (opening hours, address, coordinates) and the Google bike times between all of them.
// The web app only reads that file, so the Google key never leaves this computer.
//
//   node tools/update-data.js            reuse what the file already has, fetch only what is new
//   node tools/update-data.js --fresh    fetch every address and bike time again
//   node tools/update-data.js --dry-run  show what would be fetched, call nothing at Google
//
// The key comes from GOOGLE_API_KEY, or from googleapikey.txt in the folder above this project.
// Needs Node 12 or newer and nothing else.
'use strict';
var fs = require('fs');
var path = require('path');
var https = require('https');
var C = require('../core.js');

var ROOT = path.join(__dirname, '..');
var OUT = path.join(ROOT, 'data', 'weekends.json');
var SITE = 'https://www.loppemarkeder.com';
var FRESH = process.argv.indexOf('--fresh') >= 0;
var DRY = process.argv.indexOf('--dry-run') >= 0;

function readKey() {
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY.trim();
  var file = path.join(ROOT, '..', 'googleapikey.txt');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  return '';
}

function request(method, url, headers, body) {
  return new Promise(function (resolve, reject) {
    var req = https.request(url, { method: method, headers: Object.assign({ 'User-Agent': 'RideAtDawn/1.0 (flea market route planner)' }, headers || {}) }, function (res) {
      var chunks = [];
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { resolve({ code: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }); });
    });
    req.on('error', reject);
    req.setTimeout(30000, function () { req.destroy(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getJson(url) {
  var r = await request('GET', url, { Accept: 'application/json' });
  if (r.code < 200 || r.code >= 300) throw new Error('HTTP ' + r.code + ' from ' + url.split('?')[0]);
  return { body: JSON.parse(r.text), pages: parseInt(r.headers['x-wp-totalpages'] || '1', 10) || 1 };
}

async function getPaged(url) {
  var out = [];
  for (var page = 1; page <= 10; page++) {
    var r = await getJson(url + '&per_page=100&page=' + page);
    out = out.concat(r.body);
    if (page >= r.pages || r.body.length < 100) break;
  }
  return out;
}

// ------------------------------------------------------------------ Google

var used = { geocode: 0, elements: 0 };

async function geocode(key, address) {
  used.geocode++;
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) +
    '&components=country:NO&bounds=' + encodeURIComponent('59.60,10.20|60.30,11.40') + '&language=no&key=' + encodeURIComponent(key);
  var o = JSON.parse((await request('GET', url)).text);
  if (o.status === 'ZERO_RESULTS') return null;
  if (o.status !== 'OK') throw new Error('Geocoding API: ' + o.status + (o.error_message ? ' - ' + o.error_message : ''));
  var res = o.results[0];
  var precise = res.geometry.location_type !== 'APPROXIMATE';
  (res.types || []).forEach(function (t) {
    if (t === 'locality' || t === 'postal_code' || t.indexOf('administrative_area') === 0 || t === 'country' || t === 'postal_town') precise = false;
  });
  return { lat: res.geometry.location.lat, lng: res.geometry.location.lng, formatted: res.formatted_address || '', precise: precise };
}

function latLng(p) { return { waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } }; }

/** result[o][d] = [seconds, meters] or null where Google has no bike route. */
async function bikeMatrix(key, origins, dests) {
  var out = origins.map(function () { return dests.map(function () { return null; }); });
  for (var o0 = 0; o0 < origins.length; o0 += 25) {
    for (var d0 = 0; d0 < dests.length; d0 += 25) {
      var os = origins.slice(o0, o0 + 25);
      var ds = dests.slice(d0, d0 + 25);
      used.elements += os.length * ds.length;
      var r = await request('POST', 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
      }, JSON.stringify({ origins: os.map(latLng), destinations: ds.map(latLng), travelMode: 'BICYCLE' }));
      var body;
      try {
        body = JSON.parse(r.text);
      } catch (e) {
        throw new Error('Routes API: HTTP ' + r.code);
      }
      var first = Array.isArray(body) ? body[0] : body;
      if (r.code < 200 || r.code >= 300 || !Array.isArray(body) || (first && first.error)) {
        var err = first && first.error;
        throw new Error('Routes API: ' + (err ? (err.status || r.code) + ' - ' + (err.message || '') : 'HTTP ' + r.code));
      }
      body.forEach(function (e) {
        var oi = e.originIndex || 0;
        var di = e.destinationIndex || 0;
        if (e.status && e.status.code) return;
        if (e.condition === 'ROUTE_NOT_FOUND' || (!e.duration && e.condition !== 'ROUTE_EXISTS')) return;
        var sec = Math.round(parseFloat(String(e.duration || '0').replace(/s$/, '')) || 0);
        out[o0 + oi][d0 + di] = [sec, Math.max(0, e.distanceMeters || 0)];
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ main

function coordKey(m) { return m.lat.toFixed(5) + ',' + m.lng.toFixed(5); }

function geoQueries(m) {
  var q = [];
  var a = m.address.trim();
  if (a) {
    q.push(a);
    var parts = a.split(',');
    if (parts.length >= 3) q.push(parts.slice(1).map(function (p) { return p.trim(); }).join(','));
  }
  if (m.name) q.push(m.name + ', Oslo');
  return q;
}

async function main() {
  var key = readKey();
  if (!key && !DRY) {
    console.error('No Google key. Set GOOGLE_API_KEY or put it in ../googleapikey.txt (outside this folder).');
    process.exit(2);
  }

  // What the current file already knows: coordinates per address text, bike times per pair of coordinates.
  var knownGeo = {};
  var knownPair = {};
  if (!FRESH && fs.existsSync(OUT)) {
    var old = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    (old.weekends || []).forEach(function (w) {
      w.markets.forEach(function (m, i) {
        if (typeof m.lat !== 'number') return;
        knownGeo[m.address.trim().toLowerCase()] = { lat: m.lat, lng: m.lng, formatted: m.resolvedAddress || '', precise: m.precise !== false };
        w.markets.forEach(function (n, j) {
          if (i === j || typeof n.lat !== 'number' || !w.seconds[i] || w.seconds[i][j] == null) return;
          knownPair[coordKey(m) + '>' + coordKey(n)] = [w.seconds[i][j], w.meters[i][j]];
        });
      });
    });
  }

  var today = C.Dates.today();
  var from = C.Dates.upcomingSaturday(today, C.Dates.secondsNow());
  console.log('Reading loppemarkeder.com from the weekend of ' + from + ' ...');
  var cats = await getPaged(SITE + '/wp-json/wp/v2/categories?hide_empty=true&_fields=id,name,slug,count');
  var weekends = C.WeekendFinder.group(cats.map(function (c) {
    return { id: c.id, name: C.HtmlText.inline(c.name || ''), count: c.count };
  }), from);
  if (!weekends.length) console.log('No upcoming weekends with markets on the site.');

  var problems = [];
  var result = [];
  for (var wi = 0; wi < weekends.length; wi++) {
    var w = weekends[wi];
    var posts = await getPaged(SITE + '/wp-json/wp/v2/posts?categories=' + w.ids.join(',') + '&_fields=id,link,title,content');
    var markets = [];
    posts.forEach(function (o) {
      var m = C.MarketParser.parse(String(o.id || ''), o.title ? o.title.rendered || '' : '', o.link || '', o.content ? o.content.rendered || '' : '');
      if (!markets.some(function (x) { return x.id === m.id; })) markets.push(m);
    });
    markets.sort(function (a, b) { return a.name.localeCompare(b.name, 'nb'); });
    console.log('\nWeekend ' + w.saturday + ': ' + markets.length + ' markets');

    // Coordinates
    for (var i = 0; i < markets.length; i++) {
      var m = markets[i];
      var best = knownGeo[m.address.trim().toLowerCase()] || null;
      if (!best && !DRY) {
        var qs = geoQueries(m);
        for (var q = 0; q < qs.length; q++) {
          var g = await geocode(key, qs[q]);
          if (g && g.precise) {
            best = g;
            break;
          }
          if (g && !best) best = g;
        }
      } else if (!best) {
        used.geocode++;
      }
      if (best) {
        m.lat = best.lat;
        m.lng = best.lng;
        m.resolvedAddress = best.formatted;
        m.precise = best.precise;
      }
      var flags = [];
      if (!C.anyHours(m)) flags.push('NO OPENING HOURS');
      if (!m.address) flags.push('NO ADDRESS');
      if (!best && !DRY) flags.push('NOT FOUND BY GOOGLE');
      if (best && !best.precise) flags.push('APPROXIMATE POSITION');
      console.log('  ' + (m.name + '                          ').slice(0, 26) + ' sat ' + (C.hoursText(m, 0) || '-          ') + '  sun ' +
        (C.hoursText(m, 1) || '-          ') + '  ' + m.address + (flags.length ? '   <-- ' + flags.join(', ') : ''));
      if (flags.length) problems.push(w.saturday + ' ' + m.name + ': ' + flags.join(', '));
    }

    // Bike times between every pair, reusing pairs the file already has
    var n = markets.length;
    var seconds = [];
    var meters = [];
    var needFrom = [];
    var needTo = [];
    for (i = 0; i < n; i++) {
      seconds.push([]);
      meters.push([]);
      for (var j = 0; j < n; j++) {
        seconds[i].push(i === j ? 0 : null);
        meters[i].push(i === j ? 0 : null);
        if (i === j) continue;
        var both = C.hasCoords(markets[i]) && C.hasCoords(markets[j]);
        // In a dry run, markets that would get coordinates from Google count as new.
        if (!both && !(DRY && markets[i].address && markets[j].address)) continue;
        var hit = both ? knownPair[coordKey(markets[i]) + '>' + coordKey(markets[j])] : null;
        if (hit) {
          seconds[i][j] = hit[0];
          meters[i][j] = hit[1];
        } else {
          if (needFrom.indexOf(i) < 0) needFrom.push(i);
          if (needTo.indexOf(j) < 0) needTo.push(j);
        }
      }
    }
    if (needFrom.length && DRY) {
      used.elements += needFrom.length * needTo.length;
      console.log('  would fetch ' + needFrom.length + ' x ' + needTo.length + ' bike times');
    } else if (needFrom.length) {
      console.log('  fetching ' + needFrom.length + ' x ' + needTo.length + ' bike times from Google ...');
      var r = await bikeMatrix(key, needFrom.map(function (x) { return markets[x]; }), needTo.map(function (x) { return markets[x]; }));
      var missing = 0;
      needFrom.forEach(function (fi, a) {
        needTo.forEach(function (tj, b) {
          if (fi === tj) return;
          if (r[a][b]) {
            seconds[fi][tj] = r[a][b][0];
            meters[fi][tj] = r[a][b][1];
          } else if (seconds[fi][tj] == null) {
            missing++;
          }
        });
      });
      if (missing) problems.push(w.saturday + ': Google has no bike route for ' + missing + ' pairs (the app estimates those)');
    } else {
      console.log('  all bike times already in the file');
    }

    result.push({
      saturday: w.saturday,
      markets: markets.map(function (m) {
        return {
          id: m.id, name: m.name, url: m.url, organizer: m.organizer, address: m.address, notes: m.notes,
          open: m.open, close: m.close,
          lat: C.hasCoords(m) ? m.lat : null, lng: C.hasCoords(m) ? m.lng : null,
          resolvedAddress: m.resolvedAddress || '', precise: m.precise !== false
        };
      }),
      seconds: seconds,
      meters: meters
    });
  }

  console.log('\nGoogle usage this run: ' + used.geocode + ' address lookups, ' + used.elements + ' bike-time elements' + (DRY ? ' (dry run, nothing fetched)' : ''));
  if (problems.length) {
    console.log('\nCheck these (fix on the web page, or with Edit in the app):');
    problems.forEach(function (p) { console.log('  ' + p); });
  }
  if (DRY) return;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: SITE, weekends: result }) + '\n');
  console.log('\nWrote ' + path.relative(process.cwd(), OUT) + ' (' + result.length + ' weekends, ' + Math.round(fs.statSync(OUT).size / 1024) + ' kB).');
  console.log('Publish it with: git add data/weekends.json && git commit -m "Update market data" && git push');
}

main().catch(function (e) {
  console.error('\nFailed: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
