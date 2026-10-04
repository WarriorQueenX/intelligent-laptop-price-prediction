import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { LAPTOPS, METRICS, explain, specOf, money, moneyShort, title } from '../lib/model'
import { useChartColors } from '../lib/ThemeContext'
import { tooltipStyle } from '../lib/theme'

const TOP_BRANDS = 12
const MIN_LISTINGS = 10 // averages over a handful of listings are just noise
const BUCKET = 25000 // price histogram bin width in rupees
const CHEAP = 100000 // "budget" cut-off quoted in the histogram caption (₹1 lakh)

/** Groups laptops by a key and returns [{ key, avg, count }] sorted by avg price. */
function avgPriceBy(keyFn) {
  const groups = new Map()
  for (const l of LAPTOPS) {
    const k = keyFn(l)
    const g = groups.get(k) ?? { key: k, sum: 0, count: 0 }
    g.sum += l.actualPrice
    g.count++
    groups.set(k, g)
  }
  return [...groups.values()]
    .map((g) => ({ key: g.key, avg: g.sum / g.count, count: g.count }))
    .sort((a, b) => b.avg - a.avg)
}

// The whole dataset is static, so every aggregate is computed once at module load.
const BRANDS = avgPriceBy((l) => title(l.brand))
  .filter((b) => b.count >= MIN_LISTINGS)
  .slice(0, TOP_BRANDS)

const RAM_AVG = avgPriceBy((l) => l.ram)
  .filter((r) => r.count >= MIN_LISTINGS)
  .sort((a, b) => a.key - b.key)

const HISTOGRAM = (() => {
  // Pre-fill every band with 0 — skipping empty bands would squash the price axis.
  const top = Math.max(...LAPTOPS.map((l) => l.actualPrice))
  const counts = new Array(Math.floor(top / BUCKET) + 1).fill(0)
  for (const l of LAPTOPS) counts[Math.floor(l.actualPrice / BUCKET)]++
  return counts.map((count, i) => ({ label: moneyShort(i * BUCKET), start: i * BUCKET, count }))
})()

// The model sees some specs through more than one column (processor brand + tier,
// GPU brand + type, screen width + height). Those move together when you change
// the spec, so their effects are summed into one bar here.
const SPEC_GROUPS = {
  RAM: ['ram_memory'],
  Storage: ['primary_storage_capacity'],
  'Storage Type': ['primary_storage_type'],
  'CPU Cores': ['num_cores'],
  Processor: ['processor_brand', 'processor_tier'],
  GPU: ['gpu_brand', 'gpu_type'],
  Brand: ['brand'],
  'Display Size': ['display_size'],
  Resolution: ['resolution_width', 'resolution_height'],
  'Touch Screen': ['is_touch'],
  'Operating System': ['OS'],
  Warranty: ['year_of_warranty'],
}

// Importance = the average number of rupees a spec moves a laptop's prediction
// away from the dataset-average laptop, taken over every listing.
const IMPORTANCE_ROWS = (() => {
  const sums = Object.fromEntries(Object.keys(SPEC_GROUPS).map((g) => [g, 0]))
  for (const l of LAPTOPS) {
    const byFeature = Object.fromEntries(explain(specOf(l)).map((p) => [p.feature, p.contribution]))
    for (const [group, features] of Object.entries(SPEC_GROUPS)) {
      sums[group] += Math.abs(features.reduce((a, f) => a + byFeature[f], 0))
    }
  }
  return Object.entries(sums)
    .map(([label, sum]) => ({ label, value: sum / LAPTOPS.length }))
    .sort((a, b) => b.value - a.value)
})()

const PRICES = LAPTOPS.map((l) => l.actualPrice).sort((a, b) => a - b)
const MEDIAN = PRICES[Math.floor(PRICES.length / 2)]
const MEAN = PRICES.reduce((a, b) => a + b, 0) / PRICES.length
const SHARE_CHEAP = Math.round((PRICES.filter((p) => p < CHEAP).length / PRICES.length) * 100)

