import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 p-0.5 bg-em-panel/90 rounded-sm border border-em-line text-2xs font-semibold uppercase tracking-wider">
      <button
        type="button"
        onClick={() => setThemeMode('classic')}
        className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
          themeMode === 'classic'
            ? 'bg-white text-em-graphite font-bold shadow-xs border border-em-line'
            : 'text-em-steel hover:text-em-graphite'
        }`}
        title="Classic Industrial Palette (Main)"
      >
        {themeMode === 'classic' && <Check className="h-3 w-3 text-em-amber font-bold" />}
        <span>Classic (Main)</span>
      </button>
      <button
        type="button"
        onClick={() => setThemeMode('vibrant')}
        className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
          themeMode === 'vibrant'
            ? 'bg-em-navy text-white font-bold shadow-xs border border-em-navy'
            : 'text-em-steel hover:text-em-graphite'
        }`}
        title="Vibrant Feature-Colored Workstation"
      >
        <Palette className="h-3 w-3 text-em-amber" />
        <span>{compact ? 'Vibrant' : 'Vibrant Colors'}</span>
      </button>
    </div>
  );
}
