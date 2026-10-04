import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  LAPTOPS, OPTIONS, LIMITS, predict, explain, valueRating, specOf, money, moneyShort,
  validate, formatValue, title, warrantyLabel,
} from '../lib/model'
import LaptopPicker from './LaptopPicker'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

/**
 * Recharts' `position="right"` puts the label at the bar's right edge, which for a
 * negative (left-pointing) bar lands on top of the Y-axis ticks. Recharts anchors
 * `x` at the zero line and gives a signed `width`, so `x + width` is the bar's
 * outer end regardless of direction — put the label just past that.
 */
function ContributionLabel({ x, y, width, height, value, fill }) {
  const negative = value < 0
  const end = x + width
  return (
    <text
      x={negative ? end - 6 : end + 6}
      y={y + height / 2}
      dy={4}
      textAnchor={negative ? 'end' : 'start'}
      fill={fill}
      fontSize={11}
      fontWeight={600}
    >
      {moneyShort(value)}
    </text>
  )
}

const DEFAULT_SPEC = {
  brand: 'asus', processorBrand: 'intel', processorTier: 'core i5', cores: 8,
  ram: 16, storage: 512, storageType: 'SSD', gpuBrand: 'intel', gpuType: 'integrated',
  display: 15.6, resWidth: 1920, resHeight: 1080, touch: 'No', os: 'windows', warranty: '1',
}

