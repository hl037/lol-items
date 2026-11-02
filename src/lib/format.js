import { STAT_BY_KEY } from '../../shared/stats.js'

const n = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)))
const stat = (k) => STAT_BY_KEY[k]?.short ?? k

/** « +75 » (valeur absolue) ou « +25% » (valeur relative). */
export const formatStat = (key, v) => `${v < 0 ? '−' : '+'}${n(Math.abs(v))}${STAT_BY_KEY[key]?.unit === 'percent' ? '%' : ''}`
export const pct = (r) => (Array.isArray(r) ? r.map((x) => n(x * 100)).join(' – ') : n(r * 100)) + '%'

const SCOPE = { max: 'max', bonus: 'bonus', current: 'actuel', missing: 'manquant', base: 'de base', total: 'total' }
const AS = { physical: 'dégâts physiques', magic: 'dégâts magiques', true: 'dégâts bruts', any: 'dégâts', heal: 'soins', shield: 'bouclier' }

/** Rend lisible une formule structurée (voir scripts/process.mjs#extractFormulas). */
export function formatFormula(f) {
  switch (f.type) {
    case 'grant':
      return `+${n(f.value)}${f.unit === 'percent' ? '%' : ''} ${stat(f.stat)}${f.perStack ? ' / cumul' : ''}`
    case 'multiplier':
      return `${stat(f.stat)} totale ×${n(1 + f.factor)}`
    case 'reduce':
      return `−${pct(f.factor)} ${stat(f.stat)} (cible)`
    case 'convert':
      return `${pct(f.ratio)} ${stat(f.from.stat)} ${SCOPE[f.from.scope]} → ${stat(f.to)}`
    case 'percentOf':
      return `${pct(f.ratio)} ${stat(f.from.stat)} ${SCOPE[f.from.scope]} → ${AS[f.as]}`
    case 'restore':
      return `Restaure ${n(f.value)} ${stat(f.stat)}${f.every === 'hit' ? ' / coup' : f.every ? ` / ${f.every}s` : ''}`
    case 'duration':
      return `${n(f.seconds)}s`
    case 'slow':
      return `Ralentit ${pct(f.value)}`
    default:
      return JSON.stringify(f)
  }
}

export const gold = (v) => (v == null ? '—' : v.toLocaleString('fr-FR'))
