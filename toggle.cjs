const fs = require('fs');
const path = require('path');
const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) filelist = walkSync(dirFile, filelist);
    else if (dirFile.endsWith('.jsx')) filelist.push(dirFile);
  });
  return filelist;
};
const files = walkSync('src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/'#22212c'/g, "'var(--bg-main)'");
  content = content.replace(/'#2d2c38'/g, "'var(--bg-card)'");
  content = content.replace(/'#3d3c48'/g, "'var(--border-color)'");
  content = content.replace(/'#ffffff'/g, "'var(--theme-text-main)'");
  content = content.replace(/'#a0a0ab'/g, "'var(--theme-text-muted)'");
  content = content.replace(/rgba\(34, 33, 44/g, "rgba(var(--bg-rgb)");
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});