export default function SinglePrediction() {
  const c = useChartColors()
  const [mode, setMode] = useState('dataset') // 'dataset' | 'custom'
  const [selectedId, setSelectedId] = useState(LAPTOPS[0].id)
  const [customSpec, setCustomSpec] = useState(DEFAULT_SPEC)

  const selected = LAPTOPS.find((l) => l.id === selectedId)
  const spec = mode === 'dataset' ? specOf(selected) : customSpec
  const actualPrice = mode === 'dataset' ? selected.actualPrice : null

  // Scoring is a handful of multiply-adds, so there is nothing worth memoizing here.
  const errors = validate(spec)
  const predicted = errors.length ? null : predict(spec)
  const drivers = predicted === null ? [] : explain(spec)

  const rating = actualPrice !== null && predicted ? valueRating(actualPrice, predicted) : null
  const top3 = drivers.slice(0, 3)

  const set = (k, v) => setCustomSpec((s) => ({ ...s, [k]: v }))
  const setResolution = (label) => {
    const r = OPTIONS.resolution.find((o) => o.label === label)
    setCustomSpec((s) => ({ ...s, resWidth: r.width, resHeight: r.height }))
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="tabs-mini">
          <button className={mode === 'dataset' ? 'on' : ''} onClick={() => setMode('dataset')}>
            Pick from dataset
          </button>
          <button className={mode === 'custom' ? 'on' : ''} onClick={() => setMode('custom')}>
            Enter custom specs
          </button>
        </div>

        {mode === 'dataset' ? (
          <label className="field">
            <span>Laptop ({LAPTOPS.length} available)</span>
            <LaptopPicker value={selectedId} onChange={setSelectedId} />
          </label>
        ) : (
          <div className="grid">
            <label className="field">
              <span>Brand</span>
              <select value={customSpec.brand} onChange={(e) => set('brand', e.target.value)}>
                {OPTIONS.brand.map((b) => <option key={b} value={b}>{title(b)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Processor Brand</span>
              <select value={customSpec.processorBrand}
                onChange={(e) => set('processorBrand', e.target.value)}>
                {OPTIONS.processorBrand.map((p) => <option key={p} value={p}>{title(p)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Processor</span>
              <select value={customSpec.processorTier}
                onChange={(e) => set('processorTier', e.target.value)}>
                {OPTIONS.processorTier.map((p) => <option key={p} value={p}>{title(p)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>CPU Cores</span>
              <input type="number" min={LIMITS.cores.min} max={LIMITS.cores.max}
                value={customSpec.cores} onChange={(e) => set('cores', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>RAM (GB)</span>
              <input type="number" min={LIMITS.ram.min} max={LIMITS.ram.max}
                value={customSpec.ram} onChange={(e) => set('ram', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Storage (GB)</span>
              <input type="number" min={LIMITS.storage.min} max={LIMITS.storage.max} step={128}
                value={customSpec.storage} onChange={(e) => set('storage', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Storage Type</span>
              <select value={customSpec.storageType} onChange={(e) => set('storageType', e.target.value)}>
                {OPTIONS.storageType.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>GPU Brand</span>
              <select value={customSpec.gpuBrand} onChange={(e) => set('gpuBrand', e.target.value)}>
                {OPTIONS.gpuBrand.map((g) => <option key={g} value={g}>{title(g)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>GPU Type</span>
              <select value={customSpec.gpuType} onChange={(e) => set('gpuType', e.target.value)}>
                {OPTIONS.gpuType.map((g) => <option key={g} value={g}>{title(g)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Display (inches)</span>
              <input type="number" step={0.1} min={LIMITS.display.min} max={LIMITS.display.max}
                value={customSpec.display} onChange={(e) => set('display', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Resolution</span>
              <select value={`${customSpec.resWidth} x ${customSpec.resHeight}`}
                onChange={(e) => setResolution(e.target.value)}>
                {OPTIONS.resolution.map((r) => <option key={r.label}>{r.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Touch Screen</span>
              <select value={customSpec.touch} onChange={(e) => set('touch', e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
            </label>
            <label className="field">
              <span>Operating System</span>
              <select value={customSpec.os} onChange={(e) => set('os', e.target.value)}>
                {OPTIONS.os.map((o) => <option key={o} value={o}>{title(o)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Warranty</span>
              <select value={customSpec.warranty} onChange={(e) => set('warranty', e.target.value)}>
                {OPTIONS.warranty.map((w) => <option key={w} value={w}>{warrantyLabel(w)}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="card error">
          <strong>Cannot predict:</strong>
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {predicted !== null && (
        <>
          <div className="card">
            <h2>Prediction</h2>
            <div className="price-row">
              <div className="price-box lead">
                <span className="price-label">Predicted Price</span>
                <span className="price-value">{money(predicted)}</span>
              </div>
              {actualPrice !== null && (
                <>
                  <div className="price-box">
                    <span className="price-label">Actual Price</span>
                    <span className="price-value">{money(actualPrice)}</span>
                  </div>
                  <div className="price-box">
                    <span className="price-label">Difference</span>
                    <span className={`price-value ${rating.diff >= 0 ? 'neg' : 'pos'}`}>
                      {rating.diff >= 0 ? '+' : '−'}{money(Math.abs(rating.diff))}
                      <small> ({rating.pct >= 0 ? '+' : ''}{rating.pct.toFixed(1)}%)</small>
                    </span>
                  </div>
                </>
              )}
            </div>
            {rating && <span className={`badge ${rating.tone}`}>{rating.label}</span>}
            {actualPrice === null && (
              <p className="hint">Custom specs have no listed price, so there is nothing to compare against.</p>
            )}
          </div>

          <div className="card">
            <h2>Top 3 Features Driving This Price</h2>
            <p className="hint">
              Measured against an average laptop in the dataset. Positive values push the price up.
            </p>
            <ul className="drivers">
              {top3.map((d) => (
                <li key={d.feature}>
                  <span className="driver-name">
                    {d.label} <em>({formatValue(d.feature, d.value)})</em>
                  </span>
                  <span className={d.contribution >= 0 ? 'pos-text' : 'neg-text'}>
                    {d.contribution >= 0 ? '+' : '−'}{money(Math.abs(d.contribution))} ({d.share.toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>

            <div className="chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={drivers.slice(0, 8)} layout="vertical"
                  margin={{ left: 12, right: 56, top: 5, bottom: 5 }}>
                  <CartesianGrid horizontal={false} stroke={c.grid} strokeDasharray="3 3" />
                  {/* Slack at both ends so the outside labels stay inside the plot */}
                  <XAxis type="number" tickFormatter={moneyShort}
                    domain={['dataMin - 4000', 'dataMax + 4000']} tickCount={6}
                    stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={118}
                    stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                  <Tooltip formatter={(v) => [money(v), 'Contribution']} {...tooltipStyle(c)} />
                  <ReferenceLine x={0} stroke={c.axis} />
                  <Bar dataKey="contribution" radius={3} isAnimationActive={false}>
                    {drivers.slice(0, 8).map((d) => (
                      <Cell key={d.feature} fill={d.contribution >= 0 ? c.up : c.down} />
                    ))}
                    <LabelList dataKey="contribution"
                      content={<ContributionLabel fill={c.axis} />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
