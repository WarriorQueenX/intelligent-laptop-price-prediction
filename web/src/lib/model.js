// Linear Regression scoring, ported from the notebook pipeline.
// modelData.json holds the intercept, the StandardScaler mean/scale + coefficient
// for every numeric feature, and the one-hot coefficient for every category.
// So a prediction is just: intercept + sum(coef * scaled_value).

import modelData from '../data/modelData.json'

export const LAPTOPS = modelData.laptops
export const OPTIONS = modelData.options
export const METRICS = modelData.metrics

const { intercept, numeric, categorical } = modelData

// Human-readable labels for the raw feature names used by the model.
export const LABELS = {
  ram_gb: 'RAM',
  storage_gb: 'Storage',
  screen_size: 'Screen Size',
  is_ssd: 'SSD Drive',
  is_touch: 'Touch Screen',
  is_new: 'Condition (New)',
  has_discrete_gpu: 'Discrete GPU',
  brand: 'Brand',
  cpu: 'CPU',
  gpu: 'GPU',
  storage_type: 'Storage Type',
  status: 'Status',
  touch: 'Touch',
}

/**
 * Turns the UI spec object into the exact feature record the model expects,
 * recreating the derived columns from the notebook's feature-engineering step.
 */
function toFeatures(spec) {
  return {
    ram_gb: Number(spec.ram),
    storage_gb: Number(spec.storage),
    screen_size: Number(spec.screen),
    is_ssd: spec.storageType === 'SSD' ? 1 : 0,
    is_touch: spec.touch === 'Yes' ? 1 : 0,
    is_new: spec.status === 'New' ? 1 : 0,
    has_discrete_gpu: spec.gpu !== 'Integrated' ? 1 : 0,
    brand: spec.brand,
    cpu: spec.cpu,
    gpu: spec.gpu,
    storage_type: spec.storageType,
    status: spec.status,
    touch: spec.touch,
  }
}

export function predict(spec) {
  const f = toFeatures(spec)
  let total = intercept

  for (const [name, info] of Object.entries(numeric)) {
    total += info.coef * ((f[name] - info.mean) / info.scale)
  }
  // Unseen categories contribute 0 (matches OneHotEncoder handle_unknown="ignore")
  for (const [name, block] of Object.entries(categorical)) {
    total += block.coefs[f[name]] ?? 0
  }
  // Linear regression can go negative on extreme low-end spec combinations
  // (3 rows in the dataset do). A negative price is meaningless, so floor it.
  return Math.max(total, 50)
}

// Average one-hot contribution per categorical feature, measured across the whole
// dataset. Used as the "typical laptop" reference point so contributions read as
// "how much this spec adds/removes versus an average laptop" rather than versus
// whatever category OneHotEncoder happened to drop.
const avgCatContribution = {}
for (const [name, block] of Object.entries(categorical)) {
  let sum = 0
  for (const l of LAPTOPS) {
    const f = toFeatures(l)
    sum += block.coefs[f[name]] ?? 0
  }
  avgCatContribution[name] = sum / LAPTOPS.length
}

export const BASELINE_PRICE =
  intercept + Object.values(avgCatContribution).reduce((a, b) => a + b, 0)

// The model's 0/1 flags and bare numbers read badly in the UI, so add units/words.
const UNITS = { ram_gb: ' GB', storage_gb: ' GB', screen_size: '"' }
const FLAGS = ['is_ssd', 'is_touch', 'is_new', 'has_discrete_gpu']
export const formatValue = (feature, v) => {
  if (FLAGS.includes(feature)) return v === 1 ? 'Yes' : 'No'
  return `${v}${UNITS[feature] ?? ''}`
}

/**
 * Breaks a prediction down into per-feature dollar contributions relative to an
 * average laptop. BASELINE_PRICE + sum(contributions) === predict(spec).
 */
export function explain(spec) {
  const f = toFeatures(spec)
  const parts = []

  for (const [name, info] of Object.entries(numeric)) {
    parts.push({
      feature: name,
      label: LABELS[name] ?? name,
      value: f[name],
      contribution: info.coef * ((f[name] - info.mean) / info.scale),
    })
  }
  for (const [name, block] of Object.entries(categorical)) {
    parts.push({
      feature: name,
      label: LABELS[name] ?? name,
      value: f[name],
      contribution: (block.coefs[f[name]] ?? 0) - avgCatContribution[name],
    })
  }

  const total = parts.reduce((a, p) => a + Math.abs(p.contribution), 0) || 1
  return parts
    .map((p) => ({ ...p, share: (Math.abs(p.contribution) / total) * 100 }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}

/** ±10% fair-price threshold, same rule as the notebook. */
export function valueRating(actual, predicted) {
  const diff = actual - predicted
  const pct = (diff / predicted) * 100
  let label = 'Fairly Priced'
  let tone = 'gray'
  if (pct < -10) {
    label = 'Underpriced — Good Deal'
    tone = 'green'
  } else if (pct > 10) {
    label = 'Overpriced'
    tone = 'red'
  }
  return { diff, pct, label, tone }
}

export function specOf(laptop) {
  return {
    brand: laptop.brand,
    cpu: laptop.cpu,
    ram: laptop.ram,
    storage: laptop.storage,
    storageType: laptop.storageType,
    gpu: laptop.gpu,
    screen: laptop.screen,
    touch: laptop.touch,
    status: laptop.status,
  }
}

/** Renders negatives as −$120 rather than $-120. */
export const money = (n) => {
  const rounded = Math.round(n)
  return (rounded < 0 ? '−$' : '$') + Math.abs(rounded).toLocaleString('en-US')
}

/** Basic sanity bounds so the model is never asked to score nonsense. */
export const LIMITS = {
  ram: { min: 2, max: 64 },
  storage: { min: 128, max: 2000 },
  screen: { min: 11, max: 18 },
}

/**
 * Every dataset laptop scored once at module load, so the Best Deals and Budget
 * tabs can filter/sort without re-running 2k predictions on each keystroke.
 */
export const SCORED = LAPTOPS.map((l) => {
  const predicted = predict(specOf(l))
  return { ...l, predicted, ...valueRating(l.actualPrice, predicted) }
})

export function validate(spec) {
  const errors = []
  if (spec.ram < LIMITS.ram.min || spec.ram > LIMITS.ram.max)
    errors.push(`RAM must be between ${LIMITS.ram.min} and ${LIMITS.ram.max} GB`)
  if (spec.storage < LIMITS.storage.min || spec.storage > LIMITS.storage.max)
    errors.push(`Storage must be between ${LIMITS.storage.min} and ${LIMITS.storage.max} GB`)
  if (spec.screen < LIMITS.screen.min || spec.screen > LIMITS.screen.max)
    errors.push(`Screen must be between ${LIMITS.screen.min}" and ${LIMITS.screen.max}"`)
  if (!spec.brand || !spec.cpu || !spec.gpu) errors.push('Brand, CPU and GPU are required')
  return errors
}
