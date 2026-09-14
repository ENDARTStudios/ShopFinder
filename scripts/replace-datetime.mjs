import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('prisma/migrations/0001_init/migration.sql');
const content = readFileSync(filePath, 'utf8');
const newContent = content.replace(/DATETIME/g, 'TIMESTAMP(3)');

writeFileSync(filePath, newContent);
console.log('Replaced', content.match(/DATETIME/g)?.length || 0, 'occurrences');