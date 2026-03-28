const fs = require('fs');
let code = fs.readFileSync('src/AppContext.jsx', 'utf8');

code = code.replace("import React, { createContext } from 'react';", "import React, { createContext, useState, useEffect } from 'react';");

const stateCode = `  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (`;

code = code.replace('  return (', stateCode);
code = code.replace('refreshSubscription,', 'refreshSubscription,\n      theme,\n      toggleTheme,');

fs.writeFileSync('src/AppContext.jsx', code, 'utf8');