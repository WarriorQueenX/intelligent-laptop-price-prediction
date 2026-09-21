import { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import { SCORED, OPTIONS, money } from '../lib/model'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

const SHOW = 10

/** Two thousand SVG circles make the chart sluggish, so the scatter is capped. */
const SCATTER_MAX = 600

function DealList({ title, hint, rows, tone }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="hint">{hint}</p>
      {rows.length === 0 ? (
        <p className="hint">No laptops in this group match the current filters.</p>
      ) : (
        <ol className="deals">
          {rows.map((l) => (
            <li key={l.id}>
              <div className="deal-main">
                <span className="deal-name">{l.brand} {l.model}</span>
                <span className="deal-spec">
                  {l.cpu} · {l.ram}GB · {l.storage}GB {l.storageType} · {l.gpu} · {l.screen}"
                </span>
              </div>
              <div className="deal-nums">
                <span className="deal-price">{money(l.actualPrice)}</span>
                <span className="deal-sub">est. {money(l.predicted)}</span>
              </div>
              <span className={`deal-pct ${tone}`}>
                {l.pct >= 0 ? '+' : ''}{l.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function BestDeals() {
  const c = useChartColors()
  const [brand, setBrand] = useState('All')
  const [maxPrice, setMaxPrice] = useState(5000)

  const pool = useMemo(
    () => SCORED.filter((l) => (brand === 'All' || l.brand === brand) && l.actualPrice <= maxPrice),
    [brand, maxPrice]
  )

  // Sorting a copy — SCORED is shared module state and must stay in dataset order.
  const byValue = useMemo(() => [...pool].sort((a, b) => a.pct - b.pct), [pool])
  // Filter by rating first so a small pool (e.g. one brand) can't list a fairly
  // priced laptop under "underpriced" just because it's the cheapest of a few.
  const under = byValue.filter((l) => l.tone === 'green').slice(0, SHOW)
  const over = byValue.filter((l) => l.tone === 'red').slice(-SHOW).reverse()

  const counts = useMemo(() => {
    const t = { green: 0, gray: 0, red: 0 }
    for (const l of pool) t[l.tone]++
    return t
  }, [pool])

  // Evenly sampled so the scatter still covers the full price range after capping.
  const points = useMemo(() => {
    const step = Math.ceil(pool.length / SCATTER_MAX) || 1
    return pool
      .filter((_, i) => i % step === 0)
      .map((l) => ({ actual: l.actualPrice, predicted: l.predicted, name: l.name }))
  }, [pool])

  // At most ~6 evenly spaced ticks on a $500 multiple, so the axis never ends on
  // something like $5,434 and both axes share one scale (needed for the diagonal).
  const dataMax = Math.max(1000, ...points.map((p) => Math.max(p.actual, p.predicted)))
  const step = Math.ceil(dataMax / 5 / 500) * 500
  const axisMax = Math.ceil(dataMax / step) * step
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step)

  return (
    <div className="stack">
      <div className="card">
        <h2>Find Deals</h2>
        <div className="grid">
          <label className="field">
            <span>Brand</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option>All</option>
              {OPTIONS.brand.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Max listed price — <b>{money(maxPrice)}</b></span>
            <input type="range" min={300} max={5000} step={100}
              value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
            <small>{pool.length.toLocaleString()} laptops in range</small>
          </label>
        </div>
        <div className="stat-strip">
          <div className="stat-chip">
            <span className="stat-label">Good deals</span>
            <span className="stat-value pos-text">{counts.green}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">Fairly priced</span>
            <span className="stat-value">{counts.gray}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">Overpriced</span>
            <span className="stat-value neg-text">{counts.red}</span>
          </div>
        </div>
      </div>

      <DealList
        title="Most Underpriced"
        hint="Listed more than 10% below what the model thinks the specs are worth."
        rows={under}
        tone="pos-text"
      />

      <DealList
        title="Most Overpriced"
        hint="Listed more than 10% above the model's estimate for these specs."
        rows={over}
        tone="neg-text"
      />

      <div className="card">
        <h2>Listed vs Predicted Price</h2>
        <p className="hint">
          Points on the dashed line are listed exactly at the model's estimate. Below the
          line means a bargain, above it means a premium.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ left: 8, right: 16, top: 10, bottom: 10 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="predicted" name="Predicted" domain={[0, axisMax]}
                ticks={ticks} tickFormatter={money}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <YAxis type="number" dataKey="actual" name="Listed" domain={[0, axisMax]}
                ticks={ticks} width={62} tickFormatter={money}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <ZAxis range={[26, 26]} />
              <Tooltip {...tooltipStyle(c)}
                formatter={(v, n) => [money(v), n]}
                labelFormatter={() => ''} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: axisMax, y: axisMax }]}
                stroke={c.predicted} strokeDasharray="6 4" />
              <Scatter data={points} fill={c.accent} fillOpacity={0.45}
                isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
