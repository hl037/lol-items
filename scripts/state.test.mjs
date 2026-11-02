import test from 'node:test'
import assert from 'node:assert/strict'

// state.js importe Vue et lit le localStorage au chargement : on simule le stockage avant l'import
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init))
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }
}
const load = async (init) => {
  fakeStorage(init)
  const mod = await import(`../src/lib/state.js?${Math.random()}`)
  return mod
}

test('merge : garde les valeurs du bon type, sinon les défauts', async () => {
  const { merge } = await load()
  const def = { a: 1, b: 'x', c: [1], d: { e: true }, f: null }
  assert.deepEqual(merge(def, { a: 'pas un nombre', b: 'y', c: 'pas un tableau', d: { e: false, zz: 1 }, f: 'uid' }), { a: 1, b: 'y', c: [1], d: { e: false }, f: 'uid' })
  assert.deepEqual(merge(def, null), def)
  assert.deepEqual(merge(def, [1, 2]), def)
})

test('chargement : état v2 valide', async () => {
  const { loadState } = await load({ 'lol-items:ui:v2': JSON.stringify({ tab: 'champions', items: { query: 'epee', sort: { key: 'ad', dir: 'asc' }, open: [3089] }, champions: { level: 11 } }) })
  const s = loadState()
  assert.equal(s.tab, 'champions')
  assert.equal(s.items.query, 'epee')
  assert.deepEqual(s.items.open, [3089])
  assert.deepEqual(s.items.tiers, ['legendary', 'epic', 'boots', 'basic']) // défaut conservé pour le champ absent
  assert.equal(s.champions.level, 11)
})

test('chargement : JSON corrompu ou onglet invalide -> défauts', async () => {
  let m = await load({ 'lol-items:ui:v2': '{pas du json' })
  assert.equal(m.loadState().tab, 'items')
  m = await load({ 'lol-items:ui:v2': JSON.stringify({ tab: 'nimporte', items: 'x' }) })
  const s = m.loadState()
  assert.equal(s.tab, 'items')
  assert.equal(s.items.sort.key, 'total')
})

test('migration depuis les anciennes clés', async () => {
  const m = await load({
    'lol-items:tab': 'champions',
    'lol-items:table:v1': JSON.stringify({ tiers: ['boots'], cols: ['ap', 'hp'] }),
    'lol-items:champs:v1': JSON.stringify({ roles: ['Mage'], positions: ['MIDDLE'], level: 7 }),
  })
  const s = m.loadState()
  assert.equal(s.tab, 'champions')
  assert.deepEqual(s.items.tiers, ['boots'])
  assert.deepEqual(s.items.cols, ['ap', 'hp'])
  assert.deepEqual(s.champions.classes, ['Mage'])
  assert.equal(s.champions.level, 7)
})

test('sans localStorage : défauts, sans erreur', async () => {
  globalThis.localStorage = { getItem() { throw new Error('bloqué') }, setItem() { throw new Error('bloqué') } }
  const { loadState } = await import(`../src/lib/state.js?${Math.random()}`)
  assert.equal(loadState().tab, 'items')
})
