import { useEffect, useState } from 'react'

const KEY = 'lpp-theme'

/**
 * Light/dark theme stored in localStorage and applied as a data-attribute on
 * <html>, which all the CSS custom properties key off.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

// Recharts takes colours as props rather than CSS, so the palette is duplicated here.
const PALETTES = {
  light: {
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltipBg: '#ffffff',
    tooltipBorder: '#cbd5e1',
    tooltipText: '#0f172a',
    accent: '#4f46e5',
    accentSoft: '#a5b4fc',
    actual: '#4f46e5',
    predicted: '#f59e0b',
    up: '#059669',
    down: '#dc2626',
    series: ['#4f46e5', '#0891b2', '#f59e0b', '#db2777', '#059669'],
  },
  dark: {
    grid: '#334155',
    axis: '#94a3b8',
    tooltipBg: '#1e293b',
    tooltipBorder: '#475569',
    tooltipText: '#f1f5f9',
    accent: '#818cf8',
    accentSoft: '#4c1d95',
    actual: '#818cf8',
    predicted: '#fbbf24',
    up: '#34d399',
    down: '#f87171',
    series: ['#818cf8', '#22d3ee', '#fbbf24', '#f472b6', '#34d399'],
  },
}

export const chartColors = (theme) => PALETTES[theme] ?? PALETTES.light

/** Shared <Tooltip> styling so every chart looks the same. */
export const tooltipStyle = (c) => ({
  contentStyle: {
    background: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: c.tooltipText,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  },
  labelStyle: { color: c.tooltipText, fontWeight: 600 },
  itemStyle: { color: c.tooltipText },
  cursor: { fill: c.grid, fillOpacity: 0.35 },
})
