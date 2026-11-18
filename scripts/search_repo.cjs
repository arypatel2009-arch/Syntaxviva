const fs = require('fs');
const path = require('path');

function searchDir(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      searchDir(full, pattern);
    } else if (stat.isFile() && (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.html'))) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`Found "${pattern}" in: ${full}`);
      }
    }
  }
}

searchDir('src', 'Proctoring');
searchDir('src', 'Classrooms & Divisions');
searchDir('src', 'Pending Viva');
searchDir('backups', 'Proctoring');
searchDir('backups', 'Faculty Work');
searchDir('..', 'Proctoring Oversight');