export default function DatasetInsights() {
  const c = useChartColors()

  return (
    <div className="stack">
      <div className="card">
        <h2>Dataset at a Glance</h2>
        <div className="stat-strip">
          <Chip label="Laptops" value={LAPTOPS.length.toLocaleString('en-IN')} />
          <Chip label="Brands" value={new Set(LAPTOPS.map((l) => l.brand)).size} />
          <Chip label="Median price" value={money(MEDIAN)} />
          <Chip label="Mean price" value={money(MEAN)} />
          <Chip label="Cheapest" value={money(PRICES[0])} />
          <Chip label="Priciest" value={money(PRICES[PRICES.length - 1])} />
        </div>
        <p className="hint">
          Model trained on {METRICS.trainRows.toLocaleString('en-IN')} rows and tested on{' '}
          {METRICS.testRows.toLocaleString('en-IN')}, reaching R² {METRICS.r2} with a mean error of{' '}
          {money(METRICS.mae)} (5-fold cross-validated R² {METRICS.cvR2}).
        </p>
      </div>

      <div className="card">
        <h2>What Moves the Price Most</h2>
        <p className="hint">
          Average rupees each spec shifts a prediction away from the typical laptop, across all{' '}
          {LAPTOPS.length.toLocaleString('en-IN')} listings. {IMPORTANCE_ROWS[0].label},{' '}
          {IMPORTANCE_ROWS[1].label} and {IMPORTANCE_ROWS[2].label} matter most.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={IMPORTANCE_ROWS} layout="vertical"
              margin={{ left: 12, right: 24, top: 5, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke={c.grid} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={moneyShort}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={118}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <Tooltip {...tooltipStyle(c)}
                formatter={(v) => [money(v), 'Average effect']} />
              <Bar dataKey="value" fill={c.accent} radius={3} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Price Distribution</h2>
        <p className="hint">
          Listings per {money(BUCKET)} band. {SHARE_CHEAP}% cost under {money(CHEAP)}, with a long
          tail of gaming and workstation machines.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={HISTOGRAM} margin={{ left: 0, right: 12, top: 5, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="label" minTickGap={14}
                stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <YAxis width={46} stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
              <Tooltip {...tooltipStyle(c)}
                formatter={(v) => [`${v} laptops`, 'Count']}
                labelFormatter={(l, p) => {
                  const start = p[0]?.payload.start ?? 0
                  return `${money(start)} – ${money(start + BUCKET)}`
                }} />
              <Bar dataKey="count" fill={c.accent} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Average Price by Brand</h2>
          <p className="hint">
            Brands with at least {MIN_LISTINGS} listings. Indigo bars sit above the overall mean of{' '}
            {money(MEAN)}, cyan bars below it.
          </p>
          <div className="chart">
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={BRANDS} layout="vertical"
                margin={{ left: 8, right: 16, top: 5, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke={c.grid} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={moneyShort}
                  stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                <YAxis type="category" dataKey="key" width={82}
                  stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                <Tooltip {...tooltipStyle(c)}
                  formatter={(v, _n, p) => [`${money(v)} (${p.payload.count} listings)`, 'Average']} />
                <Bar dataKey="avg" radius={3} isAnimationActive={false}>
                  {BRANDS.map((b) => (
                    <Cell key={b.key} fill={b.avg >= MEAN ? c.accent : c.series[1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Average Price by RAM</h2>
          <p className="hint">
            Real listing averages (not model output), for sizes with at least {MIN_LISTINGS}{' '}
            listings.
          </p>
          <div className="chart">
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={RAM_AVG} margin={{ left: 0, right: 12, top: 5, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 3" />
                <XAxis dataKey="key" tickFormatter={(v) => `${v}GB`}
                  stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                <YAxis width={56} tickFormatter={moneyShort}
                  stroke={c.axis} tick={{ fill: c.axis, fontSize: 11 }} />
                <Tooltip {...tooltipStyle(c)}
                  formatter={(v, _n, p) => [`${money(v)} (${p.payload.count} listings)`, 'Average']}
                  labelFormatter={(l) => `${l} GB RAM`} />
                <Bar dataKey="avg" fill={c.series[2]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value }) {
  return (
    <div className="stat-chip">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
