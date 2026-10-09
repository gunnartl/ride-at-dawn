// Ride at Dawn: user-facing text in Norwegian, English, German, Danish and Latin.
// The language is the one chosen in Settings, otherwise the browser's, otherwise English.
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
    s_map: 'Show a map of each day\u2019s route', s_language: 'Language'
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
    s_map: 'Vis kart over ruten for hver dag', s_language: 'Språk'
  };

  var de = {
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    hour_unit: 'Std.', decimal: ',',
    date: '{0}. {1}', range_same: '{0}.–{1}. {2}', range_two: '{0} – {1}',
    weekend: 'Wochenende {0}', weekend_option: '{0} ({1})',
    saturday: 'Samstag', sunday: 'Sonntag', saturday_in: 'Samstag', sunday_in: 'Sonntag',
    tab_day: '{0} {1}.', tab_all: 'Alle Märkte',
    refresh: 'Marktdaten neu laden', settings: 'Einstellungen',
    n_markets_1: '1 Markt', n_markets: '{0} Märkte',
    plan_route: 'Route planen', plan_again: 'Neu planen',
    start_line_location: 'Start: wo ich beim Planen bin', start_line_address: 'Start: {0}',
    start_title: 'Wo startest du?', start_hint: 'Straße und Hausnummer, Oslo',
    start_help: 'Gilt für beide Tage. Leer lassen, um dort zu starten, wo du beim Planen bist.',
    start_use_location: 'Meinen Standort verwenden', save: 'Speichern', cancel: 'Abbrechen', close: 'Schließen',
    loading: 'Märkte werden geladen…', load_failed: 'Die Marktdaten konnten nicht geladen werden ({0}).', try_again: 'Erneut versuchen',
    no_weekends: 'Keine kommenden Wochenenden mit Märkten in den Daten. Vielleicht müssen sie aktualisiert werden.',
    other_weekend: 'Für das kommende Wochenende sind keine Märkte eingetragen. Dies ist das nächste mit Märkten.',
    empty_title: 'Noch keine Route',
    empty_body: 'Am {1} geöffnet: {0}. Plane die Route, um mit dem Rad möglichst viele zu schaffen, mit {2} Minuten pro Markt.',
    day_none_title: 'Nichts geplant',
    day_past: '{0} ist vorbei.', day_disabled: 'Du hast die Planung für {0} in den Einstellungen ausgeschaltet.',
    day_none_open: 'Keine Märkte mehr, die am {0} geöffnet haben.',
    day_none_fit: 'Am {0} sind mit Start um {1} keine weiteren Märkte erreichbar.',
    cycling: '{0} auf dem Rad, {1}', cycling_no_distance: '{0} auf dem Rad',
    summary_times: 'Abfahrt {0}. Letzter Halt bis {1}.',
    open_in_maps: 'Route in Google Maps öffnen', share: 'Teilen', copied: 'Kopiert', map_alt: 'Karte der Route', map_credit: 'Karte ©',
    start_from_location: 'Abfahrt von deinem Standort', start_from_address: 'Abfahrt von {0}',
    start_latest: 'Spätestens um {0} losfahren',
    leg: '{0} mit dem Rad, {1}', leg_no_distance: '{0} mit dem Rad', leg_estimated: 'Etwa {0} mit dem Rad (Schätzung)',
    open_hours: 'Geöffnet {0}', wait: 'Du kommst um {0} an und wartest {1} bis zur Öffnung.',
    leave_by: 'Spätestens um {0} losfahren, damit der Plan hält.',
    last_short: 'Letzter Halt: {0} hier, bevor um {1} geschlossen wird.', last_full: 'Letzter Halt: bleib, bis um {0} geschlossen wird.',
    navigate: 'Navigieren', visited: 'Besucht', skip: 'Auslassen', must_sat: 'Muss am Samstag', must_sun: 'Muss am Sonntag',
    markets_intro: 'Als besucht markierte Märkte werden beim nächsten Planen weggelassen. Ausgelassene Märkte werden nie eingeplant. Ein Muss kommt zuerst auf die Route des Tages, danach wird der Rest eingepasst.',
    in_plan: '{0}, Halt {1}', not_in_plan: 'Nicht im Plan',
    hours_day: '{0} {1}', closed_day: '{0} geschlossen', hours_missing: 'Öffnungszeiten nicht gefunden. Tippe auf Bearbeiten, um sie einzutragen.',
    address_missing: 'Adresse nicht gefunden. Tippe auf Bearbeiten, um sie einzutragen.', edited: 'Von dir geändert',
    edit: 'Bearbeiten', web_page: 'Webseite', edit_title: '{0} bearbeiten', edit_sat: 'Öffnungszeit Samstag', edit_sun: 'Öffnungszeit Sonntag',
    edit_hours_hint: '10:00-16:00, leer = geschlossen', edit_address: 'Adresse', use_web_page: 'Angaben der Webseite verwenden',
    invalid_hours: 'Schreibe Zeiten wie 10:00-16:00 oder lass das Feld für geschlossen leer.',
    footer_exact: 'Die Radzeiten zwischen den Märkten stammen von Google Maps, abgerufen am {0}. Fahrten von deinem Start sind Schätzungen. Geplant {1}.',
    footer_inexact: 'Die Radzeiten zwischen den Märkten stammen von Google Maps, abgerufen am {0}. Fahrten von deinem Start sind Schätzungen. Geplant {1}. Bei so vielen Märkten ist der Plan vielleicht nicht der allerbeste.',
    stale: 'Markierungen oder Einstellungen haben sich geändert, seit dieser Plan erstellt wurde.',
    status_locating: 'Standort wird ermittelt…', status_addresses: 'Adressen werden gesucht…', status_solving: 'Die beste Route wird gesucht…',
    your_location: 'Dein Standort',
    err_no_days: 'Beide Tage sind vorbei oder ausgeschaltet, es gibt also nichts zu planen.',
    err_nothing: 'Keine Märkte mehr zu planen: alle sind besucht, ausgelassen oder geschlossen.',
    err_network: 'Keine Verbindung zu {0}. Prüfe deine Internetverbindung und versuche es erneut.',
    err_location: 'Dein Standort konnte nicht ermittelt werden ({0}). Gib stattdessen eine Startadresse ein.', err_address: 'Die Adresse „{0}“ wurde nicht gefunden. Versuche Straße und Hausnummer, zum Beispiel Storgata 1, Oslo.',
    warn_hours_missing: 'Weggelassen, weil die Öffnungszeiten unbekannt sind: {0}.',
    warn_too_many: 'Zu viele Märkte für einen Plan, daher wurden nur die ersten {0} berücksichtigt.',
    warn_no_location: 'Keine Adresse für {0}, daher weggelassen.',
    warn_must_missed: 'Passte am {0} nicht hinein, obwohl du es als Muss markiert hast: {1}.',
    auto_visited: 'Die {0} geplanten Halte vom Samstag wurden als besucht markiert. Entferne unter Alle Märkte den Haken bei denen, die du ausgelassen hast.',
    s_days: 'Tage und Zeiten', s_leave_sat: 'Frühestens losfahren, Samstag', s_leave_sun: 'Frühestens losfahren, Sonntag',
    s_plan_sat: 'Samstag planen', s_plan_sun: 'Sonntag planen',
    s_visits: 'Besuche', s_service: 'Minuten pro Markt', s_min_last: 'Nötige Minuten am letzten Markt des Tages',
    s_cycling: 'Radfahren', s_bike_pct: 'Radzeit in % von Googles Schätzung', s_buffer: 'Zusätzliche Minuten pro Fahrt (Abstellen, Abschließen)',
    s_map: 'Karte der Route für jeden Tag anzeigen', s_language: 'Sprache'
  };

  var da = {
    months: ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'],
    hour_unit: 't', decimal: ',',
    date: '{0}. {1}', range_same: '{0}.–{1}. {2}', range_two: '{0} – {1}',
    weekend: 'Weekenden {0}', weekend_option: '{0} ({1})',
    saturday: 'Lørdag', sunday: 'Søndag', saturday_in: 'lørdag', sunday_in: 'søndag',
    tab_day: '{0} {1}.', tab_all: 'Alle markeder',
    refresh: 'Hent markedsdata igen', settings: 'Indstillinger',
    n_markets_1: '1 marked', n_markets: '{0} markeder',
    plan_route: 'Planlæg ruten', plan_again: 'Planlæg igen',
    start_line_location: 'Start: hvor jeg er, når jeg planlægger', start_line_address: 'Start: {0}',
    start_title: 'Hvor starter du?', start_hint: 'Gade og nummer, Oslo',
    start_help: 'Bruges begge dage. Lad feltet stå tomt for at starte, hvor du er, når du planlægger.',
    start_use_location: 'Brug min position', save: 'Gem', cancel: 'Annuller', close: 'Luk',
    loading: 'Henter markeder…', load_failed: 'Kunne ikke hente markedsdata ({0}).', try_again: 'Prøv igen',
    no_weekends: 'Ingen kommende weekender med markeder i dataene. De skal måske opdateres.',
    other_weekend: 'Der er ingen markeder i den kommende weekend, så dette er den næste, der har nogen.',
    empty_title: 'Ingen rute endnu',
    empty_body: '{0} har åbent {1}. Planlæg ruten for at nå flest muligt på cykel, med {2} minutter hvert sted.',
    day_none_title: 'Intet planlagt',
    day_past: '{0} er forbi.', day_disabled: 'Du har slået planlægning fra for {0} i Indstillinger.',
    day_none_open: 'Ingen markeder tilbage, der har åbent {0}.',
    day_none_fit: 'Ingen flere markeder kan nås {0} med start {1}.',
    cycling: '{0} på cykel, {1}', cycling_no_distance: '{0} på cykel',
    summary_times: 'Tag afsted {0}. Sidste stop til {1}.',
    open_in_maps: 'Åbn ruten i Google Maps', share: 'Del', copied: 'Kopieret', map_alt: 'Kort over ruten', map_credit: 'Kort ©',
    start_from_location: 'Tag afsted fra hvor du er', start_from_address: 'Tag afsted fra {0}',
    start_latest: 'Tag afsted senest {0}',
    leg: '{0} på cykel, {1}', leg_no_distance: '{0} på cykel', leg_estimated: 'Omkring {0} på cykel (skøn)',
    open_hours: 'Åbent {0}', wait: 'Du er fremme {0} og venter {1}, til det åbner.',
    leave_by: 'Tag afsted senest {0} for at holde planen.',
    last_short: 'Sidste stop: {0} her, før det lukker {1}.', last_full: 'Sidste stop: bliv, til det lukker {0}.',
    navigate: 'Naviger', visited: 'Besøgt', skip: 'Spring over', must_sat: 'Skal med lørdag', must_sun: 'Skal med søndag',
    markets_intro: 'Markeder, du markerer som besøgt, kommer ikke med, når du planlægger igen. Markeder, du springer over, planlægges aldrig. Et skal-marked lægges først ind på den dags rute, før resten fyldes på.',
    in_plan: '{0}, stop {1}', not_in_plan: 'Ikke med i planen',
    hours_day: '{0} {1}', closed_day: '{0} lukket', hours_missing: 'Fandt ingen åbningstider. Tryk på Rediger for at skrive dem ind.',
    address_missing: 'Fandt ingen adresse. Tryk på Rediger for at skrive den ind.', edited: 'Ændret af dig',
    edit: 'Rediger', web_page: 'Hjemmeside', edit_title: 'Rediger {0}', edit_sat: 'Åbningstid lørdag', edit_sun: 'Åbningstid søndag',
    edit_hours_hint: '10:00-16:00, tomt = lukket', edit_address: 'Adresse', use_web_page: 'Brug hjemmesidens',
    invalid_hours: 'Skriv tider som 10:00-16:00, eller lad feltet stå tomt for lukket.',
    footer_exact: 'Cykeltiderne mellem markederne er fra Google Maps, hentet {0}. Ture fra dit startpunkt er skøn. Planlagt {1}.',
    footer_inexact: 'Cykeltiderne mellem markederne er fra Google Maps, hentet {0}. Ture fra dit startpunkt er skøn. Planlagt {1}. Mange markeder, så planen er måske ikke den allerbedste.',
    stale: 'Markeringer eller indstillinger er ændret, siden planen blev lavet.',
    status_locating: 'Finder din position…', status_addresses: 'Slår adresser op…', status_solving: 'Finder den bedste rute…',
    your_location: 'Din position',
    err_no_days: 'Begge dage er forbi eller slået fra, så der er intet at planlægge.',
    err_nothing: 'Ingen markeder tilbage at planlægge: alle er besøgt, sprunget over eller lukket.',
    err_network: 'Kunne ikke få forbindelse til {0}. Tjek din internetforbindelse, og prøv igen.',
    err_location: 'Kunne ikke finde din position ({0}). Skriv en startadresse i stedet.', err_address: 'Fandt ikke adressen »{0}«. Prøv gade og nummer, for eksempel Storgata 1, Oslo.',
    warn_hours_missing: 'Udeladt, fordi åbningstiderne er ukendte: {0}.',
    warn_too_many: 'For mange markeder til én plan, så kun de første {0} blev taget med.',
    warn_no_location: 'Ingen adresse for {0}, så det blev udeladt.',
    warn_must_missed: 'Kunne ikke nås {0}, selvom du markerede det som et skal: {1}.',
    auto_visited: 'Lørdagens {0} planlagte stop er markeret som besøgt. Fjern fluebenet under Alle markeder for dem, du sprang over.',
    s_days: 'Dage og tider', s_leave_sat: 'Tag tidligst afsted, lørdag', s_leave_sun: 'Tag tidligst afsted, søndag',
    s_plan_sat: 'Planlæg lørdag', s_plan_sun: 'Planlæg søndag',
    s_visits: 'Besøg', s_service: 'Minutter på hvert marked', s_min_last: 'Minutter, der kræves på dagens sidste marked',
    s_cycling: 'Cykling', s_bike_pct: 'Cykeltid i % af Googles skøn', s_buffer: 'Ekstra minutter pr. tur (parkering, låsning)',
    s_map: 'Vis kort over ruten for hver dag', s_language: 'Sprog'
  };

  var la = {
    months: ['Ianuarii', 'Februarii', 'Martii', 'Aprilis', 'Maii', 'Iunii', 'Iulii', 'Augusti', 'Septembris', 'Octobris', 'Novembris', 'Decembris'],
    hour_unit: 'h', decimal: ',',
    date: '{0} {1}', range_same: '{0}–{1} {2}', range_two: '{0} – {1}',
    weekend: 'Finis hebdomadis {0}', weekend_option: '{0} ({1})',
    saturday: 'Dies Saturni', sunday: 'Dies Solis', saturday_in: 'die Saturni', sunday_in: 'die Solis',
    tab_day: '{0} {1}', tab_all: 'Omnes mercatus',
    refresh: 'Data mercatuum iterum arcesse', settings: 'Optiones',
    n_markets_1: '1 mercatus', n_markets: '{0} mercatus',
    plan_route: 'Iter para', plan_again: 'Iter denuo para',
    start_line_location: 'Initium: ubi ero cum iter parabo', start_line_address: 'Initium: {0}',
    start_title: 'Unde proficisceris?', start_hint: 'Via et numerus, Oslo',
    start_help: 'Utroque die adhibetur. Vacuum relinque ut inde proficiscaris ubi eris cum iter parabis.',
    start_use_location: 'Loco meo utere', save: 'Serva', cancel: 'Omitte', close: 'Claude',
    loading: 'Mercatus arcessuntur…', load_failed: 'Data mercatuum arcessi non potuerunt ({0}).', try_again: 'Iterum tempta',
    no_weekends: 'Nulli fines hebdomadis futuri cum mercatibus in datis sunt. Fortasse renovanda sunt.',
    other_weekend: 'Proximo fine hebdomadis nulli mercatus nuntiati sunt; hic est proximus qui aliquos habet.',
    empty_title: 'Nondum iter',
    empty_body: 'Patent {1}: {0}. Iter para ut quam plurimos birota adeas, {2} minutis in singulis.',
    day_none_title: 'Nihil paratum',
    day_past: '{0} praeteriit.', day_disabled: 'Iter {0} in Optionibus exclusisti.',
    day_none_open: 'Nulli mercatus supersunt qui {0} pateant.',
    day_none_fit: 'Nulli plures mercatus {0} adiri possunt, si hora {1} proficisceris.',
    cycling: '{0} birota, {1}', cycling_no_distance: '{0} birota',
    summary_times: 'Proficiscere hora {0}. Ultima statio usque ad {1}.',
    open_in_maps: 'Iter in Google Maps aperi', share: 'Communica', copied: 'Exscriptum', map_alt: 'Tabula itineris', map_credit: 'Tabula ©',
    start_from_location: 'Proficiscere a loco tuo', start_from_address: 'Proficiscere ex: {0}',
    start_latest: 'Proficiscere non post horam {0}',
    leg: '{0} birota, {1}', leg_no_distance: '{0} birota', leg_estimated: 'Circiter {0} birota (aestimatio)',
    open_hours: 'Patet {0}', wait: 'Hora {0} advenis et {1} exspectas dum aperiatur.',
    leave_by: 'Discede non post horam {0} ut consilium serves.',
    last_short: 'Ultima statio: {0} hic antequam hora {1} claudatur.', last_full: 'Ultima statio: mane dum hora {0} claudatur.',
    navigate: 'Duc me', visited: 'Visitatus', skip: 'Praetermitte', must_sat: 'Necesse die Saturni', must_sun: 'Necesse die Solis',
    markets_intro: 'Mercatus quos visitatos notas omittuntur cum iter denuo paras. Praetermissi numquam in iter veniunt. Necessarius primum in itinere eius diei ponitur, deinde ceteri adduntur.',
    in_plan: '{0}, statio {1}', not_in_plan: 'Non in itinere',
    hours_day: '{0} {1}', closed_day: '{0} clausus', hours_missing: 'Horae non inventae. Preme Emenda ut eas inscribas.',
    address_missing: 'Inscriptio non inventa. Preme Emenda ut eam inscribas.', edited: 'A te mutatum',
    edit: 'Emenda', web_page: 'Pagina interretialis', edit_title: 'Emenda: {0}', edit_sat: 'Horae die Saturni', edit_sun: 'Horae die Solis',
    edit_hours_hint: '10:00-16:00, vacuum = clausus', edit_address: 'Inscriptio', use_web_page: 'Paginae interretialis data adhibe',
    invalid_hours: 'Scribe horas velut 10:00-16:00, aut vacuum relinque si clausus est.',
    footer_exact: 'Tempora birotae inter mercatus ex Google Maps sunt, arcessita {0}. Itinera ab initio tuo aestimata sunt. Paratum {1}.',
    footer_inexact: 'Tempora birotae inter mercatus ex Google Maps sunt, arcessita {0}. Itinera ab initio tuo aestimata sunt. Paratum {1}. Multi mercatus sunt, itaque iter fortasse non optimum est.',
    stale: 'Notae vel optiones mutatae sunt postquam hoc iter paratum est.',
    status_locating: 'Locus tuus quaeritur…', status_addresses: 'Inscriptiones quaeruntur…', status_solving: 'Iter optimum quaeritur…',
    your_location: 'Locus tuus',
    err_no_days: 'Uterque dies praeteriit aut exclusus est; nihil parandum est.',
    err_nothing: 'Nulli mercatus parandi supersunt: omnes visitati, praetermissi aut clausi sunt.',
    err_network: '{0} attingi non potuit. Conexionem inspice et iterum tempta.',
    err_location: 'Locus tuus inveniri non potuit ({0}). Inscriptionem initii scribe.', err_address: 'Inscriptio «{0}» inventa non est. Tempta viam et numerum, exempli gratia Storgata 1, Oslo.',
    warn_hours_missing: 'Omissi quia horae ignotae sunt: {0}.',
    warn_too_many: 'Nimis multi mercatus uni itineri; soli primi {0} considerati sunt.',
    warn_no_location: 'Nulla inscriptio pro {0}; omissus est.',
    warn_must_missed: 'Non potuit {0} includi, quamquam necessarium notavisti: {1}.',
    auto_visited: 'Stationes {0} die Saturni paratae visitatae notatae sunt. Sub Omnes mercatus notam tolle iis quas praetermisisti.',
    s_days: 'Dies et horae', s_leave_sat: 'Non ante proficiscendum, die Saturni', s_leave_sun: 'Non ante proficiscendum, die Solis',
    s_plan_sat: 'Para diem Saturni', s_plan_sun: 'Para diem Solis',
    s_visits: 'Visitationes', s_service: 'Minuta in singulis mercatibus', s_min_last: 'Minuta necessaria in ultimo mercatu diei',
    s_cycling: 'Birota', s_bike_pct: 'Tempus birotae, % aestimationis Google', s_buffer: 'Minuta addita in singula itinera (statio, sera)',
    s_map: 'Ostende tabulam itineris cuiusque diei', s_language: 'Lingua'
  };

  var DICTS = { nb: nb, en: en, de: de, da: da, la: la };
  var NAMES = [['nb', 'Norsk'], ['en', 'English'], ['de', 'Deutsch'], ['da', 'Dansk'], ['la', 'Latina']];
  var STORE_KEY = 'rideatdawn.lang';

  function saved() {
    try {
      return root.localStorage.getItem(STORE_KEY);
    } catch (e) {
      return null;
    }
  }

  function fromBrowser() {
    var l = (root.navigator && root.navigator.language || '').toLowerCase();
    if (/^(nb|nn|no)\b/.test(l)) return 'nb';
    if (/^da\b/.test(l)) return 'da';
    if (/^de\b/.test(l)) return 'de';
    if (/^la\b/.test(l)) return 'la';
    return 'en';
  }

  var dict = en;

  function T(key) {
    var s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : en[key];
    if (s == null) return key;
    var args = arguments;
    return String(s).replace(/\{(\d)\}/g, function (all, i) {
      var v = args[Number(i) + 1];
      return v == null ? '' : v;
    });
  }

  /** Switches language. With remember = true the choice is kept in this browser. */
  T.setLang = function (code, remember) {
    if (!Object.prototype.hasOwnProperty.call(DICTS, code)) code = 'en';
    dict = DICTS[code];
    T.lang = code;
    T.months = dict.months;
    if (remember) {
      try {
        root.localStorage.setItem(STORE_KEY, code);
      } catch (e) { /* not stored; lasts until the page is closed */ }
    }
  };
  T.languages = NAMES;
  T.keys = function (code) { return Object.keys(DICTS[code]); };
  T.setLang(saved() || fromBrowser(), false);
  root.T = T;
})(typeof self !== 'undefined' ? self : this);
