(function (root) {
  'use strict';

  // One-inch cells. Letter: 8.5x11 in with 0.5 in margins -> 7.5x10 in printable,
  // so 7 columns x 10 rows of cells. A4: 210x297 mm with 0.5 in margins -> about
  // 7.27x10.69 in printable, also 7 columns x 10 rows.
  var PAPERS = {
    letter: { name: 'Letter', widthIn: 8.5, heightIn: 11, marginIn: 0.5, cols: 7, rows: 10 },
    a4: { name: 'A4', widthIn: 210 / 25.4, heightIn: 297 / 25.4, marginIn: 0.5, cols: 7, rows: 10 }
  };

  function rowLetters(n) {
    var s = '';
    n = n + 1;
    while (n > 0) {
      var m = (n - 1) % 26;
      s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // Returns pages covering a mapW x mapH cell map. Each page:
  // {row, col, x0, y0, w, h, label}; x0/y0 are the first map cell on the page,
  // w/h the number of map cells it holds (edge pages may be smaller).
  function tilePages(mapW, mapH, paper) {
    var spec = PAPERS[paper || 'letter'];
    if (!spec) throw new Error('Unknown paper: ' + paper);
    mapW = Math.floor(Number(mapW));
    mapH = Math.floor(Number(mapH));
    if (!(mapW >= 1) || !(mapH >= 1)) throw new Error('Map size must be at least 1x1');

    var pageCols = Math.ceil(mapW / spec.cols);
    var pageRows = Math.ceil(mapH / spec.rows);
    var pages = [];
    for (var r = 0; r < pageRows; r++) {
      for (var c = 0; c < pageCols; c++) {
        var x0 = c * spec.cols;
        var y0 = r * spec.rows;
        pages.push({
          row: r,
          col: c,
          x0: x0,
          y0: y0,
          w: Math.min(spec.cols, mapW - x0),
          h: Math.min(spec.rows, mapH - y0),
          label: rowLetters(r) + (c + 1)
        });
      }
    }
    return pages;
  }

  var api = { tilePages: tilePages, PAPERS: PAPERS, rowLetters: rowLetters };

  root.DungeonTiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
