const THEMES = [
  {
    id: 'default',
    name: 'Đại dương (Mặc định)',
    colors: {
      '--color-primary': '#1d4ed8',
      '--color-primary-light': '#2563eb',
      '--color-primary-dark': '#1e40af',
      '--color-primary-50': '#eff6ff',
      '--color-primary-100': '#dbeafe',
      '--color-navy': '#0b1a36',
      '--color-navy-light': '#1e3a8a',
      '--color-navy-dark': '#020617'
    }
  },
  {
    id: 'nature',
    name: 'Thiên nhiên',
    colors: {
      '--color-primary': '#16a34a',
      '--color-primary-light': '#22c55e',
      '--color-primary-dark': '#15803d',
      '--color-primary-50': '#f0fdf4',
      '--color-primary-100': '#dcfce7',
      '--color-navy': '#064e3b',
      '--color-navy-light': '#065f46',
      '--color-navy-dark': '#022c22'
    }
  },
  {
    id: 'sunset',
    name: 'Hoàng hôn',
    colors: {
      '--color-primary': '#ea580c',
      '--color-primary-light': '#f97316',
      '--color-primary-dark': '#c2410c',
      '--color-primary-50': '#fff7ed',
      '--color-primary-100': '#ffedd5',
      '--color-navy': '#431407',
      '--color-navy-light': '#7c2d12',
      '--color-navy-dark': '#2a0a03'
    }
  },
  {
    id: 'rose',
    name: 'Hoa hồng',
    colors: {
      '--color-primary': '#e11d48',
      '--color-primary-light': '#f43f5e',
      '--color-primary-dark': '#be123c',
      '--color-primary-50': '#fff1f2',
      '--color-primary-100': '#ffe4e6',
      '--color-navy': '#4c0519',
      '--color-navy-light': '#881337',
      '--color-navy-dark': '#2a030d'
    }
  },
  {
    id: 'royal',
    name: 'Hoàng gia',
    colors: {
      '--color-primary': '#7c3aed',
      '--color-primary-light': '#8b5cf6',
      '--color-primary-dark': '#6d28d9',
      '--color-primary-50': '#f5f3ff',
      '--color-primary-100': '#ede9fe',
      '--color-navy': '#2e1065',
      '--color-navy-light': '#4c1d95',
      '--color-navy-dark': '#1e0842'
    }
  }
];

// Injects default CSS variables immediately before page renders
function injectDefaultThemeVars() {
  const styleId = 'theme-vars-style';
  if (document.getElementById(styleId)) return;
  
  const defaultTheme = THEMES[0];
  let cssStr = ':root {\n';
  for (const [key, value] of Object.entries(defaultTheme.colors)) {
    cssStr += `  ${key}: ${value};\n`;
  }
  cssStr += '}';
  
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = cssStr;
  document.head.appendChild(styleEl);
}

// Applies a selected theme dynamically
function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  for (const [key, value] of Object.entries(theme.colors)) {
    document.documentElement.style.setProperty(key, value);
  }
}

window.THEMES = THEMES;
window.applyTheme = applyTheme;

// Ensure default variables are injected immediately on script load
injectDefaultThemeVars();
