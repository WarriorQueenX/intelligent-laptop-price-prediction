import { createContext, useContext } from 'react'
import { chartColors } from './theme'

export const ThemeContext = createContext('light')

/** Chart palette for the active theme. */
export const useChartColors = () => chartColors(useContext(ThemeContext))
