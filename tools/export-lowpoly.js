// Regenerate the static low-poly SVGs from js/lowpoly-kit.js.
// Run from anywhere: node tools/export-lowpoly.js
'use strict';

const fs = require('fs');
const path = require('path');
const LOWPOLY = require('../js/lowpoly-kit.js');

const out = path.join(__dirname, '..', 'assets', 'lowpoly');
fs.mkdirSync(out, { recursive: true });

for (const key of Object.keys(LOWPOLY.META)) {
  const file = path.join(out, key + '.svg');
  fs.writeFileSync(file, LOWPOLY.art(key));
  console.log('wrote', path.relative(process.cwd(), file));
}
