import { useState, useMemo } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot,
} from 'recharts'
import { OPTIONS, LIMITS, predict, money } from '../lib/model'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

const START_SPEC = {
  brand: 'Asus', cpu: 'Intel Core i5', ram: 16, storage: 512,
  storageType: 'SSD', gpu: 'Integrated', screen: 15.6, touch: 'No', status: 'New',
}

// GPU dropdown is grouped so the user picks a family instead of scrolling 60 models.
const GPU_GROUPS = {
  Integrated: ['Integrated'],
  NVIDIA: OPTIONS.gpu.filter((g) => /^(RTX|GTX|MX|Quadro|T\d|A\d)/.test(g)),
  AMD: OPTIONS.gpu.filter((g) => /Radeon/i.test(g)),
}
GPU_GROUPS.Other = OPTIONS.gpu.filter(
  (g) => !GPU_GROUPS.Integrated.includes(g) && !GPU_GROUPS.NVIDIA.includes(g) && !GPU_GROUPS.AMD.includes(g)
)

const RAM_STEPS = [2, 4, 8, 12, 16, 24, 32, 40, 48, 64]
const STORAGE_STEPS = [128, 256, 512, 1000, 1500, 2000]
const SCREEN_STEPS = [11.6, 12.5, 13.3, 14, 15.6, 16, 17.3]

/** Re-scores the laptop across a range of one feature, holding everything else fixed. */
function sweep(spec, key, values) {
  return values.map((v) => ({ x: v, price: predict({ ...spec, [key]: v }) }))
}

function Sweep({ title, data, current, unit, c }) {
  return (
    <div className="chart">
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={data} margin={{ left: 0, right: 14, top: 10, bottom: 4 }}>
          <defs>
            <linearGradient id={`fill-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis dataKey="x" stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${Math.round(v)}`} width={58}
            stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
          <Tooltip formatter={(v) => [money(v), 'Predicted']}
            labelFormatter={(l) => `${l}${unit}`} {...tooltipStyle(c)} />
          <Area type="monotone" dataKey="price" stroke="none"
            fill={`url(#fill-${title.replace(/\W/g, '')})`} isAnimationActive={false} />
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
  const screenData = useMemo(() => sweep(spec, 'screen', SCREEN_STEPS), [spec])

  // Per-unit sensitivity, read straight off the sweeps.
  const ramRate = (predict({ ...spec, ram: spec.ram + 8 }) - price)
  const storageRate = (predict({ ...spec, storage: spec.storage + 256 }) - price)
  const screenRate = (predict({ ...spec, screen: spec.screen + 1 }) - price)
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
          {spec.brand} · {spec.cpu} · {spec.ram}GB RAM · {spec.storage}GB {spec.storageType} ·{' '}
          {spec.gpu} · {spec.screen}" · Touch: {spec.touch} · {spec.status}
        </p>
      </div>

      <div className="card">
        <h2>Adjust Features</h2>
        <div className="grid">
          <label className="field">
            <span>RAM — <b>{spec.ram} GB</b></span>
            <input type="range" min={LIMITS.ram.min} max={LIMITS.ram.max} step={2}
              value={spec.ram} onChange={(e) => set('ram', Number(e.target.value))} />
            <small>{delta(ramRate)} ({pct(ramRate)}) per +8 GB</small>
          </label>

          <label className="field">
            <span>Storage — <b>{spec.storage} GB</b></span>
            <input type="range" min={LIMITS.storage.min} max={LIMITS.storage.max} step={128}
              value={spec.storage} onChange={(e) => set('storage', Number(e.target.value))} />
            <small>{delta(storageRate)} ({pct(storageRate)}) per +256 GB</small>
          </label>

          <label className="field">
            <span>Screen — <b>{spec.screen}"</b></span>
            <input type="range" min={LIMITS.screen.min} max={17.3} step={0.1}
              value={spec.screen} onChange={(e) => set('screen', Number(e.target.value))} />
            <small>{delta(screenRate)} ({pct(screenRate)}) per +1 inch</small>
          </label>

          <label className="field">
            <span>Brand</span>
            <select value={spec.brand} onChange={(e) => set('brand', e.target.value)}>
              {OPTIONS.brand.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>

          <label className="field">
            <span>GPU</span>
            <select value={spec.gpu} onChange={(e) => set('gpu', e.target.value)}>
              {Object.entries(GPU_GROUPS).map(([group, list]) =>
                list.length ? (
                  <optgroup key={group} label={group}>
                    {list.map((g) => <option key={g}>{g}</option>)}
                  </optgroup>
                ) : null
              )}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select value={spec.status} onChange={(e) => set('status', e.target.value)}>
              {OPTIONS.status.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Storage Type</span>
            <select value={spec.storageType} onChange={(e) => set('storageType', e.target.value)}>
              {OPTIONS.storageType.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Touch Screen</span>
            <div className="toggle">
              {['No', 'Yes'].map((v) => (
                <button key={v} className={spec.touch === v ? 'on' : ''} onClick={() => set('touch', v)}>
                  {v}
                </button>
              ))}
            </div>
            <small>Switching adds {delta(touchRate)} ({pct(touchRate)})</small>
          </label>

          <label className="field">
            <span>CPU</span>
            <select value={spec.cpu} onChange={(e) => set('cpu', e.target.value)}>
              {OPTIONS.cpu.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
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
          <Sweep title="Price vs Screen Size" data={screenData} unit='"' c={c}
            current={{ x: spec.screen, y: price }} />
        </div>
      </div>
    </div>
  )
}
