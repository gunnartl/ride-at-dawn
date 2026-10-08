// Ride at Dawn: pure logic, no DOM and no network. Ported from the Android app (Loppetur).
// Loaded with a <script> tag in the browser and with require() in the Node tests, so it sticks
// to syntax both understand (no optional chaining, no regex lookbehind for older iPhones).
(function (root) {
  'use strict';

  var SAT = 0;
  var SUN = 1;

  // ------------------------------------------------------------------ dates (yyyymmdd ints)

  var MONTH_NAMES = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august',
    'september', 'oktober', 'november', 'desember'];

  var Dates = {
    SATURDAY: 6,
    SUNDAY: 7,
    of: function (y, m, d) { return y * 10000 + m * 100 + d; },
    year: function (date) { return Math.floor(date / 10000); },
    month: function (date) { return Math.floor(date / 100) % 100; },
    day: function (date) { return date % 100; },
    toUtc: function (date) { return Date.UTC(Dates.year(date), Dates.month(date) - 1, Dates.day(date)); },
    fromUtc: function (ms) {
      var d = new Date(ms);
      return Dates.of(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    },
    addDays: function (date, days) { return Dates.fromUtc(Dates.toUtc(date) + days * 86400000); },
    /** 1 = Monday ... 7 = Sunday. */
    dayOfWeek: function (date) {
      var w = new Date(Dates.toUtc(date)).getUTCDay();
      return w === 0 ? 7 : w;
    },
    isValid: function (y, m, d) {
      if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
      return Dates.fromUtc(Date.UTC(y, m - 1, d)) === Dates.of(y, m, d);
    },
    monthFromName: function (name) {
      if (!name) return 0;
      var s = name.toLowerCase().replace(/\./g, '').trim();
      if (s.length < 3) return 0;
      var i;
      for (i = 0; i < 12; i++) if (MONTH_NAMES[i] === s) return i + 1;
      if (s === 'sept') return 9;
      for (i = 0; i < 12; i++) if (MONTH_NAMES[i].indexOf(s) === 0) return i + 1;
      return 0;
    },
    today: function (now) {
      var c = now || new Date();
      return Dates.of(c.getFullYear(), c.getMonth() + 1, c.getDate());
    },
    secondsNow: function (now) {
      var c = now || new Date();
      return c.getHours() * 3600 + c.getMinutes() * 60 + c.getSeconds();
    },
    /** Today on a Saturday, yesterday on a Sunday until 17:00, otherwise the next Saturday. */
    upcomingSaturday: function (today, secondsNow) {
      var dow = Dates.dayOfWeek(today);
      if (dow === 6) return today;
      if (dow === 7) return secondsNow >= 17 * 3600 ? Dates.addDays(today, 6) : Dates.addDays(today, -1);
      return Dates.addDays(today, 6 - dow);
    }
  };

  // ------------------------------------------------------------------ formatting

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  var Fmt = {
    hourUnit: 't',
    decimal: ',',
    time: function (sec) {
      if (sec < 0) return '--:--';
      var min = Math.floor(sec / 60);
      return pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60);
    },
    duration: function (sec) {
      var min = Math.max(0, Math.floor((sec + 30) / 60));
      if (min < 60) return min + ' min';
      var h = Math.floor(min / 60);
      var m = min % 60;
      return m === 0 ? h + ' ' + Fmt.hourUnit : h + ' ' + Fmt.hourUnit + ' ' + pad2(m) + ' min';
    },
    distance: function (meters) {
      if (meters < 0) return '';
      if (meters < 1000) return (Math.floor((meters + 5) / 10) * 10) + ' m';
      return (meters / 1000).toFixed(1).replace('.', Fmt.decimal) + ' km';
    },
    /** "10", "10:00", "10.30", "1030" -> seconds after midnight, or -1. */
    parseTime: function (s) {
      if (s == null) return -1;
      var t = String(s).trim().replace('.', ':');
      if (!t || !/^[\d:\s]+$/.test(t)) return -1;
      var h;
      var m = 0;
      var colon = t.indexOf(':');
      if (colon >= 0) {
        h = parseInt(t.substring(0, colon).trim(), 10);
        var mm = t.substring(colon + 1).trim();
        m = mm === '' ? 0 : parseInt(mm, 10);
      } else if (t.length >= 3) {
        var v = parseInt(t, 10);
        h = Math.floor(v / 100);
        m = v % 100;
      } else {
        h = parseInt(t, 10);
      }
      if (isNaN(h) || isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59 || (h === 24 && m > 0)) return -1;
      return h * 3600 + m * 60;
    },
    /** "10:00-16:00" / "10–16" -> [open, close] seconds, or null. */
    parseRange: function (s) {
      if (s == null) return null;
      var parts = String(s).trim().split(/\s*(?:-|\u2013|\u2014|til|to)\s*/);
      if (parts.length !== 2) return null;
      var a = Fmt.parseTime(parts[0]);
      var b = Fmt.parseTime(parts[1]);
      if (a < 0 || b <= a) return null;
      return [a, b];
    }
  };

  // ------------------------------------------------------------------ HTML to text

  var NAMED = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '\u2013', mdash: '\u2014',
    minus: '\u2212', hellip: '\u2026', laquo: '\u00ab', raquo: '\u00bb', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201c', rdquo: '\u201d', aring: '\u00e5', Aring: '\u00c5', oslash: '\u00f8', Oslash: '\u00d8',
    aelig: '\u00e6', AElig: '\u00c6', eacute: '\u00e9', Eacute: '\u00c9', egrave: '\u00e8', auml: '\u00e4',
    Auml: '\u00c4', ouml: '\u00f6', Ouml: '\u00d6', uuml: '\u00fc', Uuml: '\u00dc', szlig: '\u00df',
    bull: '\u2022', middot: '\u00b7', shy: '', times: '\u00d7', deg: '\u00b0', euro: '\u20ac',
    thinsp: ' ', ensp: ' ', emsp: ' ', zwj: '', zwnj: '', lrm: '', rlm: ''
  };
  var SPACES = /[ \t\x0B\f\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]+/g;

  var HtmlText = {
    decodeEntities: function (s) {
      if (!s || s.indexOf('&') < 0) return s || '';
      return s.replace(/&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,10});/g, function (all, ent) {
        if (ent.charAt(0) === '#') {
          var hex = ent.charAt(1) === 'x' || ent.charAt(1) === 'X';
          var cp = hex ? parseInt(ent.substring(2), 16) : parseInt(ent.substring(1), 10);
          if (cp === 0xA0) return ' ';
          if (cp > 0 && cp <= 0x10FFFF) return String.fromCodePoint(cp);
          return all;
        }
        return Object.prototype.hasOwnProperty.call(NAMED, ent) ? NAMED[ent] : all;
      });
    },
    /** Block tags and <br> become newlines; returns trimmed non-empty lines, each ending in "\n". */
    toText: function (html) {
      if (!html) return '';
      var s = html.replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
      s = s.replace(/<!--[\s\S]*?-->/g, ' ');
      s = s.replace(/<br\s*\/?\s*>/gi, '\n');
      s = s.replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|tr|td|th|table|tbody|thead|section|article|blockquote|figure|figcaption|header|footer|address|dl|dt|dd|hr|pre|nav|aside|main)(?:\s[^>]*)?\/?>/gi, '\n');
      s = s.replace(/<[^>]*>/g, '');
      s = HtmlText.decodeEntities(s).replace(/\r/g, '');
      var out = '';
      s.split('\n').forEach(function (line) {
        var t = line.replace(SPACES, ' ').trim();
        if (t) out += t + '\n';
      });
      return out;
    },
    inline: function (html) {
      if (html == null) return '';
      var s = HtmlText.decodeEntities(String(html).replace(/<[^>]*>/g, ' '));
      return s.replace(/[\n\r]/g, ' ').replace(SPACES, ' ').trim();
    }
  };

  // ------------------------------------------------------------------ market parsing

  function newMarket() {
    return {
      id: '', name: '', rawTitle: '', url: '', organizer: '', address: '', text: '', notes: [],
      open: [-1, -1], close: [-1, -1], hoursEdited: false, addressEdited: false,
      lat: NaN, lng: NaN, resolvedAddress: ''
    };
  }

  function isOpen(m, day) { return m.open[day] >= 0 && m.close[day] > m.open[day]; }
  function anyHours(m) { return isOpen(m, SAT) || isOpen(m, SUN); }
  function hasCoords(p) { return typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng); }
  function hoursText(m, day) { return isOpen(m, day) ? Fmt.time(m.open[day]) + '\u2013' + Fmt.time(m.close[day]) : ''; }

  var MONTHS = 'januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember' +
    '|sept|jan|feb|mar|apr|jun|jul|aug|sep|okt|nov|des';
  // The Java patterns start with a lookbehind; here the character before a match is checked by hand.
  var DATE = new RegExp('\\d{1,2}\\.?\\s*(?:(?:og|-|\u2013|\u2014|&|til)\\s*\\d{1,2}\\.?\\s*)?(?:' + MONTHS +
    ')\\.?(?![\\p{L}])(?:\\s*\\d{4})?', 'giu');
  var DAY = new RegExp('(l[\u00f8o]rdag(?:er|en)?|laurdag|l[\u00f8o]rd?\\.?|s[\u00f8o]ndag(?:er|en)?|sundag|s[\u00f8o]nd?\\.?' +
    '|fredag(?:en)?|fre\\.|mandag|tirsdag|onsdag|torsdag' +
    '|begge dag(?:er|ane|ene)|alle dag(?:er|ane|ene)|hele helgen|helgen|helga)(?![\\p{L}])', 'giu');
  var RANGE = new RegExp('(?:kl\\.?\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*' +
    '(?:-|\u2010|\u2011|\u2012|\u2013|\u2014|\u2015|\u2212|til|to)\\s*(?:kl\\.?\\s*)?(\\d{1,2})(?:[:.](\\d{2}))?(?!\\d)', 'giu');
  var POSTCODE = /\d{4}\s+\p{Lu}\p{L}+/gu;
  var CONNECTOR = /^(?:\s|,|&|\/|\+|:|;|\.|-|\u2013|og|and|samt)*$/iu;
  var TITLE_DATE = new RegExp('\\s*[-\u2013,:]?\\s+(?:l\u00f8rdag\\s+|s\u00f8ndag\\s+|helgen\\s+)?\\d{1,2}\\.?\\s*' +
    '(?:(?:og|-|\u2013|&)\\s*\\d{1,2}\\.?\\s*)?(?:' + MONTHS + ')(?![\\p{L}]).*$', 'iu');
  var NOT_AFTER_DATE = /[\d:]/;
  var NOT_AFTER_LETTER = /\p{L}/u;
  var NOT_AFTER_RANGE = /[\d.:,]/;
  var NOT_AFTER_DIGIT = /\d/;

  /** All matches of a global regex whose preceding character does not match {@code notAfter}. */
  function findAll(re, s, notAfter) {
    var out = [];
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > 0 && notAfter && notAfter.test(s.charAt(m.index - 1))) {
        re.lastIndex = m.index + 1;
        continue;
      }
      out.push(m);
      if (m[0].length === 0) re.lastIndex++;
    }
    return out;
  }

  function lines(text) {
    return text.split('\n').filter(function (l) { return l.length > 0; });
  }

  var SAT_BIT = 1;
  var SUN_BIT = 2;

  function isSideActivity(low) {
    return low.indexOf('auksjon') >= 0 || low.indexOf('levering') >= 0 || low.indexOf('henting') >= 0 ||
      low.indexOf('mottak') >= 0 || low.indexOf('rydding') >= 0 || low.indexOf('rigging') >= 0 ||
      low.indexOf('dugnad') >= 0;
  }

  function startsWith(s, p) { return s.lastIndexOf(p, 0) === 0; }
  function endsWith(s, p) { return s.length >= p.length && s.indexOf(p, s.length - p.length) >= 0; }

  function validRange(r) {
    var h1 = parseInt(r[1], 10);
    var m1 = r[2] != null ? parseInt(r[2], 10) : 0;
    var h2 = parseInt(r[3], 10);
    var m2 = r[4] != null ? parseInt(r[4], 10) : 0;
    var noMinutes = r[2] == null && r[4] == null;
    if (h1 > 23 || h2 > 24 || m1 > 59 || m2 > 59 || (h2 === 24 && m2 > 0)) return null;
    var s = h1 * 60 + m1;
    var e = h2 * 60 + m2;
    if (h1 < 6 || e - s < 30) return null;
    if (noMinutes && (h1 < 7 || h2 > 23)) return null;
    return [s * 60, e * 60];
  }

  function firstRange(s) {
    var all = findAll(RANGE, s, NOT_AFTER_RANGE);
    for (var i = 0; i < all.length; i++) {
      var v = validRange(all[i]);
      if (v) return v;
    }
    return null;
  }

  function allRanges(s) {
    var out = [];
    findAll(RANGE, s, NOT_AFTER_RANGE).forEach(function (r) {
      var v = validRange(r);
      if (!v) return;
      var dup = out.some(function (o) { return o[0] === v[0] && o[1] === v[1]; });
      if (!dup) out.push(v);
    });
    return out;
  }

  function dayKind(token) {
    var t = token.toLowerCase();
    if (startsWith(t, 'l\u00f8r') || startsWith(t, 'lor') || startsWith(t, 'laur')) return SAT_BIT;
    if (startsWith(t, 's\u00f8n') || startsWith(t, 'son') || startsWith(t, 'sun')) return SUN_BIT;
    if (startsWith(t, 'begge') || startsWith(t, 'alle') || startsWith(t, 'hele') || startsWith(t, 'helg')) {
      return SAT_BIT | SUN_BIT;
    }
    return 0;
  }

  function assign(m, kind, r) {
    var did = false;
    if ((kind & SAT_BIT) !== 0 && m.open[SAT] < 0) {
      m.open[SAT] = r[0];
      m.close[SAT] = r[1];
      did = true;
    }
    if ((kind & SUN_BIT) !== 0 && m.open[SUN] < 0) {
      m.open[SUN] = r[0];
      m.close[SUN] = r[1];
      did = true;
    }
    return did;
  }

  function removeDates(s) {
    var out = '';
    var pos = 0;
    findAll(DATE, s, NOT_AFTER_DATE).forEach(function (m) {
      out += s.substring(pos, m.index) + ' ';
      pos = m.index + m[0].length;
    });
    return out + s.substring(pos);
  }

  function applyHours(section, m) {
    var s = removeDates(section);
    var toks = findAll(DAY, s, NOT_AFTER_LETTER).map(function (d) {
      return [d.index, d.index + d[0].length, dayKind(d[1])];
    });
    var rs;
    if (toks.length === 0) {
      // "Åpningstider: 10–16" with no day names: the listing is for a weekend, so both days.
      rs = allRanges(s);
      return rs.length === 1 && assign(m, SAT_BIT | SUN_BIT, rs[0]);
    }
    var any = false;
    var pending = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      var end = i + 1 < toks.length ? toks[i + 1][0] : s.length;
      var seg = s.substring(t[1], end);
      var r = firstRange(seg);
      if (r) {
        any = assign(m, t[2] | pending, r) || any;
        pending = 0;
      } else {
        var low = seg.toLowerCase();
        if (low.indexOf('stengt') >= 0 || low.indexOf('lukket') >= 0 || low.indexOf('closed') >= 0) {
          pending = 0;
        } else if (CONNECTOR.test(seg.replace(/\d{1,2}\./g, ' '))) {
          // "Lørdag 10. og søndag 11. oktober: 10–15" -> both days share the time
          pending |= t[2];
        } else {
          pending = 0;
        }
      }
    }
    if (!any && pending !== 0) {
      // "Åpent 10–16 lørdag og søndag": the time comes before the day names.
      rs = allRanges(s.substring(0, toks[0][0]));
      if (rs.length === 1) any = assign(m, pending, rs[0]);
    }
    return any;
  }

  function hoursSection(text) {
    var ls = lines(text);
    for (var i = 0; i < ls.length; i++) {
      var low = ls[i].toLowerCase();
      if (low.indexOf('\u00e5pningstid') >= 0 || low.indexOf('apningstid') >= 0 || startsWith(low, '\u00e5pent') ||
          startsWith(low, 'tider')) {
        var out = '';
        for (var j = i; j < ls.length && j < i + 8; j++) {
          var ll = ls[j].toLowerCase();
          if (j > i && (startsWith(ll, 'adresse') || startsWith(ll, 'sted:') || startsWith(ll, 'nettside') ||
              startsWith(ll, 'facebook') || ll.indexOf('http') >= 0 || startsWith(ll, 'instagram'))) {
            break;
          }
          if (isSideActivity(ll)) continue;
          out += ls[j] + '\n';
        }
        return out;
      }
    }
    return null;
  }

  function parseHours(text, m) {
    var section = hoursSection(text);
    if (section != null && applyHours(section, m)) return true;
    var rest = '';
    lines(text).forEach(function (line) {
      if (!isSideActivity(line.toLowerCase())) rest += line + '\n';
    });
    return applyHours(rest, m);
  }

  function hasPostcode(s) { return findAll(POSTCODE, s, NOT_AFTER_DIGIT).length > 0; }

  function cleanAddress(a) {
    return a.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim().replace(/[,.;]+$/, '').trim();
  }

  function parseAddress(text) {
    var ls = lines(text);
    var i;
    for (i = 0; i < ls.length; i++) {
      var k = ls[i].toLowerCase().indexOf('adresse');
      if (k < 0 || k > 4) continue;
      var rest = ls[i].substring(k + 7).replace(/^[\s:.\-\u2013]+/, '').trim();
      if (rest.length > 3) return cleanAddress(rest);
      var sb = '';
      for (var j = i + 1; j < ls.length && j <= i + 2; j++) {
        var nl = ls[j].trim();
        var nlow = nl.toLowerCase();
        if (startsWith(nlow, 'nettside') || startsWith(nlow, 'facebook') || nlow.indexOf('http') >= 0 ||
            nlow.indexOf('\u00e5pningstid') >= 0 || startsWith(nlow, 'instagram')) {
          break;
        }
        if (sb) sb += ', ';
        sb += nl;
        if (hasPostcode(nl)) break;
      }
      if (sb.length > 3) return cleanAddress(sb);
    }
    for (i = 0; i < ls.length; i++) {
      var low = ls[i].toLowerCase();
      if (hasPostcode(ls[i]) && !endsWith(low, 'norge') && !endsWith(low, 'norway') &&
          findAll(DAY, ls[i], NOT_AFTER_LETTER).length === 0 && low.indexOf('\u00e5pningstid') < 0 &&
          low.indexOf('arrangerer') < 0) {
        return cleanAddress(ls[i]);
      }
    }
    for (i = 0; i < ls.length; i++) {
      var l2 = ls[i].toLowerCase().trim();
      if (endsWith(l2, 'norge') && ls[i].length > 12 && l2.indexOf('arrangerer') < 0) {
        return cleanAddress(ls[i].replace(/,?\s*norge\s*$/i, ''));
      }
    }
    return '';
  }

  function parseOrganizer(text) {
    var ls = lines(text);
    for (var i = 0; i < ls.length; i++) {
      var k = ls[i].indexOf(' arrangerer ');
      if (k > 2 && k < 90) return ls[i].substring(0, k).trim();
    }
    return '';
  }

  function parseNotes(text) {
    var out = [];
    var ls = lines(text);
    for (var i = 0; i < ls.length && out.length < 4; i++) {
      var l = ls[i];
      var low = l.toLowerCase();
      var note = low.indexOf('auksjon') >= 0 || startsWith(low, 'nb') || low.indexOf('vipps') >= 0 ||
        low.indexOf('kontant') >= 0 || low.indexOf('kun kort') >= 0 || low.indexOf('gratis inngang') >= 0;
      if (note && l.length <= 200 && out.indexOf(l.trim()) < 0) out.push(l.trim());
    }
    return out;
  }

  /** "Tåsen skole 10. og 11. oktober" -> "Tåsen skole". */
  function shortName(title) {
    if (title == null) return '';
    var t = title.trim();
    var mt = TITLE_DATE.exec(t);
    if (mt && mt.index >= 3) t = t.substring(0, mt.index).trim();
    t = t.replace(/^oslo\s*[:\-\u2013]\s*/i, '');
    return t ? t : title.trim();
  }

  var MarketParser = {
    parse: function (id, titleHtml, link, contentHtml) {
      var m = newMarket();
      m.id = id ? String(id) : (link || '');
      m.rawTitle = HtmlText.inline(titleHtml);
      m.name = shortName(m.rawTitle);
      m.url = link || '';
      m.text = HtmlText.toText(contentHtml);
      parseHours(m.text, m);
      m.address = parseAddress(m.text);
      m.organizer = parseOrganizer(m.text);
      m.notes = parseNotes(m.text);
      return m;
    },
    shortName: shortName,
    parseHours: parseHours,
    parseAddress: parseAddress
  };

  // ------------------------------------------------------------------ weekends

  var TWO_DAYS = new RegExp('(\\d{1,2})\\.?\\s*(?:(' + MONTHS + ')\\.?\\s+)?(?:og|-|\u2013|\u2014|&|til)\\s*(\\d{1,2})\\.?\\s*(' +
    MONTHS + ')\\.?\\s*(\\d{4})', 'iu');
  var ONE_DAY = new RegExp('(\\d{1,2})\\.?\\s*(' + MONTHS + ')\\.?\\s*(\\d{4})', 'iu');

  var WeekendFinder = {
    /** Saturday (yyyymmdd) of the weekend a category name refers to, or 0. */
    saturdayOf: function (name) {
      if (!name) return 0;
      var m = TWO_DAYS.exec(name);
      var a;
      if (m) {
        var d1 = parseInt(m[1], 10);
        var d2 = parseInt(m[3], 10);
        var m2 = Dates.monthFromName(m[4]);
        var m1 = m[2] != null ? Dates.monthFromName(m[2]) : m2;
        var y2 = parseInt(m[5], 10);
        var y1 = m1 > m2 ? y2 - 1 : y2;
        if (m1 === 0 || m2 === 0 || !Dates.isValid(y1, m1, d1) || !Dates.isValid(y2, m2, d2)) return 0;
        a = Dates.of(y1, m1, d1);
        var b = Dates.of(y2, m2, d2);
        if (Dates.dayOfWeek(a) === 6) return a;
        if (Dates.dayOfWeek(b) === 7) return Dates.addDays(b, -1);
        if (Dates.dayOfWeek(b) === 6) return b;
        if (Dates.dayOfWeek(a) === 7) return Dates.addDays(a, -1);
        return 0;
      }
      m = ONE_DAY.exec(name);
      if (m) {
        var mo = Dates.monthFromName(m[2]);
        var y = parseInt(m[3], 10);
        var d = parseInt(m[1], 10);
        if (mo === 0 || !Dates.isValid(y, mo, d)) return 0;
        a = Dates.of(y, mo, d);
        if (Dates.dayOfWeek(a) === 6) return a;
        if (Dates.dayOfWeek(a) === 7) return Dates.addDays(a, -1);
      }
      return 0;
    },
    /** categories: [{id, name, count}] -> weekends [{saturday, ids, count}] from fromSaturday on, earliest first. */
    group: function (cats, fromSaturday) {
      var out = [];
      cats.forEach(function (c) {
        var sat = WeekendFinder.saturdayOf(c.name);
        if (sat === 0 || sat < fromSaturday || c.count === 0) return;
        var w = null;
        out.forEach(function (o) { if (o.saturday === sat) w = o; });
        if (!w) {
          w = { saturday: sat, ids: [], count: 0 };
          out.push(w);
        }
        w.ids.push(c.id);
        w.count += Math.max(0, c.count);
      });
      out.sort(function (a, b) { return a.saturday - b.saturday; });
      return out;
    },
    pick: function (weekends, target) {
      var i;
      for (i = 0; i < weekends.length; i++) if (weekends[i].saturday === target) return weekends[i];
      for (i = 0; i < weekends.length; i++) if (weekends[i].saturday > target) return weekends[i];
      return null;
    }
  };

  // ------------------------------------------------------------------ solver
  //
  // Travelling salesman with time windows over two days that may not share markets.
  // Node 0 is the start; market i is node i + 1. travel[i][j] is seconds, -1 = no route.
  // Per day: breadth-first search by number of stops, keeping for each (set, last market) the
  // Pareto front of (begin time, travel time). The days are then combined exactly.
  // Market sets are bit masks in a JS integer, so at most 30 markets.

  var COUNT_W = 1e9;
  var FULL_W = 1e6;
  var MUST_W = 1e12;
  var MAX_MARKETS = 30;

  var Solver = {
    COUNT_W: COUNT_W, FULL_W: FULL_W, MUST_W: MUST_W, MAX_MARKETS: MAX_MARKETS,
    labelLimit: 250000,
    sosLimit: 20,

    problem: function (n) {
      var p = {
        n: n, travel: [], open: [[], []], close: [[], []], departure: [-1, -1],
        must: [[], []], service: 3600, minLast: 1200
      };
      for (var i = 0; i <= n; i++) {
        p.travel.push([]);
        for (var j = 0; j <= n; j++) p.travel[i].push(0);
      }
      for (var d = 0; d < 2; d++) {
        for (var k = 0; k < n; k++) {
          p.open[d].push(-1);
          p.close[d].push(-1);
          p.must[d].push(false);
        }
      }
      return p;
    },

    usable: function (p, d, i) {
      return p.departure[d] >= 0 && p.open[d][i] >= 0 && p.close[d][i] > p.open[d][i];
    },

    value: function (p, d, l) {
      if (!l) return 0;
      var full = l.begin + p.service <= p.close[d][l.last];
      return l.count * COUNT_W + (full ? FULL_W : 0) - l.travel;
    },

    /** The day's value plus a bonus per must-visit market on the route (see the Android Solver). */
    weekendValue: function (p, d, l) {
      if (!l) return 0;
      var v = Solver.value(p, d, l);
      for (var i = 0; i < p.n; i++) {
        if (p.must[d][i] && (l.mask & (1 << i)) !== 0) v += MUST_W;
      }
      return v;
    },

    /** Best label (route) for every set of markets that can be visited on day d: Map mask -> label. */
    enumerateDay: function (p, d, exact) {
      var best = new Map();
      if (p.departure[d] < 0) return best;
      var n = p.n;
      var level = new Map();
      var j, t, b;

      function insert(map, l) {
        var key = l.mask * 32 + l.last;
        var list = map.get(key);
        if (!list) {
          map.set(key, [l]);
          return;
        }
        var i;
        for (i = 0; i < list.length; i++) {
          if (list[i].begin <= l.begin && list[i].travel <= l.travel) return;
        }
        for (i = list.length - 1; i >= 0; i--) {
          if (l.begin <= list[i].begin && l.travel <= list[i].travel) list.splice(i, 1);
        }
        list.push(l);
      }

      for (j = 0; j < n; j++) {
        if (!Solver.usable(p, d, j)) continue;
        t = p.travel[0][j + 1];
        if (t < 0) continue;
        b = Math.max(p.departure[d] + t, p.open[d][j]);
        if (b + p.minLast <= p.close[d][j]) {
          insert(level, { mask: 1 << j, last: j, begin: b, travel: t, count: 1, parent: null });
        }
      }
      while (level.size > 0) {
        var next = new Map();
        var size = 0;
        level.forEach(function (list) {
          for (var x = 0; x < list.length; x++) {
            var l = list[x];
            var cur = best.get(l.mask);
            if (!cur || Solver.value(p, d, l) > Solver.value(p, d, cur)) best.set(l.mask, l);
            var free = l.begin + p.service;
            if (free > p.close[d][l.last]) continue; // only allowed as the last stop
            for (var q = 0; q < n; q++) {
              if ((l.mask & (1 << q)) !== 0 || !Solver.usable(p, d, q)) continue;
              var tt = p.travel[l.last + 1][q + 1];
              if (tt < 0) continue;
              var bb = Math.max(free + tt, p.open[d][q]);
              if (bb + p.minLast > p.close[d][q]) continue;
              insert(next, { mask: l.mask | (1 << q), last: q, begin: bb, travel: l.travel + tt, count: l.count + 1, parent: l });
            }
          }
        });
        next.forEach(function (list) { size += list.length; });
        if (size > Solver.labelLimit) {
          var all = [];
          next.forEach(function (list) { all = all.concat(list); });
          all.sort(function (a, c) { return a.begin !== c.begin ? a.begin - c.begin : a.travel - c.travel; });
          next = new Map();
          for (var k = 0; k < Solver.labelLimit && k < all.length; k++) insert(next, all[k]);
          exact.value = false;
        }
        level = next;
      }
      return best;
    },

    route: function (p, d, l) {
      if (!l) return { order: [], travel: 0, lastFull: false };
      var order = [];
      for (var x = l; x; x = x.parent) order.unshift(x.last);
      return { order: order, travel: l.travel, lastFull: l.begin + p.service <= p.close[d][l.last] };
    },

    solve: function (p) {
      if (p.n > MAX_MARKETS) throw new Error('Too many markets: ' + p.n);
      var exact = { value: true };
      var sat = Solver.enumerateDay(p, SAT, exact);
      var sun = Solver.enumerateDay(p, SUN, exact);
      var bestA = 0;
      var bestB = 0;
      var bestVal;
      if (p.n <= Solver.sosLimit) {
        var size = 1 << p.n;
        var bv = new Float64Array(size); // best Sunday value using only markets in the subset
        var bm = new Int32Array(size);
        sun.forEach(function (l, mask) {
          var v = Solver.weekendValue(p, SUN, l);
          if (v > bv[mask]) {
            bv[mask] = v;
            bm[mask] = mask;
          }
        });
        for (var bit = 0; bit < p.n; bit++) {
          var b = 1 << bit;
          for (var m = 0; m < size; m++) {
            if ((m & b) !== 0 && bv[m ^ b] > bv[m]) {
              bv[m] = bv[m ^ b];
              bm[m] = bm[m ^ b];
            }
          }
        }
        var full = size - 1;
        bestVal = bv[full];
        bestB = bm[full];
        sat.forEach(function (l, a) {
          var v = Solver.weekendValue(p, SAT, l) + bv[full & ~a];
          if (v > bestVal) {
            bestVal = v;
            bestA = a;
            bestB = bm[full & ~a];
          }
        });
      } else {
        var options = function (d, map) {
          var out = [{ mask: 0, value: 0 }];
          map.forEach(function (l, mask) { out.push({ mask: mask, value: Solver.weekendValue(p, d, l) }); });
          out.sort(function (x, y) { return y.value - x.value; });
          return out;
        };
        var so = options(SAT, sat);
        var su = options(SUN, sun);
        bestVal = -1;
        for (var i = 0; i < so.length; i++) {
          if (so[i].value + su[0].value <= bestVal) break;
          for (var j = 0; j < su.length; j++) {
            var tot = so[i].value + su[j].value;
            if (tot <= bestVal) break;
            if ((so[i].mask & su[j].mask) === 0) {
              bestVal = tot;
              bestA = so[i].mask;
              bestB = su[j].mask;
              break;
            }
          }
        }
      }
      return {
        exact: exact.value,
        value: bestVal,
        days: [Solver.route(p, SAT, bestA === 0 ? null : sat.get(bestA)),
          Solver.route(p, SUN, bestB === 0 ? null : sun.get(bestB))]
      };
    },

    /** Recomputes times along a fixed route (also used to check feasibility). */
    schedule: function (p, d, order) {
      var m = order.length;
      var s = { arrive: [], begin: [], leave: [], latestLeave: [], leg: [], leaveStart: 0, latestLeaveStart: 0 };
      s.feasible = p.departure[d] >= 0 || m === 0;
      var t = Math.max(0, p.departure[d]);
      var prev = 0;
      var k, i;
      for (k = 0; k < m; k++) {
        i = order[k];
        var leg = p.travel[prev][i + 1];
        if (leg < 0 || !Solver.usable(p, d, i)) s.feasible = false;
        leg = Math.max(0, leg);
        s.leg.push(leg);
        s.arrive.push(t + leg);
        s.begin.push(Math.max(t + leg, p.open[d][i]));
        var last = k === m - 1;
        if (s.begin[k] + (last ? p.minLast : p.service) > p.close[d][i]) s.feasible = false;
        s.leave.push(last ? Math.min(p.close[d][i], s.begin[k] + p.service) : s.begin[k] + p.service);
        t = s.leave[k];
        prev = i + 1;
      }
      if (m > 0) {
        var lb = []; // latest possible start of each visit
        lb[m - 1] = p.close[d][order[m - 1]] - p.minLast;
        for (k = m - 2; k >= 0; k--) {
          lb[k] = Math.min(p.close[d][order[k]] - p.service, lb[k + 1] - s.leg[k + 1] - p.service);
        }
        for (k = 0; k < m - 1; k++) s.latestLeave[k] = lb[k + 1] - s.leg[k + 1];
        s.latestLeave[m - 1] = p.close[d][order[m - 1]];
        s.latestLeaveStart = lb[0] - s.leg[0];
        // Leave home so you arrive right at opening instead of waiting outside.
        s.leaveStart = Math.max(p.departure[d], s.begin[0] - s.leg[0]);
      } else {
        s.leaveStart = p.departure[d];
        s.latestLeaveStart = p.departure[d];
      }
      return s;
    },

    /** Value of one day's route under the objective, or -1 if infeasible (used by tests). */
    dayValue: function (p, d, order) {
      if (order.length === 0) return 0;
      var s = Solver.schedule(p, d, order);
      if (!s.feasible) return -1;
      var travel = 0;
      s.leg.forEach(function (x) { travel += x; });
      var last = order[order.length - 1];
      var full = s.begin[order.length - 1] + p.service <= p.close[d][last];
      return order.length * COUNT_W + (full ? FULL_W : 0) - travel;
    }
  };

  // ------------------------------------------------------------------ plan building

  var PlanBuilder = {
    defaults: function () {
      return { service: 3600, minLast: 1200, bikePct: 100, legBuffer: 120, departure: [9 * 3600, 9 * 3600], planDay: [true, true] };
    },

    /** Departure per day (-1 = not planned) and why a day is skipped: '', 'disabled' or 'past'. */
    dayStatus: function (saturday, today, nowSec, s) {
      var dep = [-1, -1];
      var skip = ['', ''];
      for (var d = 0; d < 2; d++) {
        var date = Dates.addDays(saturday, d);
        if (!s.planDay[d]) skip[d] = 'disabled';
        else if (today > date) skip[d] = 'past';
        else {
          var base = s.departure[d];
          if (today === date) base = Math.max(base, Math.floor((nowSec + 59) / 60) * 60);
          dep[d] = base;
        }
      }
      return { dep: dep, skip: skip };
    },

    /** Great-circle distance in km. */
    km: function (lat1, lng1, lat2, lng2) {
      var rad = Math.PI / 180;
      var dLat = (lat2 - lat1) * rad;
      var dLng = (lng2 - lng1) * rad;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * 6371.0 * Math.asin(Math.min(1, Math.sqrt(a)));
    },

    /** Straight-line fallback when Google has no bike time: 35 % detour at 15 km/h -> [seconds, meters]. */
    estimate: function (lat1, lng1, lat2, lng2) {
      var road = PlanBuilder.km(lat1, lng1, lat2, lng2) * 1.35;
      return [Math.round(road / 15.0 * 3600), Math.round(road * 1000)];
    },

    /**
     * cands: markets (index i is matrix node i + 1; node 0 is the start).
     * mx[from][to] = [seconds, meters] or null; est[from][to] = true for straight-line estimates.
     * must = [idsForSaturday, idsForSunday] (arrays), markets that have to be on that day if they fit at all.
     */
    build: function (saturday, cands, mx, est, s, dep, skip, must) {
      var n = cands.length;
      var p = Solver.problem(n);
      p.service = s.service;
      p.minLast = Math.min(s.minLast, s.service);
      var i, j, d;
      for (i = 0; i <= n; i++) {
        for (j = 0; j <= n; j++) {
          if (i === j) p.travel[i][j] = 0;
          else if (!mx[i][j] || mx[i][j][0] < 0) p.travel[i][j] = -1;
          else p.travel[i][j] = Math.ceil(mx[i][j][0] * s.bikePct / 100.0) + s.legBuffer;
        }
      }
      for (d = 0; d < 2; d++) {
        p.departure[d] = dep[d];
        for (i = 0; i < n; i++) {
          var m = cands[i];
          p.open[d][i] = isOpen(m, d) ? m.open[d] : -1;
          p.close[d][i] = isOpen(m, d) ? m.close[d] : -1;
          p.must[d][i] = !!(must && must[d] && must[d].indexOf(m.id) >= 0);
        }
      }
      var sol = Solver.solve(p);
      var plan = {
        saturday: saturday, createdAt: Date.now(), exact: sol.exact, candidates: n, estimatedLegs: false,
        startLabel: '', startLat: NaN, startLng: NaN, startAddress: '', warnings: [], days: []
      };
      for (d = 0; d < 2; d++) {
        var dp = { day: d, skipped: skip[d], departure: dep[d], openCount: 0, travelSec: 0, distanceM: 0, stops: [] };
        if (dep[d] >= 0) cands.forEach(function (c) { if (isOpen(c, d)) dp.openCount++; });
        var order = sol.days[d].order;
        var sc = Solver.schedule(p, d, order);
        dp.leaveStart = sc.leaveStart;
        dp.latestLeaveStart = sc.latestLeaveStart;
        var prev = 0;
        for (var k = 0; k < order.length; k++) {
          var node = order[k] + 1;
          var c = cands[order[k]];
          var e = mx[prev][node];
          var st = {
            marketId: c.id, name: c.name, address: c.address, lat: c.lat, lng: c.lng,
            arrive: sc.arrive[k], begin: sc.begin[k], leave: sc.leave[k], latestLeave: sc.latestLeave[k],
            open: c.open[d], close: c.close[d], legSec: sc.leg[k], legMeters: e ? e[1] : -1,
            legEstimated: !!(est && est[prev][node])
          };
          if (st.legEstimated) plan.estimatedLegs = true;
          dp.travelSec += st.legSec;
          dp.distanceM += Math.max(0, st.legMeters);
          dp.stops.push(st);
          prev = node;
        }
        plan.days.push(dp);
      }
      return plan;
    },

    /** [day, position (1-based)] of a market in the plan, or null. */
    find: function (plan, marketId) {
      for (var d = 0; d < 2; d++) {
        var stops = plan.days[d].stops;
        for (var i = 0; i < stops.length; i++) if (stops[i].marketId === marketId) return [d, i + 1];
      }
      return null;
    }
  };

  // ------------------------------------------------------------------ Google Maps links

  var MapsLinks = {
    DIR: 'https://www.google.com/maps/dir/?api=1&travelmode=bicycling',
    MAX_WAYPOINTS: 9,
    point: function (lat, lng, address) {
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return lat.toFixed(6) + ',' + lng.toFixed(6);
      }
      return address || '';
    },
    stopPoint: function (s) { return MapsLinks.point(s.lat, s.lng, s.address ? s.address : s.name + ', Oslo'); },
    /** One day as a bike route with every stop: start as origin, last stop as destination. */
    dayRoute: function (plan, d) {
      var stops = d.stops;
      if (stops.length === 0) return '';
      var n = Math.min(stops.length, MapsLinks.MAX_WAYPOINTS + 1);
      var u = MapsLinks.DIR;
      var origin = MapsLinks.point(plan.startLat, plan.startLng, plan.startAddress);
      if (origin) u += '&origin=' + encodeURIComponent(origin);
      u += '&destination=' + encodeURIComponent(MapsLinks.stopPoint(stops[n - 1]));
      var wp = [];
      for (var i = 0; i < n - 1; i++) wp.push(MapsLinks.stopPoint(stops[i]));
      if (wp.length) u += '&waypoints=' + encodeURIComponent(wp.join('|'));
      return u;
    },
    directionsTo: function (dest) { return MapsLinks.DIR + '&destination=' + encodeURIComponent(dest); }
  };

  var api = {
    SAT: SAT, SUN: SUN, Dates: Dates, Fmt: Fmt, HtmlText: HtmlText, MarketParser: MarketParser,
    WeekendFinder: WeekendFinder, Solver: Solver, PlanBuilder: PlanBuilder, MapsLinks: MapsLinks,
    newMarket: newMarket, isOpen: isOpen, anyHours: anyHours, hasCoords: hasCoords, hoursText: hoursText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
