import test from 'node:test'
import assert from 'node:assert/strict'
import { describeSpell, championScales, renderCalc } from './spells.mjs'

const O = { lang: 'fr', maxrank: 5, cooldown: '7', cost: '55', resource: 'Mana', spells: new Map() }
const text = (html) => html.replace(/<[^>]+>/g, '')

// d'après Ahri Q : valeurs par rang + 0,5 × AP (mStat absent = AP)
const ahriQ = {
  DataValues: [{ name: 'BaseDamage', values: [10, 35, 60, 85, 110, 135, 160] }],
  mSpellCalculations: {
    TotalDamage: { __type: 'GameCalculation', mFormulaParts: [{ __type: 'NamedDataValueCalculationPart', mDataValue: 'BaseDamage' }, { __type: 'StatByCoefficientCalculationPart', mCoefficient: 0.5 }] },
  },
}

test('base par rang + scaling AP', () => {
  const r = describeSpell('Inflige <magicDamage>@TotalDamage@ dégâts</magicDamage>.', ahriQ, O)
  assert.equal(text(r.html), 'Inflige 35/60/85/110/135 (+50%) dégâts.')
  assert.match(r.html, /data-s="ap"/)
  assert.deepEqual(r.scalings, [{ stat: 'ap', code: 0, q: '', c: [0.5] }])
  assert.deepEqual(r.unresolved, [])
})

test('stat de base / bonus / PV max, et code de stat inconnu', () => {
  const sp = { mSpellCalculations: {
    A: { mFormulaParts: [{ __type: 'StatByCoefficientCalculationPart', mStat: 2, mStatFormula: 2, mCoefficient: 0.75 }] },
    B: { mFormulaParts: [{ __type: 'StatByCoefficientCalculationPart', mStat: 12, mCoefficient: 0.1 }] },
    C: { mFormulaParts: [{ __type: 'StatByCoefficientCalculationPart', mStat: 99, mCoefficient: 1 }] },
  } }
  const r = describeSpell('@A@ | @B@ | @C@', sp, O)
  assert.equal(text(r.html), '75% bonus | 10% max | 100% ?')
  assert.deepEqual(r.scalings.map((s) => [s.stat, s.q]), [['ad', 'bonus'], ['hp', 'max'], [null, '']])
})

test('calcul en pourcentage (mDisplayAsPercent) et multiplicateur du calcul', () => {
  const sp = { DataValues: [{ name: 'Pct', values: [3, 4, 5, 6, 7, 8] }, { name: 'APRatio', values: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03] }],
    mSpellCalculations: { Disp: { mDisplayAsPercent: true, mMultiplier: { __type: 'NumberCalculationPart', mNumber: 0.01 }, mFormulaParts: [
      { __type: 'NamedDataValueCalculationPart', mDataValue: 'Pct' }, { __type: 'StatByNamedDataValueCalculationPart', mDataValue: 'APRatio' }] } } }
  assert.equal(text(describeSpell('@Disp@ des PV', sp, O).html), '4/5/6/7/8% (+0.03% /) des PV')
})

test('GameCalculationModified, ProductOfSubParts et niveau', () => {
  const sp = { DataValues: [{ name: 'Base', values: [0, 100, 100, 100, 100, 100] }, { name: 'Bonus', values: [0, 0.5, 0.5, 0.5, 0.5, 0.5] }],
    mSpellCalculations: {
      D: { mFormulaParts: [{ __type: 'NamedDataValueCalculationPart', mDataValue: 'Base' }] },
      M: { __type: 'GameCalculationModified', mModifiedGameCalculation: 'D', mMultiplier: { __type: 'SumOfSubPartsCalculationPart', mSubparts: [{ __type: 'NumberCalculationPart', mNumber: 1 }, { __type: 'NamedDataValueCalculationPart', mDataValue: 'Bonus' }] } },
      P: { mFormulaParts: [{ __type: 'ProductOfSubPartsCalculationPart', mPart1: { __type: 'NumberCalculationPart', mNumber: 2 }, mPart2: { __type: 'NamedDataValueCalculationPart', mDataValue: 'Base' } }] },
      L: { mFormulaParts: [{ __type: 'ByCharLevelInterpolationCalculationPart', mStartValue: 0.04, mEndValue: 0.1 }] },
    } }
  assert.equal(text(describeSpell('@M@ @P@ @L@', sp, O).html), '150 200 0.04–0.1')
})

test('marqueurs : DataValue, *100, cooldown, icônes, spell inconnu, calcul trop complexe', () => {
  const sp = { DataValues: [{ name: 'Slow', values: [0, 0.2, 0.25, 0.3, 0.35, 0.4] }],
    mSpellCalculations: { Z: { mFormulaParts: [{ __type: 'BuffCounterByCoefficientCalculationPart', mCoefficient: 1 }] } } }
  const r = describeSpell('Ralentit de @Slow*100@% (%i:scaleAP%) CD @Cooldown@s @SpellModifierDescriptionAppend@ @Z@ @Nope@', sp, O)
  assert.equal(text(r.html), 'Ralentit de 20/25/30/35/40% () CD 7s  ? ?')
  assert.match(r.html, /class="t t-scaleAP"/)
  assert.deepEqual(r.unresolved, ['Z', 'Nope'])
})

test('EffectNAmount via Data Dragon', () => {
  const r = describeSpell('@Effect2Amount@ @Effect3Amount@', {}, { ...O, effects: [null, '0', '60/90/120', '0'] })
  assert.equal(text(r.html), '60/90/120 ?')
})

test('HTML : les balises du texte source sont nettoyées', () => {
  const r = describeSpell('<script>x</script><magicDamage>@A@</magicDamage>', { DataValues: [{ name: 'A', values: [1, 2] }] }, { ...O, maxrank: 1 })
  assert.ok(!r.html.includes('<script'))
})

test('championScales : les plus fréquentes d\'abord', () => {
  const spells = [{ scalings: [{ stat: 'ap' }, { stat: 'hp' }] }, { scalings: [{ stat: 'ap' }] }, { scalings: [{ stat: null }] }, {}]
  assert.deepEqual(championScales(spells), ['ap', 'hp'])
})

test('renderCalc : vide ou partie inconnue -> null', () => {
  assert.equal(renderCalc([], 'fr'), null)
  assert.equal(renderCalc([{ k: 'unk' }], 'fr'), null)
})
