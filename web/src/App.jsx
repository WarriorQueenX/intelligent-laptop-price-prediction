import { useState } from 'react'
import SinglePrediction from './components/SinglePrediction'
import FeatureImpact from './components/FeatureImpact'
import CompareLaptops from './components/CompareLaptops'
import BestDeals from './components/BestDeals'
import DatasetInsights from './components/DatasetInsights'
import BudgetFinder from './components/BudgetFinder'
import { METRICS, LAPTOPS, money } from './lib/model'
import { useTheme } from './lib/theme'
import { ThemeContext } from './lib/ThemeContext'
import './App.css'

const TABS = [
  ['single', 'Single Prediction', SinglePrediction],
  ['impact', 'Feature Impact', FeatureImpact],
  ['compare', 'Compare Laptops', CompareLaptops],
  ['deals', 'Best Deals', BestDeals],
  ['budget', 'Budget Finder', BudgetFinder],
  ['insights', 'Dataset Insights', DatasetInsights],
]

export default function App() {
  const [tab, setTab] = useState('single')
  const [theme, toggleTheme] = useTheme()
  const Active = TABS.find((t) => t[0] === tab)[2]

  return (
    <ThemeContext.Provider value={theme}>
      <div className="app">
        <header>
          <div className="header-top">
            <div>
              <h1>Intelligent Laptop Price Prediction</h1>
              <p className="tagline">
                Estimate a fair price from specs, then see whether a listing is a deal.
              </p>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>

          <div className="stat-strip">
            <Stat label="Model" value="Linear Regression" accent />
            <Stat label="Laptops" value={LAPTOPS.length.toLocaleString()} />
            <Stat label="Test R²" value={METRICS.r2} />
            <Stat label="Mean Error" value={money(METRICS.mae)} />
          </div>
        </header>

        <nav className="tabs">
          {TABS.map(([key, label]) => (
            <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>

        <main><Active /></main>

        <footer>
          BASCE301 Exploratory Data Analysis · Batch 14
          <br />
          Predictions use the notebook's Linear Regression coefficients exported to JSON.
        </footer>
      </div>
    </ThemeContext.Provider>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat-chip">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${accent ? ' accent' : ''}`}>{value}</span>
    </div>
  )
}
