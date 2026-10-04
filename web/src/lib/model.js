// Linear Regression scoring, ported from the training pipeline in export_model.py.
// modelData.json holds the intercept, the StandardScaler mean/scale + coefficient
// for every numeric feature, and the one-hot coefficient for every category.
// So a prediction is just: intercept + sum(coef * scaled_value).
//
// Prices are Indian rupees (INR), straight from the dataset.

import modelData from '../data/modelData.json'

export const LAPTOPS = modelData.laptops
export const OPTIONS = modelData.options
export const METRICS = modelData.metrics

const { intercept, numeric, categorical } = modelData

// Human-readable labels for the raw feature names used by the model.
export const LABELS = {
  ram_memory: 'RAM',
  primary_storage_capacity: 'Storage',
  num_cores: 'CPU Cores',
  display_size: 'Display Size',
  resolution_width: 'Screen Width',
  resolution_height: 'Screen Height',
  is_touch: 'Touch Screen',
  brand: 'Brand',
  processor_brand: 'Processor Brand',
  processor_tier: 'Processor',
  primary_storage_type: 'Storage Type',
  gpu_brand: 'GPU Brand',
  gpu_type: 'GPU Type',
  OS: 'Operating System',
  year_of_warranty: 'Warranty',
}

/**
 * Turns the UI spec object into the exact feature record the model expects.
 * Keys here must match the column names used in export_model.py.
 */
function toFeatures(spec) {
  return {
    ram_memory: Number(spec.ram),
    primary_storage_capacity: Number(spec.storage),
    num_cores: Number(spec.cores),
    display_size: Number(spec.display),
    resolution_width: Number(spec.resWidth),
    resolution_height: Number(spec.resHeight),
    is_touch: spec.touch === 'Yes' ? 1 : 0,
    brand: spec.brand,
    processor_brand: spec.processorBrand,
    processor_tier: spec.processorTier,
    primary_storage_type: spec.storageType,
    gpu_brand: spec.gpuBrand,
    gpu_type: spec.gpuType,
    OS: spec.os,
    year_of_warranty: String(spec.warranty),
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
  // (4 rows in the dataset do). A negative price is meaningless, so floor it
  // at a price below anything the dataset actually contains (cheapest ₹9,800).
  return Math.max(total, 5000)
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

// The dataset stores values lowercase ("asus", "core i5", "windows"), which looks
// sloppy in the UI, so they are capitalised for display only.
const UPPERCASE = new Set(['hp', 'lg', 'msi', 'amd', 'arm', 'dos', 'ssd', 'hdd'])
export const title = (value) =>
  String(value)
    .split(' ')
    .map((word) => {
      if (UPPERCASE.has(word)) return word.toUpperCase()
      if (/^i\d/.test(word)) return word // keep "i5" rather than "I5"
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')

/** "1" -> "1 year", "No information" -> "Not stated". */
export const warrantyLabel = (value) =>
  String(value) === 'No information' ? 'Not stated' : `${value} year${value === '1' ? '' : 's'}`

// The model's 0/1 flags and bare numbers read badly in the UI, so add units/words.
const UNITS = {
  ram_memory: ' GB',
  primary_storage_capacity: ' GB',
  display_size: '"',
  num_cores: ' cores',
  resolution_width: ' px',
  resolution_height: ' px',
}
export const formatValue = (feature, v) => {
  if (feature === 'is_touch') return v === 1 ? 'Yes' : 'No'
  if (feature === 'year_of_warranty') return warrantyLabel(v)
  if (feature in UNITS) return `${v}${UNITS[feature]}`
  return title(v)
}

/**
 * Breaks a prediction down into per-feature rupee contributions relative to an
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

/** ±10% fair-price threshold. */
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
    processorBrand: laptop.processorBrand,
    processorTier: laptop.processorTier,
    cores: laptop.cores,
    ram: laptop.ram,
    storage: laptop.storage,
    storageType: laptop.storageType,
    gpuBrand: laptop.gpuBrand,
    gpuType: laptop.gpuType,
    display: laptop.display,
    resWidth: laptop.resWidth,
    resHeight: laptop.resHeight,
    touch: laptop.touch,
    os: laptop.os,
    warranty: laptop.warranty,
  }
}

/** One-line spec summary for result lists. */
export const specLine = (l) =>
  `${title(l.processorTier)} · ${l.cores} cores · ${l.ram} GB · ${l.storage} GB ${l.storageType} · ` +
  `${l.display}" · ${title(l.gpuType)} ${title(l.gpuBrand)}`

/** Rupees with Indian digit grouping, e.g. ₹1,24,990. Negatives read −₹1,200. */
export const money = (n) => {
  const rounded = Math.round(n)
  return (rounded < 0 ? '−₹' : '₹') + Math.abs(rounded).toLocaleString('en-IN')
}

/** Compact rupees for chart axes: ₹45k, ₹1.5L (lakh). */
export const moneyShort = (n) => {
  const v = Math.abs(Math.round(n))
  const sign = n < 0 ? '−' : ''
  if (v >= 100000) return `${sign}₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`
  if (v >= 1000) return `${sign}₹${Math.round(v / 1000)}k`
  return `${sign}₹${v}`
}

/** Basic sanity bounds so the model is never asked to score nonsense. */
export const LIMITS = {
  ram: { min: 2, max: 128 },
  storage: { min: 32, max: 4096 },
  cores: { min: 1, max: 32 },
  display: { min: 10, max: 20 },
}

/**
 * Every dataset laptop scored once at module load, so the Best Deals and Budget
 * tabs can filter/sort without re-running a thousand predictions on each keystroke.
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
  if (spec.cores < LIMITS.cores.min || spec.cores > LIMITS.cores.max)
    errors.push(`CPU cores must be between ${LIMITS.cores.min} and ${LIMITS.cores.max}`)
  if (spec.display < LIMITS.display.min || spec.display > LIMITS.display.max)
    errors.push(`Display size must be between ${LIMITS.display.min}" and ${LIMITS.display.max}"`)
  if (!spec.brand || !spec.processorTier || !spec.gpuType)
    errors.push('Brand, processor and GPU type are required')
  return errors
}
