const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));
const errors = data.map(v => v.messages.filter(m => m.severity === 2).length).reduce((a, b) => a + b, 0);
const warnings = data.map(v => v.messages.filter(m => m.severity === 1).length).reduce((a, b) => a + b, 0);
console.log('Errors:', errors, 'Warnings:', warnings);

// Also list files with most errors
const fileErrors = data.map(v => ({
    file: v.filePath.split('\\').pop().split('/').pop(),
    errors: v.messages.filter(m => m.severity === 2).length,
    warnings: v.messages.filter(m => m.severity === 1).length
})).filter(v => v.errors > 0 || v.warnings > 0).sort((a, b) => (b.errors + b.warnings) - (a.errors + a.warnings));

console.log('\nTop files with issues:');
fileErrors.slice(0, 5).forEach(f => console.log(`${f.file}: ${f.errors} errors, ${f.warnings} warnings`));
