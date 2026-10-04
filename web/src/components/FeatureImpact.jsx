import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot,
} from 'recharts'
import { OPTIONS, predict, money, moneyShort, title, warrantyLabel } from '../lib/model'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

const START_SPEC = {
  brand: 'asus', processorBrand: 'intel', processorTier: 'core i5', cores: 8,
  ram: 16, storage: 512, storageType: 'SSD', gpuBrand: 'intel', gpuType: 'integrated',
  display: 15.6, resWidth: 1920, resHeight: 1080, touch: 'No', os: 'windows', warranty: '1',
}

// Slider bounds are kept near the range actually present in the data — the model
// has never seen a 96 GB laptop, so letting the slider go there invents prices.
const RANGES = {
  ram: { min: 2, max: 64, step: 2 },
  storage: { min: 64, max: 2048, step: 64 },
  cores: { min: 2, max: 24, step: 1 },
  display: { min: 11, max: 18, step: 0.1 },
}

const RAM_STEPS = [2, 4, 8, 12, 16, 24, 32, 48, 64]
const STORAGE_STEPS = [64, 128, 256, 512, 1024, 1536, 2048]
const CORE_STEPS = [2, 4, 6, 8, 10, 12, 14, 16]
const DISPLAY_STEPS = [11.6, 13.3, 14, 15.6, 16, 17.3]

/** Re-scores the laptop across a range of one feature, holding everything else fixed. */
function sweep(spec, key, values) {
  return values.map((v) => ({ x: v, price: predict({ ...spec, [key]: v }) }))
}

