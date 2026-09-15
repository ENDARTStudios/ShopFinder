import { readFileSync, writeFileSync, execSync } from 'fs';
import { resolve } from 'path';

// Get original content from git
const originalContent = execSync('git --no-pager show HEAD:prisma/migrations/0001_init/migration.sql', { 
  encoding: 'utf8',
  cwd: resolve('.')
});

// Replace all DATETIME occurrences
const newContent = originalContent.replace(/DATETIME/g, 'TIMESTAMP(3)');

// Write to file
const filePath = resolve('prisma/migrations/0001_init/migration.sql');
writeFileSync(filePath, newContent);
console.log('Replaced', (originalContent.match(/DATETIME/g) || []).length, 'occurrences');