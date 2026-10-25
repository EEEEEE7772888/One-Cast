# One Cast

An idle fishing game across the whole world. Cast a line, walk away, come back to a bite. Every spot hides one legendary fish that only one player on Earth can own, and you can trade it with friends.

**Play:** https://onecast.github.io/

## How it's built

- `index.html`, `css/game.css`, `js/*.js`: the game page. Pixel art is drawn by code; nothing is downloaded.
- `js/data.js`: the whole world in one file: 14 regions, 42 spots, 82 species, baits, gear, prices and the Season 1 legends. The server data is generated from it.
- `setup.sql`: the Supabase server. Tables plus the referee functions (`cast_line`, `reel_line`, `sell_fish`, `buy`, `travel`, trading, legends, friends, boards, admin). The page can only call these functions; it can't touch the tables.
- `admin.html`: the admin page (rename or hide a player, handle reports, approve lake suggestions, post a notice). Needs the admin key from your private copy of `setup.sql`.
- `tools/`: `gen-sql.js` rebuilds `setup.sql` from `data.js`; `sim.js` and `ev.js` simulate the economy.
- `tests/`: `server.test.js` (run against a local Postgres), `mock-server.js` (serves the page and forwards calls to the local database), Playwright flows.

## Updating the game

1. Edit `js/data.js` (fish, prices, spots) or the page files.
2. If `data.js` or `sql/*.sql` changed, run `node tools/gen-sql.js` and paste the new `setup.sql` into Supabase again. It is safe to run more than once.
3. Push to `main`. GitHub Pages serves it.

## Testing locally

```
createdb onecast && psql -d onecast -f setup.sql
node tests/server.test.js
node tests/mock-server.js   # then open http://localhost:8787/?server=http://localhost:8787&key=test
```