function Sweep({ title: heading, data, current, unit, c }) {
  const id = heading.replace(/\W/g, '')
  return (
    <div className="chart">
      <h4>{heading}</h4>
      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={data} margin={{ left: 0, right: 14, top: 10, bottom: 4 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="x" stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
          <YAxis tickFormatter={moneyShort} width={58}
            stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
          <Tooltip formatter={(v) => [money(v), 'Predicted']}
            labelFormatter={(l) => `${l}${unit}`} {...tooltipStyle(c)} />
          <Area type="monotone" dataKey="price" stroke="none"
            fill={`url(#fill-${id})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="price" stroke={c.accent} strokeWidth={2.5}
            dot={{ r: 2.5, fill: c.accent, strokeWidth: 0 }}
            activeDot={{ r: 5 }} isAnimationActive={false} />
          <ReferenceDot x={current.x} y={current.y} r={6} fill={c.predicted}
            stroke={c.tooltipBg} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function FeatureImpact() {
  const c = useChartColors()
  const [spec, setSpec] = useState(START_SPEC)
  const set = (k, v) => setSpec((s) => ({ ...s, [k]: v }))

  const price = useMemo(() => predict(spec), [spec])

  const ramData = useMemo(() => sweep(spec, 'ram', RAM_STEPS), [spec])
  const storageData = useMemo(() => sweep(spec, 'storage', STORAGE_STEPS), [spec])
  const coreData = useMemo(() => sweep(spec, 'cores', CORE_STEPS), [spec])
  const displayData = useMemo(() => sweep(spec, 'display', DISPLAY_STEPS), [spec])

  // Per-unit sensitivity, read straight off the model.
  const ramRate = predict({ ...spec, ram: spec.ram + 8 }) - price
  const storageRate = predict({ ...spec, storage: spec.storage + 256 }) - price
  const coreRate = predict({ ...spec, cores: spec.cores + 2 }) - price
  const displayRate = predict({ ...spec, display: spec.display + 1 }) - price
  const touchRate = predict({ ...spec, touch: spec.touch === 'Yes' ? 'No' : 'Yes' }) - price

  const pct = (d) => `${d >= 0 ? '+' : ''}${((d / price) * 100).toFixed(1)}%`
  const delta = (d) => `${d >= 0 ? '+' : '−'}${money(Math.abs(d))}`

  return (
    <div className="stack">
      <div className="card sticky-price">
        <div className="sticky-price-main">
          <span className="price-label">Current specs predicted price</span>
          <span className="price-value big">{money(price)}</span>
        </div>
        <p className="hint">
          {title(spec.brand)} · {title(spec.processorTier)} · {spec.cores} cores · {spec.ram}GB RAM ·{' '}
          {spec.storage}GB {spec.storageType} · {title(spec.gpuType)} {title(spec.gpuBrand)} ·{' '}
          {spec.display}" · Touch: {spec.touch} · {title(spec.os)}
        </p>
      </div>

      <div className="card">
        <h2>Adjust Features</h2>
        <div className="grid">
          <label className="field">
            <span>RAM — <b>{spec.ram} GB</b></span>
            <input type="range" {...RANGES.ram}
              value={spec.ram} onChange={(e) => set('ram', Number(e.target.value))} />
            <small>{delta(ramRate)} ({pct(ramRate)}) per +8 GB</small>
          </label>

          <label className="field">
            <span>Storage — <b>{spec.storage} GB</b></span>
            <input type="range" {...RANGES.storage}
              value={spec.storage} onChange={(e) => set('storage', Number(e.target.value))} />
            <small>{delta(storageRate)} ({pct(storageRate)}) per +256 GB</small>
          </label>

          <label className="field">
            <span>CPU Cores — <b>{spec.cores}</b></span>
            <input type="range" {...RANGES.cores}
              value={spec.cores} onChange={(e) => set('cores', Number(e.target.value))} />
            <small>{delta(coreRate)} ({pct(coreRate)}) per +2 cores</small>
          </label>

          <label className="field">
            <span>Display — <b>{spec.display}"</b></span>
            <input type="range" {...RANGES.display}
              value={spec.display} onChange={(e) => set('display', Number(e.target.value))} />
            <small>{delta(displayRate)} ({pct(displayRate)}) per +1 inch</small>
          </label>

          <label className="field">
            <span>Brand</span>
            <select value={spec.brand} onChange={(e) => set('brand', e.target.value)}>
              {OPTIONS.brand.map((b) => <option key={b} value={b}>{title(b)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Processor</span>
            <select value={spec.processorTier} onChange={(e) => set('processorTier', e.target.value)}>
              {OPTIONS.processorTier.map((p) => <option key={p} value={p}>{title(p)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>GPU Type</span>
            <select value={spec.gpuType} onChange={(e) => set('gpuType', e.target.value)}>
              {OPTIONS.gpuType.map((g) => <option key={g} value={g}>{title(g)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>GPU Brand</span>
            <select value={spec.gpuBrand} onChange={(e) => set('gpuBrand', e.target.value)}>
              {OPTIONS.gpuBrand.map((g) => <option key={g} value={g}>{title(g)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Storage Type</span>
            <select value={spec.storageType} onChange={(e) => set('storageType', e.target.value)}>
              {OPTIONS.storageType.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Operating System</span>
            <select value={spec.os} onChange={(e) => set('os', e.target.value)}>
              {OPTIONS.os.map((o) => <option key={o} value={o}>{title(o)}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Warranty</span>
            <select value={spec.warranty} onChange={(e) => set('warranty', e.target.value)}>
              {OPTIONS.warranty.map((w) => <option key={w} value={w}>{warrantyLabel(w)}</option>)}
            </select>
          </label>

          <div className="field">
            <span>Touch Screen</span>
            <div className="toggle">
              {['No', 'Yes'].map((v) => (
                <button key={v} className={spec.touch === v ? 'on' : ''} onClick={() => set('touch', v)}>
                  {v}
                </button>
              ))}
            </div>
            <small>Switching adds {delta(touchRate)} ({pct(touchRate)})</small>
          </div>
        </div>
        <button className="reset" onClick={() => setSpec(START_SPEC)}>Reset to defaults</button>
      </div>

      <div className="card">
        <h2>Price Trajectory</h2>
        <p className="hint">
          The highlighted dot marks your current setting. Every other spec stays fixed.
        </p>
        <div className="grid">
          <Sweep title="Price vs RAM" data={ramData} unit=" GB" c={c}
            current={{ x: spec.ram, y: price }} />
          <Sweep title="Price vs Storage" data={storageData} unit=" GB" c={c}
            current={{ x: spec.storage, y: price }} />
          <Sweep title="Price vs CPU Cores" data={coreData} unit=" cores" c={c}
            current={{ x: spec.cores, y: price }} />
          <Sweep title="Price vs Display Size" data={displayData} unit='"' c={c}
            current={{ x: spec.display, y: price }} />
        </div>
      </div>
    </div>
  )
}
