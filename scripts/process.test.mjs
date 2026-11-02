import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStats, splitEffects, extractFormulas } from './process.mjs'

test('parseStats', () => {
  const d = '<mainText><stats><attention> 75</attention> Attack Damage<br><attention> 25%</attention> Critical Strike Chance<br><attention> 10%</attention> Move Speed</stats></mainText>'
  assert.deepEqual(parseStats(d).stats, { ad: 75, crit: 25, msPct: 10 })
})
test('splitEffects', () => {
  const d = '<mainText><stats></stats><br><passive>Awe</passive><br>Gain 2% max Mana.<br><br><active>Go</active><br>Dash.</mainText>'
  const e = splitEffects(d)
  assert.equal(e.length, 2)
  assert.deepEqual(e.map((x) => [x.type, x.name]), [['passive', 'Awe'], ['active', 'Go']])
})
test('formules', () => {
  assert.deepEqual(extractFormulas('Gain 2% max Mana as bonus Attack Damage.'),
    [{ type: 'convert', from: { stat: 'mana', scope: 'max' }, ratio: 0.02, to: 'ad' }])
  assert.deepEqual(extractFormulas('Increases your total Ability Power by 30%.'), [{ type: 'multiplier', stat: 'ap', factor: 0.3 }])
  assert.deepEqual(extractFormulas('reduces the target\'s Armor by 6% for 6 seconds'),
    [{ type: 'reduce', stat: 'armor', factor: 0.06 }, { type: 'duration', seconds: 6 }])
  assert.deepEqual(extractFormulas('Restores 120 Health over 15 seconds.'), [{ type: 'restore', stat: 'hp', value: 120 }])
  assert.deepEqual(extractFormulas('gain 100 additional attack range'), [])
})
