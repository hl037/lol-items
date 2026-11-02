import test from 'node:test'
import assert from 'node:assert/strict'
import { STAT_GROUPS, STAT_BY_KEY, groupKeys } from '../shared/stats.js'
import { hlOfStat } from '../src/lib/icons.js'

test('toutes les stats d\'un groupe partagent la même icône', () => {
  for (const g of STAT_GROUPS) {
    const icons = new Set(groupKeys(g).map(hlOfStat))
    assert.equal(icons.size, 1, `groupe ${g.label} : icônes différentes (${[...icons]})`)
  }
})
test('un groupe `merge` associe une valeur fixe et un pourcentage', () => {
  for (const g of STAT_GROUPS.filter((x) => x.kind === 'merge')) {
    const units = groupKeys(g).map((k) => STAT_BY_KEY[k].unit)
    assert.deepEqual(units, ['flat', 'percent'], `groupe ${g.label}`)
  }
})
test('aucune stat dans deux groupes', () => {
  const all = STAT_GROUPS.flatMap(groupKeys)
  assert.equal(new Set(all).size, all.length)
})
