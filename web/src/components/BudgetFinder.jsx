import { useState, useMemo } from 'react'
import { SCORED, OPTIONS, money, specLine, title } from '../lib/model'

const SHOW = 8
const BUDGET = { min: 15000, max: 400000, step: 5000 }

// Minimum-spec options; 0 means "no requirement".
const RAM_MIN = [[0, 'Any'], [8, '8 GB+'], [16, '16 GB+'], [32, '32 GB+']]
const STORAGE_MIN = [[0, 'Any'], [256, '256 GB+'], [512, '512 GB+'], [1024, '1 TB+']]

// "Best specs" ranks by the model's fair price — the most laptop the budget can buy.
// "Biggest discount" ranks by how far below that fair price the listing sits.
// Ties fall back to the cheaper listing.
const SORTS = {
  specs: {
    label: 'Best specs',
    why: 'Highest model-estimated value you can afford.',
    compare: (a, b) => b.predicted - a.predicted || a.actualPrice - b.actualPrice,
  },
  deal: {
    label: 'Biggest discount',
    why: 'Listed furthest below its model-estimated fair price.',
    compare: (a, b) => a.pct - b.pct || a.actualPrice - b.actualPrice,
  },
}

const TONE_CLASS = { green: 'pos-text', gray: '', red: 'neg-text' }

const NO_NEEDS = { brand: 'Any', ram: 0, storage: 0, ssd: false, gpu: false, touch: false }

export default function BudgetFinder() {
  const [budget, setBudget] = useState(60000)
  const [needs, setNeeds] = useState(NO_NEEDS)
  const [sort, setSort] = useState('specs')

  const need = (key, value) => setNeeds((cur) => ({ ...cur, [key]: value }))

  // Requirements are applied separately from the budget so the empty state can
  // tell the user what meeting them would actually cost.
  const matching = useMemo(
    () => SCORED.filter((l) =>
      (needs.brand === 'Any' || l.brand === needs.brand) &&
      l.ram >= needs.ram &&
      l.storage >= needs.storage &&
      (!needs.ssd || l.storageType === 'SSD') &&
      (!needs.gpu || l.gpuType === 'dedicated') &&
      (!needs.touch || l.touch === 'Yes')),
    [needs]
  )

  const affordable = matching.filter((l) => l.actualPrice <= budget)
  const results = [...affordable].sort(SORTS[sort].compare).slice(0, SHOW)
  const [pick, ...rest] = results
  const deals = affordable.filter((l) => l.tone === 'green').length
  const cheapest = matching.length ? Math.min(...matching.map((l) => l.actualPrice)) : null

  return (
    <div className="stack">
      <div className="card">
        <h2>Your Budget & Needs</h2>

        <label className="field">
          <span>Budget — <b>{money(budget)}</b></span>
          <input type="range" min={BUDGET.min} max={BUDGET.max} step={BUDGET.step}
            value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </label>

        <div className="grid budget-needs">
          <label className="field">
            <span>Brand</span>
            <select value={needs.brand} onChange={(e) => need('brand', e.target.value)}>
              <option>Any</option>
              {OPTIONS.brand.map((b) => <option key={b} value={b}>{title(b)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Minimum RAM</span>
            <select value={needs.ram} onChange={(e) => need('ram', Number(e.target.value))}>
              {RAM_MIN.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Minimum Storage</span>
            <select value={needs.storage} onChange={(e) => need('storage', Number(e.target.value))}>
              {STORAGE_MIN.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
            </select>
          </label>
        </div>

        <div className="checks">
          <label>
            <input type="checkbox" checked={needs.ssd} onChange={(e) => need('ssd', e.target.checked)} />
            SSD storage
          </label>
          <label>
            <input type="checkbox" checked={needs.gpu} onChange={(e) => need('gpu', e.target.checked)} />
            Dedicated GPU
          </label>
          <label>
            <input type="checkbox" checked={needs.touch}
              onChange={(e) => need('touch', e.target.checked)} />
            Touch screen
          </label>
        </div>

        <div className="budget-footer">
          <div className="toggle" role="group" aria-label="Rank results by">
            {Object.entries(SORTS).map(([key, s]) => (
              <button key={key} className={sort === key ? 'on' : ''} onClick={() => setSort(key)}>
                {s.label}
              </button>
            ))}
          </div>
          <button className="reset" onClick={() => setNeeds(NO_NEEDS)}
            disabled={Object.keys(NO_NEEDS).every((k) => needs[k] === NO_NEEDS[k])}>
            Clear requirements
          </button>
        </div>
      </div>

      {!pick ? (
        <div className="card">
          <h2>No Matches</h2>
          {cheapest === null ? (
            <p className="hint">
              No laptop in the dataset meets all of these requirements. Try relaxing one.
            </p>
          ) : (
            <>
              <p className="hint">
                Nothing meets these requirements for {money(budget)}. The cheapest laptop that
                does is listed at {money(cheapest)}.
              </p>
              {cheapest <= BUDGET.max && (
                <button className="reset"
                  onClick={() => setBudget(Math.ceil(cheapest / BUDGET.step) * BUDGET.step)}>
                  Raise budget to {money(Math.ceil(cheapest / BUDGET.step) * BUDGET.step)}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Top Pick</h2>
            <p className="hint">{SORTS[sort].why}</p>
            <p className="pick-name">{pick.name}</p>
            <div className="price-row">
              <div className="price-box lead">
                <span className="price-label">Listed Price</span>
                <span className="price-value">{money(pick.actualPrice)}</span>
              </div>
              <div className="price-box">
                <span className="price-label">Model's Fair Price</span>
                <span className="price-value">{money(pick.predicted)}</span>
              </div>
              <div className="price-box">
                <span className="price-label">{pick.diff <= 0 ? 'You Save' : 'You Overpay'}</span>
                <span className={`price-value ${pick.diff <= 0 ? 'pos' : 'neg'}`}>
                  {money(Math.abs(pick.diff))}
                </span>
              </div>
            </div>
            <span className={`badge ${pick.tone}`}>{pick.label}</span>
            <p className="hint pick-note">
              Leaves {money(budget - pick.actualPrice)} of your budget unspent.
            </p>
          </div>

          <div className="card">
            <h2>Other Options</h2>
            <p className="hint">
              {affordable.length === 1
                ? 'The top pick is the only laptop that fits your budget and needs.'
                : `${affordable.length.toLocaleString()} laptops fit your budget and needs, and ` +
                  `${deals.toLocaleString()} of them ${deals === 1 ? 'is a good deal' : 'are good deals'}. ` +
                  `Showing the next ${rest.length}.`}
            </p>
            {rest.length > 0 && (
              // Numbering is a CSS counter, so it has to be offset to follow the top pick.
              <ol className="deals" start={2} style={{ counterReset: 'deal 1' }}>
                {rest.map((l) => (
                  <li key={l.id}>
                    <div className="deal-main">
                      <span className="deal-name">{l.name}</span>
                      <span className="deal-spec">{specLine(l)}</span>
                    </div>
                    <div className="deal-nums">
                      <span className="deal-price">{money(l.actualPrice)}</span>
                      <span className="deal-sub">fair {money(l.predicted)}</span>
                    </div>
                    <span className={`deal-pct ${TONE_CLASS[l.tone]}`}>
                      {l.pct >= 0 ? '+' : ''}{l.pct.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  )
}
