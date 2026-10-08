# Ride at Dawn (web)

Plans a bike route through as many flea markets from
[loppemarkeder.com](https://www.loppemarkeder.com/) as possible over a weekend.
A static web page: works on iPhone and Android, and can be added to the home screen.

The page holds no Google key and never calls Google. Everything it needs is in one file,
`data/weekends.json`, which you update on your own computer and push.

## How it fits together

| Where | What happens |
|---|---|
| Your computer, `node tools/update-data.js` | Reads every upcoming weekend from loppemarkeder.com, looks up the addresses and fetches the bike times between all markets of each weekend from Google. Writes `data/weekends.json`. |
| GitHub Pages | Serves the page and that file. |
| Each phone | Reads the file and plans locally. Ticks, start address and settings stay in that browser. |

Two things are not in the file, because they depend on the person:

- **The start point.** The phone's position, or a typed address looked up with Kartverket's free
  address search (no key).
- **The ride from the start to a market.** Estimated from the straight-line distance, scaled by how
  that weekend's real Google rides relate to straight lines, on the cautious side. The app marks
  these rides as estimates. Rides between markets are Google's.

## Updating the data

```
node tools/update-data.js --dry-run   # shows what it would fetch, calls nothing at Google
node tools/update-data.js             # updates data/weekends.json
git add data/weekends.json && git commit -m "Update market data" && git push
```

- The key is read from the environment variable `GOOGLE_API_KEY`, or from `googleapikey.txt` in
  the folder **above** this one. Keep it out of this folder; `.gitignore` also blocks that file name.
- The script reuses what the file already has. Only new markets, or markets whose address
  changed, cost anything. `--fresh` fetches everything again.
- Cost is about markets × markets bike-time elements per weekend, once. All five weekends listed
  in October 2026 (23 markets) took 179 elements and 23 address lookups.
- Run it when the site lists new weekends or changes a listing, since opening hours come from the
  file too. The script prints every market with its hours and flags the ones it could not read.
- Weekends that are over are dropped from the file on the next run.
- Needs Node 12 or newer, nothing else.

People can still correct a market's hours or address on their own phone with Edit. A market whose
address was edited gets estimated rides, since the file has no Google times for the new place.

## Host it on GitHub Pages

1. Create a new repository on github.com (public is required for Pages on a free account).
2. In this folder:
   ```
   git init -b main
   git add .
   git commit -m "Ride at Dawn web app"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: Settings → Pages → Source "Deploy from a branch", branch `main`, folder `/ (root)`.
4. After a minute the app is at `https://<you>.github.io/<repo>/`. Send friends that link.

Since the key is only used from your computer, you can restrict it to your own IP address in
Google Cloud and keep a low daily quota.

## What the app does

- Fits in as many markets as possible over Saturday and Sunday: 60 minutes at each, inside the
  opening hours, no market on both days.
- Shows each day as a timetable with a map of the route (OpenStreetMap, free, no key), a Google
  Maps link with every stop, and Share.
- Under All markets you can tick markets as Visited, Skip, Must on Saturday or Must on Sunday.
- The start is where you are, or an address typed on the line above the Plan button.
- Norwegian or English, following the phone's language. Follows dark mode.

## Files

| File | Role |
|---|---|
| `index.html`, `style.css` | The page |
| `core.js` | Parser, weekend finder, solver, plan builder, Maps links. No DOM, no network |
| `data.js` | Local storage, reading the data file, address lookup, the planning pass |
| `app.js` | Screens and dialogs |
| `i18n.js` | Norwegian and English text |
| `data/weekends.json` | Markets and bike times, written by the script |
| `tools/update-data.js` | The only code that uses the Google key |
| `test/core.test.js` | `node test/core.test.js`: solver against brute force, parser, weekends, links |
| `test/e2e.html` | Drives the real app from a local server and prints the plan as text |

## Run and test locally

```
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`, or `http://127.0.0.1:8765/test/e2e.html#start=Storgata 1, Oslo`
for the end-to-end check. Location works on `localhost` and on https, not on plain http.

## Limits

- At most 30 markets in one plan.
- Friday openings are ignored.
- The map joins the stops with straight lines; the real route is in the Google Maps link.
- Font: Schibsted Grotesk (SIL Open Font License 1.1), licence text in `fonts/`.
