# Seeded dungeon and cave generator

A small, dependency-free JavaScript library that generates tabletop battlemaps
from a text seed, plus a helper that splits a map into printable one-inch-grid
pages (US Letter or A4).

- `gen.js` generates a dungeon (rooms, corridors, doors) or a cave (cellular
  automata) on a grid from 5x5 to 60x60 cells.
- `tiles.js` works out how many printable pages a map needs and labels them
  A1, A2, ..., B1, ...
- No dependencies, no network access, no stored data. It runs in node or in a
  browser.

This project is built and maintained by an automated agent system.

A browser tool that uses this code is live at
https://augeo-seeded-dungeon-and-cave-map-generator-f173.pages.dev/

## Use it in node

```js
var Gen = require('./gen.js');
var Tiles = require('./tiles.js');

var map = Gen.generate({ seed: 'crypt of ash', width: 30, height: 30, style: 'dungeon' });
// map.grid[y][x] is 'wall' | 'floor' | 'corridor' | 'door'
// map.rooms is a list of {id, x, y, w, h, cx, cy}

var pages = Tiles.tilePages(map.width, map.height, 'letter'); // or 'a4'
// each page: {row, col, x0, y0, w, h, label}
```

Options for `generate`: `seed` (any text, default `"augeo"`), `width` and
`height` (clamped to 5..60, default 20), `style` (`"dungeon"` or `"cave"`).

## Use it in a browser

```html
<script src="gen.js"></script>
<script src="tiles.js"></script>
<script>
  var map = DungeonGen.generate({ seed: 'crypt of ash', width: 30, height: 30 });
  var pages = DungeonTiles.tilePages(map.width, map.height, 'a4');
</script>
```

## Print an example

```
node examples/print_ascii.js "crypt of ash" 40 20
```

Prints a dungeon and a cave for the seed (`#` wall, `.` floor, `,` corridor,
`+` door). Arguments are optional: seed, width, height.

## Seed determinism

The same seed, size and style always return the same map. The fixtures cover:

- identical `generate` output for repeated calls with the same options, for
  both styles;
- different seeds giving different grids;
- the grid having exactly the requested width and height;
- every non-wall cell being reachable from the first room, over 50 seeds and
  four sizes per style;
- dungeons using only the cell types `wall`, `floor`, `corridor` and `door`;
- `tilePages` covering every map cell exactly once on Letter and A4, with
  unique labels, and rejecting an unknown paper size.

Determinism is checked on the same JavaScript engine; the generator uses only
integer math (`Math.imul`) and `Math.floor`, no `Math.random` and no clock.

## Run the tests

```
node test/run_fixtures.js
```

It prints one `ok` or `FAIL` line per check, then `ALL OK`, and exits non-zero
if any check fails. Requires node only, no packages.

## Licence

MIT, see `LICENSE`.
