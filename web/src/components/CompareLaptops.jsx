import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { LAPTOPS, predict, explain, valueRating, specOf, money, formatValue } from '../lib/model'
import LaptopPicker from './LaptopPicker'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

const MAX = 5
const SPEC_ROWS = [
  ['Brand', (l) => l.brand],
  ['Model', (l) => l.model],
  ['CPU', (l) => l.cpu],
  ['RAM', (l) => `${l.ram} GB`],
  ['Storage', (l) => `${l.storage} GB`],
  ['Storage Type', (l) => l.storageType],
  ['GPU', (l) => l.gpu],
  ['Screen', (l) => `${l.screen}"`],
  ['Touch', (l) => l.touch],
  ['Status', (l) => l.status],
]

/**
 * Explains why laptop B is predicted higher/lower than laptop A by diffing their
 * per-feature contributions. Because the model is linear, these differences add
 * up exactly to the predicted-price gap.
 */
function explainGap(a, b) {
  const ea = explain(specOf(a))
  const eb = explain(specOf(b))
  const byFeature = Object.fromEntries(ea.map((p) => [p.feature, p]))

  return eb
    .map((p) => ({
      label: p.label,
      from: formatValue(p.feature, byFeature[p.feature].value),
      to: formatValue(p.feature, p.value),
      delta: p.contribution - byFeature[p.feature].contribution,
    }))
    .filter((p) => Math.abs(p.delta) >= 1 && p.from !== p.to)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
}

export default function CompareLaptops() {
  const c = useChartColors()
  const [ids, setIds] = useState([LAPTOPS[3].id, LAPTOPS[1].id])

  const picked = ids.map((id) => LAPTOPS.find((l) => l.id === id)).filter(Boolean)

  const rows = picked.map((l) => {
    const predicted = predict(specOf(l))
    return { laptop: l, predicted, rating: valueRating(l.actualPrice, predicted) }
  })

  // "Best value" = biggest discount versus the model's fair price.
  const bestValueId = rows.length
    ? rows.reduce((best, r) => (r.rating.pct < best.rating.pct ? r : best)).laptop.id
    : null

  // Functional updates so rapid clicks don't act on a stale `ids` array.
  const addSlot = () =>
    setIds((cur) => {
      if (cur.length >= MAX) return cur
      const next = LAPTOPS.find((l) => !cur.includes(l.id))
      return next ? [...cur, next.id] : cur
    })
  const removeSlot = (i) => setIds((cur) => (cur.length > 2 ? cur.filter((_, j) => j !== i) : cur))
  const changeSlot = (i, v) => setIds((cur) => cur.map((id, j) => (j === i ? v : id)))

  // A spec row is highlighted when the laptops don't all share the same value.
  const differs = (fn) => new Set(picked.map(fn)).size > 1

  const chartData = rows.map((r) => ({
    name: `${r.laptop.brand} ${r.laptop.model}`.slice(0, 18),
    Actual: Math.round(r.laptop.actualPrice),
    Predicted: Math.round(r.predicted),
  }))

  return (
    <div className="stack">
      <div className="card">
        <h2>Select 2–{MAX} Laptops</h2>
        {ids.map((id, i) => (
          <div className="slot" key={i}>
            <span className="slot-letter">{String.fromCharCode(65 + i)}</span>
            <LaptopPicker value={id} onChange={(v) => changeSlot(i, v)} />
            <button onClick={() => removeSlot(i)} disabled={ids.length <= 2}>Remove</button>
          </div>
        ))}
        <button className="reset" onClick={addSlot} disabled={ids.length >= MAX}>
          + Add laptop
        </button>
      </div>

      <div className="card scroll-x">
        <h2>Specs & Prices</h2>
        <p className="hint">Highlighted rows are specs that differ between the selected laptops.</p>
        <table className="cmp">
          <thead>
            <tr>
              <th>Spec</th>
              {rows.map((r) => (
                <th key={r.laptop.id}>
                  Laptop {String.fromCharCode(65 + rows.indexOf(r))}
                  {r.laptop.id === bestValueId && <span className="badge green tiny">Best Value</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map(([label, fn]) => (
              <tr key={label} className={differs(fn) ? 'diff' : ''}>
                <td>{label}</td>
                {picked.map((l) => <td key={l.id}>{fn(l)}</td>)}
              </tr>
            ))}
            <tr className="sep">
              <td>Actual Price</td>
              {rows.map((r) => <td key={r.laptop.id}><b>{money(r.laptop.actualPrice)}</b></td>)}
            </tr>
            <tr>
              <td>Predicted Price</td>
              {rows.map((r) => <td key={r.laptop.id}>{money(r.predicted)}</td>)}
            </tr>
            <tr>
              <td>Difference</td>
              {rows.map((r) => (
                <td key={r.laptop.id} className={r.rating.diff >= 0 ? 'neg-text' : 'pos-text'}>
                  {r.rating.diff >= 0 ? '+' : '−'}{money(Math.abs(r.rating.diff))} (
                  {r.rating.pct >= 0 ? '+' : ''}{r.rating.pct.toFixed(1)}%)
                </td>
              ))}
            </tr>
            <tr>
              <td>Verdict</td>
              {rows.map((r) => (
                <td key={r.laptop.id}><span className={`badge ${r.rating.tone} tiny`}>{r.rating.label}</span></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Actual vs Predicted</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="name" interval={0} angle={-12} textAnchor="end"
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${v}`} width={60}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} {...tooltipStyle(c)} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Bar dataKey="Actual" fill={c.actual} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Predicted" fill={c.predicted} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Why the Prices Differ</h2>
        <p className="hint">
          Each comparison is against Laptop A, broken down by which spec caused how much of the gap.
        </p>
        {rows.slice(1).map((r, i) => {
          const base = rows[0]
          const gap = r.predicted - base.predicted
          const reasons = explainGap(base.laptop, r.laptop)
          const letter = String.fromCharCode(66 + i)
          return (
            <div className="gap" key={r.laptop.id}>
              <h4>
                Laptop A vs Laptop {letter}:{' '}
                <span className={gap >= 0 ? 'neg-text' : 'pos-text'}>
                  {money(Math.abs(gap))} {gap >= 0 ? 'more' : 'less'}
                </span>{' '}
                (predicted)
              </h4>
              {reasons.length === 0 ? (
                <p className="hint">Specs are effectively identical — no meaningful price drivers differ.</p>
              ) : (
                <ul className="drivers">
                  {reasons.slice(0, 5).map((x) => (
                    <li key={x.label}>
                      <span className="driver-name">
                        {x.label}: <em>{x.from} → {x.to}</em>
                      </span>
                      <span className={x.delta >= 0 ? 'neg-text' : 'pos-text'}>
                        {x.delta >= 0 ? '+' : '−'}{money(Math.abs(x.delta))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
