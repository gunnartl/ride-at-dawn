# Ride at Dawn (web)

Planlegger en sykkelrute innom flest mulig loppemarkeder fra
[loppemarkeder.com](https://www.loppemarkeder.com/) i løpet av en helg.
En statisk nettside: fungerer på iPhone og Android, og kan legges til på hjemskjermen.

Appen ligger på https://gunnartl.github.io/ride-at-dawn/

Siden inneholder ingen Google-nøkkel og kontakter aldri Google. Alt den trenger ligger i én fil,
`data/weekends.json`, som du oppdaterer på din egen maskin og pusher.

## Slik henger det sammen

| Hvor | Hva som skjer |
|---|---|
| Din maskin, `node tools/update-data.js` | Leser alle kommende helger fra loppemarkeder.com, slår opp adressene og henter sykkeltidene mellom alle markedene i hver helg fra Google. Skriver `data/weekends.json`. |
| GitHub Pages | Leverer siden og den filen. |
| Hver telefon | Leser filen og planlegger lokalt. Avhukinger, startadresse og innstillinger blir liggende i den nettleseren. |

To ting ligger ikke i filen, fordi de avhenger av personen:

- **Startpunktet.** Telefonens posisjon, eller en adresse du skriver inn, slått opp med Kartverkets
  gratis adressesøk (ingen nøkkel).
- **Turen fra start til et marked.** Anslått ut fra luftlinjeavstanden, skalert etter hvordan den
  helgens faktiske Google-turer forholder seg til luftlinje, med litt margin. Appen merker disse
  turene som anslag. Turene mellom markedene er Googles.

## Oppdatere dataene

```
node tools/update-data.js --dry-run   # viser hva som ville blitt hentet, kontakter ikke Google
node tools/update-data.js             # oppdaterer data/weekends.json
git add data/weekends.json && git commit -m "Update market data" && git push
```

- Nøkkelen leses fra miljøvariabelen `GOOGLE_API_KEY`, eller fra `googleapikey.txt` i mappen
  **over** denne. Hold den utenfor denne mappen; `.gitignore` blokkerer også det filnavnet.
- Skriptet gjenbruker det filen allerede har. Bare nye markeder, eller markeder som har fått ny
  adresse, koster noe. `--fresh` henter alt på nytt.
- Kostnaden er omtrent markeder × markeder sykkeltidselementer per helg, én gang. Alle de fem
  helgene som lå ute i oktober 2026 (23 markeder) tok 179 elementer og 23 adresseoppslag.
- Kjør det når nettstedet legger ut nye helger eller endrer en oppføring, siden åpningstidene også
  kommer fra filen. Skriptet skriver ut hvert marked med åpningstider og merker dem det ikke
  klarte å lese.
- Helger som er over, fjernes fra filen ved neste kjøring.
- Krever Node 12 eller nyere, ingenting annet.

Folk kan fortsatt rette åpningstider eller adresse for et marked på sin egen telefon med Rediger.
Et marked med endret adresse får anslåtte turer, siden filen ikke har Google-tider for det nye
stedet.

## Publisering på GitHub Pages

Koden ligger i [github.com/gunnartl/ride-at-dawn](https://github.com/gunnartl/ride-at-dawn), og
Pages leverer `main`-grenen fra rotmappen. Alt som pushes til `main`, er ute på nettsiden etter et
minutt eller to.

For å sette det opp et annet sted:

1. Lag et nytt repository på github.com (det må være offentlig for Pages på gratiskonto).
2. I denne mappen:
   ```
   git init -b main
   git add .
   git commit -m "Ride at Dawn web app"
   git remote add origin git@github.com:<deg>/<repo>.git
   git push -u origin main
   ```
3. På GitHub: Settings → Pages → Source «Deploy from a branch», gren `main`, mappe `/ (root)`.
4. Etter et minutt ligger appen på `https://<deg>.github.io/<repo>/`. Send den lenken til venner.

Siden nøkkelen bare brukes fra din maskin, kan du begrense den til din egen IP-adresse i
Google Cloud og ha en lav daglig kvote.

## Hva appen gjør

- Får med flest mulig markeder over lørdag og søndag: 60 minutter på hvert, innenfor
  åpningstidene, og ingen markeder begge dager.
- Bruker bare én dag når alle markedene rekkes på én dag (lørdag hvis begge går), og deler dem
  over to dager først når det gir flere markeder.
- Viser hver dag som en rutetabell med kart over ruten (OpenStreetMap, gratis, ingen nøkkel), en
  Google Maps-lenke med alle stoppene, og Del.
- Under Alle markeder kan du huke av markeder som Besøkt, Hopp over, Må med lørdag eller
  Må med søndag.
- Starten er der du er, eller en adresse du skriver inn på linjen over planleggingsknappen.
- Norsk, engelsk, tysk, dansk eller latin. Språket velges i Innstillinger; ellers følger det telefonen.
  Følger mørk modus.

## Filer

| Fil | Rolle |
|---|---|
| `index.html`, `style.css` | Selve siden |
| `core.js` | Tolking av oppføringer, helgefinner, ruteløser, planbygger, Maps-lenker. Ingen DOM, ingen nettverk |
| `data.js` | Lokal lagring, lesing av datafilen, adresseoppslag, planleggingsløpet |
| `app.js` | Skjermbilder og dialoger |
| `i18n.js` | Tekst på norsk, engelsk, tysk, dansk og latin |
| `data/weekends.json` | Markeder og sykkeltider, skrevet av skriptet |
| `tools/update-data.js` | Den eneste koden som bruker Google-nøkkelen |
| `test/core.test.js` | `node test/core.test.js`: ruteløseren mot rå gjennomsøking, tolking, helger, lenker |
| `test/e2e.html` | Kjører den ekte appen fra en lokal server og skriver ut planen som tekst |

## Kjøre og teste lokalt

```
python3 -m http.server 8765 --bind 127.0.0.1
```

Åpne `http://127.0.0.1:8765/`, eller `http://127.0.0.1:8765/test/e2e.html#start=Storgata 1, Oslo`
for en test av hele løpet. Posisjon fungerer på `localhost` og på https, ikke på vanlig http.

## Begrensninger

- Høyst 30 markeder i én plan.
- Åpningstider på fredager blir ikke tatt med.
- Kartet binder stoppene sammen med rette linjer; den virkelige ruten ligger i Google Maps-lenken.
- Skrifttype: Schibsted Grotesk (SIL Open Font License 1.1), lisensteksten ligger i `fonts/`.
