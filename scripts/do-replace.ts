// Script to replace DATETIME with TIMESTAMP(3) in migration.sql
const { execSync } = require('child_process');
const { writeFileSync } = require('fs');

// Get original content from git
const originalContent = execSync('git --no-pager show HEAD:prisma/migrations/0001_init/migration.sql', { encoding: 'utf8' });

// Replace all DATETIME occurrences
const newContent = originalContent.replace(/DATETIME/g, 'TIMESTAMP(3)');

// Write to file
writeFileSync('prisma/migrations/0001_init/migration.sql', newContent);
console.log('Done: replaced', (originalContent.match(/DATETIME/g) || []).length, 'occurrences');