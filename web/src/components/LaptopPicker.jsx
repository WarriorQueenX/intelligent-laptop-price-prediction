import { useState, useMemo } from 'react'
import { LAPTOPS, money } from '../lib/model'

const LIMIT = 150 // rendering all 2000+ <option> nodes locks up the browser

const labelOf = (l) =>
  `${l.brand} ${l.model} — ${l.cpu} / ${l.ram}GB / ${l.storage}GB ${l.storageType} / ${l.screen}" — ${money(l.actualPrice)}`

/**
 * Searchable laptop dropdown. The full list is far too long to put in a <select>,
 * so we filter by a text query and only render the first LIMIT matches.
 */
export default function LaptopPicker({ value, onChange }) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? LAPTOPS.filter((l) => labelOf(l).toLowerCase().includes(q))
      : LAPTOPS
    return pool.slice(0, LIMIT)
  }, [query])

  // The selected laptop must stay in the list even when it doesn't match the query.
  const selected = LAPTOPS.find((l) => l.id === value)
  const shown = matches.some((l) => l.id === value) ? matches : [selected, ...matches]

  return (
    <div className="picker">
      <input
        type="search"
        placeholder="Search by brand, model, CPU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {shown.map((l) => (
          <option key={l.id} value={l.id}>{labelOf(l)}</option>
        ))}
      </select>
      <small>
        Showing {matches.length} of {LAPTOPS.length}
        {matches.length === LIMIT && ' (refine your search to see more)'}
      </small>
    </div>
  )
}
