import test from 'node:test'
import assert from 'node:assert/strict'
import { plain, processChampions, parsePositions } from './process-champions.mjs'
import { growth, statAt, attackSpeedAt, CHAMP_COLS, mobalyticsSlug, scalingRatio } from '../shared/champions.js'

test('growth : 0 au niveau 1, 17 au niveau 18', () => {
  assert.equal(growth(1), 0)
  assert.ok(Math.abs(growth(18) - 17) < 1e-9)
})
test('stats au niveau 18 (Ahri : 590 PV + 104/niv)', () => {
  assert.ok(Math.abs(statAt(590, 104, 18) - 2358) < 1e-6)
  assert.ok(Math.abs(attackSpeedAt(0.668, 2.2, 18) - 0.668 * (1 + 0.374)) < 1e-9)
  const hp = CHAMP_COLS.find((c) => c.key === 'hp')
  assert.equal(Math.round(hp.at({ hp: 590, hpperlevel: 104 }, 18)), 2358)
})
test('plain', () => assert.equal(plain('A<br>B &amp; <b>C</b>'), 'A\nB & C'))
test('processChampions', () => {
  const mk = (n) => ({ key: '1', name: n, title: n + 't', tags: ['Mage'], partype: 'Mana', info: {}, stats: { hp: 1 },
    image: { full: 'A.png' }, passive: { name: 'P', description: 'd', image: { full: 'P.png' } },
    spells: [{ id: 'AQ', name: 'Q', description: 'x', cooldownBurn: '7', costBurn: '50', rangeBurn: '900', maxrank: 5, image: { full: 'AQ.png' } }] })
  const { champions } = processChampions({ A: mk('en') }, { A: mk('fr') })
  assert.equal(champions[0].name.fr, 'fr')
  assert.equal(champions[0].spells[0].key, 'Q')
})

test('parsePositions : Faille de l\'invocateur uniquement, ordre canonique', () => {
  const rec = (position, mapId) => ({ position, mapId })
  const m = parsePositions([
    { championId: 7, runeRecommendations: [rec('NONE', 12), rec('UTILITY', 11), rec('MIDDLE', 11), rec('TOP', 12)] },
    { championId: 8, runeRecommendations: [rec('NONE', 12)] },
  ])
  assert.deepEqual(m.get(7), ['MIDDLE', 'UTILITY'])
  assert.deepEqual(m.get(8), [])
})

test('mobalyticsSlug', () => {
  const cases = { Ahri: 'ahri', 'Lee Sin': 'lee-sin', "Kai'Sa": 'kaisa', "K'Sante": 'ksante', 'Dr. Mundo': 'dr-mundo', 'Jarvan IV': 'jarvan-iv',
    "Bel'Veth": 'belveth', 'Nunu & Willump': 'nunu', 'Renata Glasc': 'renata-glasc', LeBlanc: 'leblanc', 'Aurelion Sol': 'aurelion-sol' }
  for (const [name, slug] of Object.entries(cases)) assert.equal(mobalyticsSlug(name), slug, name)
})

test('scalingRatio : somme du plus grand ratio de chaque sort', () => {
  const c = { spells: [
    { scalings: [{ stat: 'ap', c: [0.5] }] },
    { scalings: [{ stat: 'ap', c: [0.4, 0.16] }, { stat: 'hp', c: [0.03] }] },
    { scalings: [{ stat: 'ap', q: '', c: [0.85] }] },
    {},
  ] }
  assert.equal(scalingRatio(c, 'ap'), 175)
  assert.equal(scalingRatio(c, 'hp'), 3)
  assert.equal(scalingRatio(c, 'armor'), 0)
})
