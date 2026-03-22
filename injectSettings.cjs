const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  let changed = 0;
  let matchesCount = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const res = processDir(fullPath);
      changed += res.changed;
      matchesCount += res.matchesCount;
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      const regex = /db\.transaction\(\s*"rw"\s*,\s*(?!\[)([^,]+)/g;
      const initialContent = content;
      
      content = content.replace(regex, (match, firstArg) => {
        matchesCount++;
        // Avoid duplicate db.settings
        if (match.includes('db.settings')) return match; 
        
        return `db.transaction("rw", db.settings, ${firstArg}`;
      });

      // Handle array format transactions: db.transaction("rw", [db.foo, db.bar], ...)
      const regexArray = /db\.transaction\(\s*"rw"\s*,\s*\[([^\]]+)\]/g;
      content = content.replace(regexArray, (match, tablesStr) => {
        matchesCount++;
        if (tablesStr.includes('db.settings')) return match;
        return `db.transaction("rw", [db.settings, ${tablesStr}]`;
      });

      if (content !== initialContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath} (injected db.settings)`);
        changed++;
      }
    }
  }
  return { changed, matchesCount };
}

const targetDir = path.join(__dirname, 'src');
console.log(`Scanning ${targetDir} for db.transaction("rw", ...) calls...`);
const result = processDir(targetDir);
console.log(`Scan complete. Found ${result.matchesCount} calls. Modified ${result.changed} files.`);

// Run prettier and typecheck
try {
  console.log("Formatting files...");
  execSync('npm run format', { stdio: 'inherit' });
  console.log("Typechecking...");
  execSync('npm run typecheck', { stdio: 'inherit' });
  console.log("Success!");
} catch (error) {
  console.error("Validation failed!", error.message);
  process.exit(1);
}
