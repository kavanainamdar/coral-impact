import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

// Minimal copy: assumes data generated already under ../data-source (adjust as needed)
const root = resolve(process.cwd());
const source = process.env.DATA_SOURCE ? resolve(root, process.env.DATA_SOURCE) : resolve(root, '..', 'react-dashboard', 'public', 'data');
const dest = resolve(root, 'public', 'data');
mkdirSync(dest, { recursive: true });

const files = [
  'intersections_light.geojson',
  'regression_yearly_stats.csv',
  'intersections_metadata.json',
  'intersections_yearly_summary.csv'
];

console.log('Copying data from', source, 'to', dest);
for (const f of files) {
  const from = resolve(source, f);
  const to = resolve(dest, f);
  if (!existsSync(from)) { console.warn('Missing', f); continue; }
  copyFileSync(from, to);
  console.log('Copied', f);
}
