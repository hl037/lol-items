import { ref, watch } from 'vue'

const KEY = 'lol-items:sets:v1'

export const MAPS = [
  { value: 'any', label: 'Toutes les cartes', ids: [] },
  { value: 'SR', label: "Faille de l'invocateur", ids: [11] },
  { value: 'HA', label: 'ARAM (Abîme hurlant)', ids: [12] },
]
export const MODES = [
  { value: 'any', label: 'Tous les modes' },
  { value: 'CLASSIC', label: 'Classique' },
  { value: 'ARAM', label: 'ARAM' },
]

let seq = 0
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`

export const newBlock = (type = 'Items') => ({ uid: uid(), type, items: [] })
export const newSet = (title = 'Nouveau set') => ({
  uid: uid(),
  title,
  map: 'any',
  mode: 'any',
  champion: '',
  blocks: [newBlock('Départ'), newBlock('Core'), newBlock('Situationnel')],
})

/** Format attendu par le client LoL (fichiers de Config/.../Recommended/*.json). */
export function toLolSet(set, champions = []) {
  const champ = champions.find((c) => c.id === set.champion)
  const map = MAPS.find((m) => m.value === set.map) ?? MAPS[0]
  return {
    title: set.title,
    type: 'custom',
    map: set.map,
    mode: set.mode,
    priority: false,
    sortrank: 0,
    associatedMaps: map.ids,
    associatedChampions: champ ? [champ.key] : [],
    blocks: set.blocks.map((b) => ({
      type: b.type,
      recMath: false,
      minSummonerLevel: -1,
      maxSummonerLevel: -1,
      showIfSummonerSpell: '',
      hideIfSummonerSpell: '',
      items: b.items.map((it) => ({ id: String(it.id), count: it.count })),
    })),
  }
}

/** Import d'un JSON de set LoL existant. */
export function fromLolSet(json, champions = []) {
  const o = typeof json === 'string' ? JSON.parse(json) : json
  if (!o || !Array.isArray(o.blocks)) throw new Error('JSON invalide : pas de « blocks »')
  const s = newSet(o.title || 'Set importé')
  s.map = o.map || 'any'
  s.mode = o.mode || 'any'
  const ck = (o.associatedChampions || []).find((k) => k > 0)
  s.champion = champions.find((c) => c.key === ck)?.id ?? ''
  s.blocks = o.blocks.map((b) => ({
    uid: uid(),
    type: b.type || 'Items',
    items: (b.items || []).map((i) => ({ id: Number(i.id), count: i.count || 1 })),
  }))
  return s
}

export function useSets() {
  let initial
  try { initial = JSON.parse(localStorage.getItem(KEY)) } catch { /* stockage indisponible */ }
  const sets = ref(Array.isArray(initial) && initial.length ? initial : [newSet('Mon premier set')])
  const currentUid = ref(sets.value[0].uid)
  watch(sets, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })
  return { sets, currentUid }
}
