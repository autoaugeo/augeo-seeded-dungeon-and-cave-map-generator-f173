(function (root) {
  'use strict';

  var WALL = 'wall';
  var FLOOR = 'floor';
  var DOOR = 'door';
  var CORRIDOR = 'corridor';

  var MIN_SIZE = 5;
  var MAX_SIZE = 60;

  // String -> 32-bit seed (FNV-1a).
  function hashSeed(str) {
    var h = 2166136261;
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // mulberry32: returns a function giving floats in [0, 1).
  function makeRng(seed) {
    var a = hashSeed(seed);
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clampSize(n, fallback) {
    n = Math.floor(Number(n));
    if (!isFinite(n)) n = fallback;
    return Math.max(MIN_SIZE, Math.min(MAX_SIZE, n));
  }

  function makeGrid(w, h, value) {
    var g = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) row.push(value);
      g.push(row);
    }
    return g;
  }

  function randInt(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  // ---------- dungeon: rooms and corridors ----------

  function carveCorridor(grid, x1, y1, x2, y2, horizontalFirst) {
    function put(x, y) {
      if (grid[y][x] === WALL) grid[y][x] = CORRIDOR;
    }
    var x = x1;
    var y = y1;
    var stepX = x2 > x1 ? 1 : -1;
    var stepY = y2 > y1 ? 1 : -1;
    if (horizontalFirst) {
      while (x !== x2) { put(x, y); x += stepX; }
      while (y !== y2) { put(x, y); y += stepY; }
    } else {
      while (y !== y2) { put(x, y); y += stepY; }
      while (x !== x2) { put(x, y); x += stepX; }
    }
    put(x2, y2);
  }

  function roomsOverlap(a, b) {
    // one-cell gap between rooms
    return a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x &&
           a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y;
  }

  function makeRoom(id, x, y, w, h) {
    return {
      id: id, x: x, y: y, w: w, h: h,
      cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2)
    };
  }

  function genDungeon(rng, width, height) {
    var grid = makeGrid(width, height, WALL);
    var rooms = [];
    var maxRooms = Math.max(2, Math.floor((width * height) / 45));
    var maxRoomSide = Math.max(3, Math.min(8, Math.floor(Math.min(width, height) / 2)));
    var attempts = 0;
    var i, r, x, y;

    while (rooms.length < maxRooms && attempts < 300) {
      attempts++;
      var w = randInt(rng, 3, maxRoomSide);
      var h = randInt(rng, 3, maxRoomSide);
      if (w > width - 2 || h > height - 2) continue;
      x = randInt(rng, 1, width - w - 1);
      y = randInt(rng, 1, height - h - 1);
      var cand = makeRoom(rooms.length, x, y, w, h);
      var clash = false;
      for (i = 0; i < rooms.length; i++) {
        if (roomsOverlap(cand, rooms[i])) { clash = true; break; }
      }
      if (!clash) rooms.push(cand);
    }
    if (rooms.length === 0) {
      rooms.push(makeRoom(0, 1, 1, Math.min(3, width - 2), Math.min(3, height - 2)));
    }

    for (i = 0; i < rooms.length; i++) {
      r = rooms[i];
      for (y = r.y; y < r.y + r.h; y++) {
        for (x = r.x; x < r.x + r.w; x++) grid[y][x] = FLOOR;
      }
    }

    // chain every room to the previous one, then add a few extra loops
    for (i = 1; i < rooms.length; i++) {
      carveCorridor(grid, rooms[i - 1].cx, rooms[i - 1].cy, rooms[i].cx, rooms[i].cy, rng() < 0.5);
    }
    if (rooms.length > 2) {
      var extra = Math.floor(rooms.length / 4);
      for (i = 0; i < extra; i++) {
        var a = randInt(rng, 0, rooms.length - 1);
        var b = randInt(rng, 0, rooms.length - 1);
        if (a !== b) carveCorridor(grid, rooms[a].cx, rooms[a].cy, rooms[b].cx, rooms[b].cy, rng() < 0.5);
      }
    }

    // doors: corridor cells touching a room edge from outside
    for (i = 0; i < rooms.length; i++) {
      r = rooms[i];
      for (x = r.x; x < r.x + r.w; x++) {
        if (grid[r.y - 1][x] === CORRIDOR) grid[r.y - 1][x] = DOOR;
        if (grid[r.y + r.h][x] === CORRIDOR) grid[r.y + r.h][x] = DOOR;
      }
      for (y = r.y; y < r.y + r.h; y++) {
        if (grid[y][r.x - 1] === CORRIDOR) grid[y][r.x - 1] = DOOR;
        if (grid[y][r.x + r.w] === CORRIDOR) grid[y][r.x + r.w] = DOOR;
      }
    }

    return { grid: grid, rooms: rooms };
  }

  // ---------- cave: cellular automata ----------

  function wallNeighbours(grid, w, h, x, y) {
    var n = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx;
        var ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] === WALL) n++;
      }
    }
    return n;
  }

  function genCave(rng, width, height) {
    var grid = makeGrid(width, height, WALL);
    var x, y, iter;
    for (y = 1; y < height - 1; y++) {
      for (x = 1; x < width - 1; x++) {
        grid[y][x] = rng() < 0.55 ? FLOOR : WALL;
      }
    }
    for (iter = 0; iter < 4; iter++) {
      var next = makeGrid(width, height, WALL);
      for (y = 1; y < height - 1; y++) {
        for (x = 1; x < width - 1; x++) {
          next[y][x] = wallNeighbours(grid, width, height, x, y) >= 5 ? WALL : FLOOR;
        }
      }
      grid = next;
    }

    // keep only the largest 4-connected floor region
    var seen = makeGrid(width, height, false);
    var best = [];
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        if (grid[y][x] === WALL || seen[y][x]) continue;
        var comp = [];
        var stack = [[x, y]];
        seen[y][x] = true;
        while (stack.length) {
          var c = stack.pop();
          comp.push(c);
          var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var d = 0; d < 4; d++) {
            var nx = c[0] + dirs[d][0];
            var ny = c[1] + dirs[d][1];
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (grid[ny][nx] === WALL || seen[ny][nx]) continue;
            seen[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
        if (comp.length > best.length) best = comp;
      }
    }

    var out = makeGrid(width, height, WALL);
    var i;
    if (best.length < 12) {
      // degenerate roll: carve a guaranteed central cavern
      var bw = Math.min(5, width - 2);
      var bh = Math.min(5, height - 2);
      var bx = Math.floor((width - bw) / 2);
      var by = Math.floor((height - bh) / 2);
      best = [];
      for (y = by; y < by + bh; y++) {
        for (x = bx; x < bx + bw; x++) best.push([x, y]);
      }
    }
    for (i = 0; i < best.length; i++) out[best[i][1]][best[i][0]] = FLOOR;

    // chambers: floor cells spaced apart, scan order (deterministic)
    var rooms = [];
    for (y = 0; y < height && rooms.length < 8; y++) {
      for (x = 0; x < width && rooms.length < 8; x++) {
        if (out[y][x] === WALL) continue;
        var far = true;
        for (i = 0; i < rooms.length; i++) {
          if (Math.max(Math.abs(rooms[i].cx - x), Math.abs(rooms[i].cy - y)) < 6) { far = false; break; }
        }
        if (far) {
          var room = makeRoom(rooms.length, x, y, 1, 1);
          room.cx = x;
          room.cy = y;
          rooms.push(room);
        }
      }
    }
    return { grid: out, rooms: rooms };
  }

  // ---------- public API ----------

  function generate(opts) {
    opts = opts || {};
    var seed = opts.seed === undefined || opts.seed === null ? 'augeo' : String(opts.seed);
    var width = clampSize(opts.width, 20);
    var height = clampSize(opts.height, 20);
    var style = opts.style === 'cave' ? 'cave' : 'dungeon';
    var rng = makeRng(seed + '|' + style + '|' + width + 'x' + height);
    var res = style === 'cave' ? genCave(rng, width, height) : genDungeon(rng, width, height);
    return {
      seed: seed,
      style: style,
      width: width,
      height: height,
      grid: res.grid,
      rooms: res.rooms
    };
  }

  var api = {
    generate: generate,
    makeRng: makeRng,
    hashSeed: hashSeed,
    MIN_SIZE: MIN_SIZE,
    MAX_SIZE: MAX_SIZE
  };

  root.DungeonGen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
