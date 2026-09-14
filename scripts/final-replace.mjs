// Script to replace DATETIME with TIMESTAMP(3) in migration.sql using git show
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { exec } = require('child_process');

// Use git to get the file content
const gitProcess = exec('git --no-pager show HEAD:prisma/migrations/0001_init/migration.sql', { encoding: 'utf8' });

let content = '';

gitProcess.stdout.on('data', (data) => {
  content += data;
});

gitProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Git process exited with code', code);
    process.exit(1);
  }
  
  const newContent = content.replace(/DATETIME/g, 'TIMESTAMP(3)');
  require('fs').writeFileSync('prisma/migrations/0001_init/migration.sql', newContent);
  console.log('Replaced', (content.match(/DATETIME/g) || []).length, 'occurrences');
});