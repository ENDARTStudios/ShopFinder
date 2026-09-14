// Script to replace DATETIME with TIMESTAMP(3) in migration.sql
import { readFileSync, writeFileSync } from 'fs';

// Read the migration file
const filePath = 'prisma/migrations/0001_init/migration.sql';
let content = readFileSync(filePath, 'utf8');

// Replace all DATETIME occurrences
const newContent = content.replace(/DATETIME/g, 'TIMESTAMP(3)');

// Write to file
writeFileSync(filePath, newContent);
console.log('Done: replaced', (content.match(/DATETIME/g) || []).length, 'occurrences');
