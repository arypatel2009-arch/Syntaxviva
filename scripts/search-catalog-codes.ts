import { COMPLEX_BUG_CATALOG } from '../server/mutation/complexBugCatalog.ts';

const searchTerms = [
  'GUARD',
  'FLOW',
  'LOOP',
  'ACC',
  'MATH',
  'STR',
  'DATA',
  'CHAINED',
  'PRECISION',
];

for (const term of searchTerms) {
  const matches = COMPLEX_BUG_CATALOG.filter(b => b.code.includes(term));
  console.log(`\n=== Matches for ${term} (${matches.length}) ===`);
  for (const m of matches.slice(0, 5)) {
    console.log(`  - ${m.code} [${m.category}]: ${m.name}`);
  }
}
