const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
const appending = \\

[data-theme='light'] {
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --border-color: #e2e8f0;
  --theme-text-main: #0f172a;
  --theme-text-muted: #64748b;
  --bg-rgb: 255, 255, 255;
  --input-bg-default: rgba(255, 255, 255, 0.6);
  --input-bg-focus: rgba(255, 255, 255, 0.9);

  --bg-gradient-start: #f8fafc;
  --bg-gradient-end: #f1f5f9;

  --surface-color: rgba(255, 255, 255, 0.7);
  --surface-hover: rgba(255, 255, 255, 0.85);
  --surface-active: rgba(255, 255, 255, 0.95);
  --surface-border: rgba(255, 255, 255, 0.4);

  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
}
\\;
fs.writeFileSync('src/index.css', css + appending, 'utf8');
