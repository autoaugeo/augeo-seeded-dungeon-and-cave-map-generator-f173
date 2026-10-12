'use strict';
// Usage: node examples/print_ascii.js [seed] [width] [height]
// Prints one dungeon and one cave for the same seed.
var Gen = require('../gen.js');

var seed = process.argv[2] || 'augeo';
var width = Number(process.argv[3]) || 30;
var height = Number(process.argv[4]) || 20;

var SYMBOL = { wall: '#', floor: '.', corridor: ',', door: '+' };

function render(map) {
  return map.grid.map(function (row) {
    return row.map(function (cell) { return SYMBOL[cell]; }).join('');
  }).join('\n');
}

['dungeon', 'cave'].forEach(function (style) {
  var map = Gen.generate({ seed: seed, width: width, height: height, style: style });
  console.log(style + ' | seed "' + map.seed + '" | ' + map.width + 'x' + map.height +
    ' | ' + map.rooms.length + ' rooms');
  console.log(render(map));
  console.log('');
});
