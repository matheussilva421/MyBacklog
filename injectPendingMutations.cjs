const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // matches db.transaction("rw", [db.table1, db.table2], ...) 
  // or db.transaction("rw", db.table1, db.table2, ...)
  
  // A regex to match db.transaction("rw", and inject db.pendingMutations
  // We look for `db.transaction("rw", ` or `db.transaction(` (sometimes mode is omitted? Dexie needs mode).
  // Actually, Dexie transactions look like: db.transaction("rw", db.games, db.settings, async () => ...)
  // Let's replace `db.transaction("rw", ` with `db.transaction("rw", db.pendingMutations, `
  // Exception: if `db.pendingMutations` is already there, skip.
  // Exception: if it's an array: `db.transaction("rw", [db.games, ...], ` -> `db.transaction("rw", [db.pendingMutations, db.games... `
  
  // Case 1: Array-based args
  content = content.replace(/db\.transaction\(\s*"rw"\s*,\s*\[([\s\S]*?)\]\s*,/g, (match, arrayContent) => {
    if (arrayContent.includes('db.pendingMutations')) return match;
    // se estiver vazio, não acontece se é rw.
    return `db.transaction("rw", [db.pendingMutations, ${arrayContent}],`;
  });

  // Case 2: Argument-based args (v-args)
  // this is harder because we don't know where the array of arguments ends.
  // But we can just inject it right after "rw", 
  // `db.transaction("rw", db.games, async () => {`
  content = content.replace(/db\.transaction\(\s*"rw"\s*,\s*(?!\[)([^,]+)/g, (match, firstArg) => {
    if (match.includes('db.pendingMutations')) return match;
    return `db.transaction("rw", db.pendingMutations, ${firstArg}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function findFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findFiles(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

findFiles(path.join(__dirname, 'src'));
