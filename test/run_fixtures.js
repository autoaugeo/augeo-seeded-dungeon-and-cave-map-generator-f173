'use strict';
var assert = require('assert');

var Gen = require('../gen.js');
var Tiles = require('../tiles.js');

var failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

function floodCount(map) {
  var g = map.grid;
  var h = g.length;
  var w = g[0].length;
  var start = map.rooms[0];
  assert.notStrictEqual(g[start.cy][start.cx], 'wall', 'first room centre is a wall');
  var seen = {};
  var stack = [[start.cx, start.cy]];
  seen[start.cx + ',' + start.cy] = true;
  var n = 0;
  while (stack.length) {
    var c = stack.pop();
    n++;
    var d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < 4; i++) {
      var x = c[0] + d[i][0];
      var y = c[1] + d[i][1];
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (g[y][x] === 'wall' || seen[x + ',' + y]) continue;
      seen[x + ',' + y] = true;
      stack.push([x, y]);
    }
  }
  return n;
}

function floorTotal(map) {
  var n = 0;
  map.grid.forEach(function (row) {
    row.forEach(function (v) { if (v !== 'wall') n++; });
  });
  return n;
}

['dungeon', 'cave'].forEach(function (style) {
  check('same seed + options give identical grid (' + style + ')', function () {
    var a = Gen.generate({ seed: 'repeat-me', width: 24, height: 18, style: style });
    var b = Gen.generate({ seed: 'repeat-me', width: 24, height: 18, style: style });
    assert.deepStrictEqual(a, b);
  });

  check('different seeds give different grids (' + style + ')', function () {
    var a = Gen.generate({ seed: 'alpha', width: 30, height: 30, style: style });
    var b = Gen.generate({ seed: 'beta', width: 30, height: 30, style: style });
    assert.notDeepStrictEqual(a.grid, b.grid);
  });

  check('grid has requested dimensions (' + style + ')', function () {
    [[30, 30], [12, 20], [20, 9], [5, 5]].forEach(function (s) {
      var m = Gen.generate({ seed: 'dim', width: s[0], height: s[1], style: style });
      assert.strictEqual(m.grid.length, s[1]);
      m.grid.forEach(function (row) { assert.strictEqual(row.length, s[0]); });
    });
  });

  check('every floor cell reachable from first room, 50 seeds (' + style + ')', function () {
    for (var i = 0; i < 50; i++) {
      var sizes = [[30, 30], [20, 20], [15, 25], [8, 8]];
      var s = sizes[i % sizes.length];
      var m = Gen.generate({ seed: 'seed-' + i, width: s[0], height: s[1], style: style });
      assert.ok(m.rooms.length >= 1, 'no rooms for seed-' + i);
      assert.strictEqual(floodCount(m), floorTotal(m), 'unreachable cells for seed-' + i);
    }
  });
});

check('dungeon uses only known cell types and has doors somewhere', function () {
  var ok = { wall: 1, floor: 1, door: 1, corridor: 1 };
  var doors = 0;
  for (var i = 0; i < 20; i++) {
    var m = Gen.generate({ seed: 'types-' + i, width: 30, height: 30, style: 'dungeon' });
    m.grid.forEach(function (row) {
      row.forEach(function (v) {
        assert.ok(ok[v], 'bad cell ' + v);
        if (v === 'door') doors++;
      });
    });
  }
  assert.ok(doors > 0);
});

function coverage(w, h, paper) {
  var pages = Tiles.tilePages(w, h, paper);
  var count = [];
  for (var y = 0; y < h; y++) {
    count.push([]);
    for (var x = 0; x < w; x++) count[y].push(0);
  }
  pages.forEach(function (p) {
    for (var y = p.y0; y < p.y0 + p.h; y++) {
      for (var x = p.x0; x < p.x0 + p.w; x++) {
        assert.ok(x < w && y < h, 'page outside map');
        count[y][x]++;
      }
    }
  });
  count.forEach(function (row) {
    row.forEach(function (n) { assert.strictEqual(n, 1); });
  });
  return pages;
}

['letter', 'a4'].forEach(function (paper) {
  check('tilePages covers 30x30 exactly once, 15 pages (' + paper + ')', function () {
    assert.strictEqual(coverage(30, 30, paper).length, 15);
  });
  check('tilePages covers 45x60 exactly once, 7x6 pages (' + paper + ')', function () {
    assert.strictEqual(coverage(45, 60, paper).length, 7 * 6);
  });
  check('tilePages 7x10 is one page labelled A1 (' + paper + ')', function () {
    var p = coverage(7, 10, paper);
    assert.strictEqual(p.length, 1);
    assert.strictEqual(p[0].label, 'A1');
  });
});

check('tile labels run A1, A2, ..., B1 and are unique', function () {
  var pages = Tiles.tilePages(30, 30, 'letter');
  assert.deepStrictEqual(pages.slice(0, 3).map(function (p) { return p.label; }), ['A1', 'A2', 'A3']);
  assert.strictEqual(pages[5].label, 'B1');
  var set = {};
  pages.forEach(function (p) { set[p.label] = 1; });
  assert.strictEqual(Object.keys(set).length, pages.length);
});

check('unknown paper is rejected', function () {
  assert.throws(function () { Tiles.tilePages(10, 10, 'folio'); });
});

if (failed) {
  console.log(failed + ' check(s) failed');
  process.exit(1);
}
console.log('ALL OK');
