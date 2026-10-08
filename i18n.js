// Ride at Dawn: user-facing text. Norwegian when the browser prefers it, otherwise English.
// T('key', a, b) fills {0}, {1} ...
(function (root) {
  'use strict';

  var en = {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    hour_unit: 'h', decimal: '.',
    date: '{0} {1}', range_same: '{0}–{1} {2}', range_two: '{0} – {1}',
    weekend: 'Weekend {0}', weekend_option: '{0} ({1})',
    saturday: 'Saturday', sunday: 'Sunday', saturday_in: 'Saturday', sunday_in: 'Sunday',
    tab_day: '{0} {1}', tab_all: 'All markets',
    refresh: 'Fetch the market data again', settings: 'Settings',
    n_markets_1: '1 market', n_markets: '{0} markets',
    plan_route: 'Plan route', plan_again: 'Plan again',
    start_line_location: 'Start: where I am when I plan', start_line_address: 'Start: {0}',
    start_title: 'Where do you start?', start_hint: 'Street and number, Oslo',
    start_help: 'Used for both days. Leave it empty to start from where you are when you plan.',
    start_use_location: 'Use my location', save: 'Save', cancel: 'Cancel', close: 'Close',
    loading: 'Loading markets…', load_failed: 'Could not fetch the market data ({0}).', try_again: 'Try again',
    no_weekends: 'No upcoming weekends with markets in the data. It may need an update.',
    other_weekend: 'No markets listed for the coming weekend, so this is the next one that has any.',
    empty_title: 'No route yet',
    empty_body: '{0} open on {1}. Plan the route to fit in as many as you can by bike, with {2} minutes at each.',
    day_none_title: 'Nothing planned',
    day_past: '{0} is over.', day_disabled: 'You turned off planning for {0} in Settings.',
    day_none_open: 'No markets left that are open on {0}.',
    day_none_fit: 'No more markets can be reached on {0} when starting at {1}.',
    cycling: '{0} of cycling, {1}', cycling_no_distance: '{0} of cycling',
    summary_times: 'Leave at {0}. Last stop until {1}.',
    open_in_maps: 'Open route in Google Maps', share: 'Share', copied: 'Copied', map_alt: 'Map of the route', map_credit: 'Map \u00a9',
    start_from_location: 'Leave from your location', start_from_address: 'Leave from {0}',
    start_latest: 'Leave by {0} at the latest',
    leg: '{0} by bike, {1}', leg_no_distance: '{0} by bike', leg_estimated: 'About {0} by bike (estimate)',
    open_hours: 'Open {0}', wait: 'You arrive at {0} and wait {1} for opening.',
    leave_by: 'Leave by {0} at the latest to keep the plan.',
    last_short: 'Last stop: {0} here before it closes at {1}.', last_full: 'Last stop: stay until it closes at {0}.',
    navigate: 'Navigate', visited: 'Visited', skip: 'Skip', must_sat: 'Must on Saturday', must_sun: 'Must on Sunday',
    markets_intro: 'Markets you tick as visited are left out when you plan again. Skipped markets are never planned. A must is put on that day’s route first, before the rest is fitted in.',
    in_plan: '{0}, stop {1}', not_in_plan: 'Not in the plan',
    hours_day: '{0} {1}', closed_day: '{0} closed', hours_missing: 'Opening hours not found. Tap Edit to type them in.',
    address_missing: 'Address not found. Tap Edit to type it in.', edited: 'Edited by you',
    edit: 'Edit', web_page: 'Web page', edit_title: 'Edit {0}', edit_sat: 'Saturday hours', edit_sun: 'Sunday hours',
    edit_hours_hint: '10:00-16:00, empty = closed', edit_address: 'Address', use_web_page: 'Use the web page’s',
    invalid_hours: 'Write hours like 10:00-16:00, or leave the field empty for closed.',
    footer_exact: 'Bike times between markets are from Google Maps, fetched {0}. Rides from your start are estimates. Planned {1}.',
    footer_inexact: 'Bike times between markets are from Google Maps, fetched {0}. Rides from your start are estimates. Planned {1}. Many markets, so the plan may not be the very best.',
    stale: 'Your marks or settings changed since this plan was made.',
    status_locating: 'Finding your position…', status_addresses: 'Looking up addresses\u2026', status_solving: 'Finding the best route…',
    your_location: 'Your location',
    err_no_days: 'Both days are over or turned off, so there is nothing to plan.',
    err_nothing: 'No markets left to plan: all are visited, skipped or closed.',
    err_network: 'Could not reach {0}. Check your connection and try again.',
    err_location: 'Could not get your position ({0}). Type a start address instead.', err_address: 'Could not find the address \u201c{0}\u201d. Try street and number, for example Storgata 1, Oslo.',
    warn_hours_missing: 'Left out because the opening hours are unknown: {0}.',
    warn_too_many: 'Too many markets for one plan, so only the first {0} were considered.',
    warn_no_location: 'No address for {0}, so it was left out.',
    warn_must_missed: 'Could not fit on {0} even though you marked it as a must: {1}.',
    auto_visited: 'Saturday’s {0} planned stops were marked as visited. Untick any you skipped under All markets.',
    s_days: 'Days and times', s_leave_sat: 'Leave no earlier than, Saturday', s_leave_sun: 'Leave no earlier than, Sunday',
    s_plan_sat: 'Plan Saturday', s_plan_sun: 'Plan Sunday',
    s_visits: 'Visits', s_service: 'Minutes at each market', s_min_last: 'Minutes needed at the last market of the day',
    s_cycling: 'Cycling', s_bike_pct: 'Bike time in % of Google’s estimate', s_buffer: 'Extra minutes per ride (parking, locking)',
    s_map: 'Show a map of each day\u2019s route'
  };

  var nb = {
    months: ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'],
    hour_unit: 't', decimal: ',',
    date: '{0}. {1}', range_same: '{0}.–{1}. {2}', range_two: '{0} – {1}',
    weekend: 'Helgen {0}', weekend_option: '{0} ({1})',
    saturday: 'Lørdag', sunday: 'Søndag', saturday_in: 'lørdag', sunday_in: 'søndag',
    tab_day: '{0} {1}.', tab_all: 'Alle markeder',
    refresh: 'Hent markedsdata p\u00e5 nytt', settings: 'Innstillinger',
    n_markets_1: '1 marked', n_markets: '{0} markeder',
    plan_route: 'Planlegg ruten', plan_again: 'Planlegg på nytt',
    start_line_location: 'Start: der jeg er når jeg planlegger', start_line_address: 'Start: {0}',
    start_title: 'Hvor starter du?', start_hint: 'Gate og nummer, Oslo',
    start_help: 'Brukes begge dager. La feltet stå tomt for å starte der du er når du planlegger.',
    start_use_location: 'Bruk posisjonen min', save: 'Lagre', cancel: 'Avbryt', close: 'Lukk',
    loading: 'Henter markeder…', load_failed: 'Fikk ikke hentet markedsdata ({0}).', try_again: 'Prøv igjen',
    no_weekends: 'Ingen kommende helger med markeder i dataene. De trenger kanskje en oppdatering.',
    other_weekend: 'Ingen markeder er lagt ut for kommende helg, så dette er den neste som har noen.',
    empty_title: 'Ingen rute ennå',
    empty_body: '{0} har åpent {1}. Planlegg ruten for å rekke flest mulig på sykkel, med {2} minutter på hvert.',
    day_none_title: 'Ingenting planlagt',
    day_past: '{0} er over.', day_disabled: 'Du har slått av planlegging for {0} i Innstillinger.',
    day_none_open: 'Ingen markeder igjen som har åpent {0}.',
    day_none_fit: 'Ingen flere markeder rekkes {0} med start {1}.',
    cycling: '{0} på sykkel, {1}', cycling_no_distance: '{0} på sykkel',
    summary_times: 'Dra {0}. Siste stopp til {1}.',
    open_in_maps: 'Åpne ruten i Google Maps', share: 'Del', copied: 'Kopiert', map_alt: 'Kart over ruten', map_credit: 'Kart \u00a9',
    start_from_location: 'Dra fra der du er', start_from_address: 'Dra fra {0}',
    start_latest: 'Dra senest {0}',
    leg: '{0} på sykkel, {1}', leg_no_distance: '{0} på sykkel', leg_estimated: 'Omtrent {0} p\u00e5 sykkel (anslag)',
    open_hours: 'Åpent {0}', wait: 'Du er fremme {0} og venter {1} til det åpner.',
    leave_by: 'Dra senest {0} for å holde planen.',
    last_short: 'Siste stopp: {0} her før det stenger {1}.', last_full: 'Siste stopp: bli til det stenger {0}.',
    navigate: 'Naviger', visited: 'Besøkt', skip: 'Hopp over', must_sat: 'Må med lørdag', must_sun: 'Må med søndag',
    markets_intro: 'Markeder du huker av som besøkt, blir ikke med når du planlegger på nytt. Markeder du hopper over, planlegges aldri. Et må legges inn på den dagens rute først, før resten fylles på.',
    in_plan: '{0}, stopp {1}', not_in_plan: 'Ikke med i planen',
    hours_day: '{0} {1}', closed_day: '{0} stengt', hours_missing: 'Fant ikke åpningstider. Trykk Rediger for å skrive dem inn.',
    address_missing: 'Fant ikke adresse. Trykk Rediger for å skrive den inn.', edited: 'Endret av deg',
    edit: 'Rediger', web_page: 'Nettside', edit_title: 'Rediger {0}', edit_sat: 'Åpningstid lørdag', edit_sun: 'Åpningstid søndag',
    edit_hours_hint: '10:00-16:00, tomt = stengt', edit_address: 'Adresse', use_web_page: 'Bruk nettsidens',
    invalid_hours: 'Skriv tider som 10:00-16:00, eller la feltet stå tomt for stengt.',
    footer_exact: 'Sykkeltidene mellom markedene er fra Google Maps, hentet {0}. Turer fra startpunktet ditt er anslag. Planlagt {1}.',
    footer_inexact: 'Sykkeltidene mellom markedene er fra Google Maps, hentet {0}. Turer fra startpunktet ditt er anslag. Planlagt {1}. Mange markeder, s\u00e5 planen er kanskje ikke den aller beste.',
    stale: 'Avhukinger eller innstillinger er endret siden planen ble laget.',
    status_locating: 'Finner posisjonen din…', status_addresses: 'Sl\u00e5r opp adresser\u2026', status_solving: 'Finner den beste ruten…',
    your_location: 'Din posisjon',
    err_no_days: 'Begge dagene er over eller slått av, så det er ingenting å planlegge.',
    err_nothing: 'Ingen markeder igjen å planlegge: alle er besøkt, hoppet over eller stengt.',
    err_network: 'Fikk ikke kontakt med {0}. Sjekk nettforbindelsen og prøv igjen.',
    err_location: 'Fikk ikke posisjonen din ({0}). Skriv inn en startadresse i stedet.', err_address: 'Fant ikke adressen \u00ab{0}\u00bb. Pr\u00f8v gate og nummer, for eksempel Storgata 1, Oslo.',
    warn_hours_missing: 'Utelatt fordi åpningstidene er ukjente: {0}.',
    warn_too_many: 'For mange markeder for én plan, så bare de {0} første ble vurdert.',
    warn_no_location: 'Ingen adresse for {0}, så det ble utelatt.',
    warn_must_missed: 'Rakk ikke å få med på {0}, selv om du markerte det som et må: {1}.',
    auto_visited: 'Lørdagens {0} planlagte stopp er merket som besøkt. Fjern haken under Alle markeder for dem du hoppet over.',
    s_days: 'Dager og tider', s_leave_sat: 'Dra tidligst, lørdag', s_leave_sun: 'Dra tidligst, søndag',
    s_plan_sat: 'Planlegg lørdag', s_plan_sun: 'Planlegg søndag',
    s_visits: 'Besøk', s_service: 'Minutter på hvert marked', s_min_last: 'Minutter som trengs på dagens siste marked',
    s_cycling: 'Sykling', s_bike_pct: 'Sykkeltid i % av Googles anslag', s_buffer: 'Ekstra minutter per tur (parkering, låsing)',
    s_map: 'Vis kart over ruten for hver dag'
  };

  var lang = (root.navigator && root.navigator.language || 'nb').toLowerCase();
  var norwegian = /^(nb|nn|no)\b/.test(lang);
  var dict = norwegian ? nb : en;

  function T(key) {
    var s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : en[key];
    if (s == null) return key;
    var args = arguments;
    return String(s).replace(/\{(\d)\}/g, function (all, i) {
      var v = args[Number(i) + 1];
      return v == null ? '' : v;
    });
  }
  T.months = dict.months;
  T.lang = norwegian ? 'nb' : 'en';
  root.T = T;
})(typeof self !== 'undefined' ? self : this);
