import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  themeMode: 'vibrant',
  setThemeMode: () => {},
  isVibrant: true,
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem('em_theme_mode') || 'vibrant';
  });

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    localStorage.setItem('em_theme_mode', mode);
  };

  useEffect(() => {
    if (themeMode === 'vibrant') {
      document.documentElement.classList.add('theme-vibrant');
      document.documentElement.classList.remove('theme-classic');
    } else {
      document.documentElement.classList.add('theme-classic');
      document.documentElement.classList.remove('theme-vibrant');
    }
  }, [themeMode]);

  const isVibrant = themeMode === 'vibrant';

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isVibrant }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
