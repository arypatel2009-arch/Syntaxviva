import { COMPLEX_BUG_CATALOG } from '../server/mutation/complexBugCatalog.ts';

const catMap = new Map<string, number>();
for (const b of COMPLEX_BUG_CATALOG) {
  catMap.set(b.category, (catMap.get(b.category) || 0) + 1);
}
console.log('Categories count:', catMap.size);
for (const [k, v] of catMap) {
  console.log(` - ${k}: ${v}`);
}
