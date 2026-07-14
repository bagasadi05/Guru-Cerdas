const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Match <button that doesn't have type= inside its opening tag
  const regex = /<button(?![^>]*type=)([^>]*)>/g;
  if (regex.test(content)) {
    content = content.replace(regex, '<button type=\"button\"$1>');
    fs.writeFileSync(file, content, 'utf8');
    changed++;
  }
});
console.log('Fixed ' + changed + ' files');
