// État de l'interface, sauvegardé en entier dans le localStorage (clé unique). Les sets ont leur propre clé (src/lib/sets.js).
// Chargement tolérant : chaque champ est validé par rapport aux valeurs par défaut (type), donc un état ancien, partiel
// ou corrompu ne casse rien. Si le stockage est indisponible (navigation privée…), l'app fonctionne sans persistance.
import { reactive, ref, watch } from 'vue'

const KEY = 'lol-items:ui:v2'

export const DEFAULT_COLS = ['ad', 'ap', 'hp', 'armor', 'mr', 'as', 'crit', 'critDamage', 'ah', 'ms']

const defaults = () => ({
  tab: 'items', // 'items' | 'champions'
  currentUid: null, // set sélectionné
  activeBlock: null, // bloc du set dans lequel « + » ajoute
  helpOpen: false, // glossaire d'aide épinglé
  items: {
    query: '',
    tiers: ['legendary', 'epic', 'boots', 'basic'],
    cols: DEFAULT_COLS,
    showSpecial: false,
    sort: { key: 'total', dir: 'desc' },
    open: [], // ids des lignes dépliées
  },
  champions: {
    query: '',
    classes: [],
    positions: [],
    level: 1,
    sort: { key: 'name', dir: 'asc' },
    open: [],
  },
})

/** Fusionne `saved` dans `def` en ne gardant que les valeurs du bon type (tableaux, objets, primitives). */
export function merge(def, saved) {
  if (Array.isArray(def)) return Array.isArray(saved) ? saved : def
  if (def === null) return typeof saved === 'string' ? saved : null
  if (typeof def === 'object') {
    const s = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
    return Object.fromEntries(Object.entries(def).map(([k, v]) => [k, merge(v, s[k])]))
  }
  return typeof saved === typeof def ? saved : def
}

const read = (key) => { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }

/** Reprend les anciennes clés (une par fonctionnalité) la première fois, pour ne pas perdre les choix existants. */
function legacy() {
  const table = read('lol-items:table:v1') ?? {}
  const champs = read('lol-items:champs:v1') ?? {}
  let tab = null
  try { tab = localStorage.getItem('lol-items:tab') } catch { /* ignore */ }
  return {
    tab,
    items: { tiers: table.tiers, cols: table.cols },
    champions: { classes: champs.classes ?? champs.roles, positions: champs.positions, level: champs.level },
  }
}

export function loadState() {
  const saved = read(KEY) ?? legacy()
  const s = merge(defaults(), saved)
  if (s.tab !== 'items' && s.tab !== 'champions') s.tab = 'items'
  return s
}

export const ui = reactive(loadState())

watch(ui, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })

/** Réinitialise l'interface (pas les sets). */
export function resetUi() {
  Object.assign(ui, defaults())
}

/** Ref de Set synchronisée avec un tableau de l'état (les Set ne se sérialisent pas en JSON). Remplacer le Set entier pour modifier. */
export function setRef(obj, key) {
  const r = ref(new Set(obj[key]))
  watch(r, (v) => { obj[key] = [...v] })
  return r
}
