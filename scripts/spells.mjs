// Formules de sorts de champions : évalue les calculs des données brutes du jeu (<champion>.bin.json de CommunityDragon)
// et remplace les marqueurs @Nom@ des descriptions dynamiques par « 35/60/85 (+50% AP) ».
//
// Modèle d'un calcul = somme de « termes » :
//   { k: 'base',  v: nombre | [valeur par rang] }
//   { k: 'level', from, to }                      valeur qui dépend du niveau du champion (1 -> 18)
//   { k: 'stat',  code, f, c }                    coefficient c × une stat ; c = nombre | [par rang] | { from, to }
//   { k: 'unk' }                                  partie non gérée (le calcul est alors « complexe »)

import { bodyHtml } from './process.mjs'

/** Code numérique de stat (mStat) -> clé de stat de l'app. Déduits par recoupement avec des sorts connus. */
export const STAT_CODES = { 0: 'ap', 1: 'armor', 2: 'ad', 4: 'as', 6: 'mr', 7: 'ms', 8: 'crit', 9: 'critDamage', 12: 'hp', 18: 'omnivamp', 29: 'lethality' }

const round = (v) => +(+v).toPrecision(4)
const fmtNum = (v) => String(round(v))
const sameAll = (a) => a.every((x) => Math.abs(x - a[0]) < 1e-9)
const collapse = (v) => (Array.isArray(v) && v.length && sameAll(v) ? v[0] : v)
const fmtVal = (v) => (Array.isArray(v) ? (sameAll(v) ? fmtNum(v[0]) : v.map(fmtNum).join('/')) : fmtNum(v))

// ------------------------------------------------------------------ évaluation
const UNK = [{ k: 'unk' }]

/** Valeur d'un DataValue par rang (index 1..maxrank ; l'index 0 est le « rang 0 »). */
function dataValue(ctx, name) {
  const dv = ctx.dv.get(String(name).toLowerCase())
  if (!dv) return null
  const vals = dv.values ?? []
  if (vals.length <= 1) return vals[0] ?? null
  return collapse(vals.slice(1, ctx.maxrank + 1))
}

const arrOf = (v, n) => (Array.isArray(v) ? v : Array.from({ length: n }, () => v))
function mul(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) return a * b
  const n = Math.max(Array.isArray(a) ? a.length : 0, Array.isArray(b) ? b.length : 0)
  const x = arrOf(a, n), y = arrOf(b, n)
  return collapse(x.map((v, i) => v * y[i]))
}
function add(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) return a + b
  const n = Math.max(Array.isArray(a) ? a.length : 0, Array.isArray(b) ? b.length : 0)
  const x = arrOf(a, n), y = arrOf(b, n)
  return collapse(x.map((v, i) => v + y[i]))
}

/** Multiplie tous les termes par un facteur (nombre ou tableau par rang). */
function multiply(terms, f) {
  return terms.map((t) => {
    if (t.k === 'base') return { ...t, v: mul(t.v, f) }
    if (t.k === 'level') return Array.isArray(f) ? { k: 'unk' } : { ...t, from: t.from * f, to: t.to * f }
    if (t.k === 'stat') {
      if (t.c && typeof t.c === 'object' && !Array.isArray(t.c)) return Array.isArray(f) ? { k: 'unk' } : { ...t, c: { from: t.c.from * f, to: t.c.to * f } }
      return { ...t, c: mul(t.c, f) }
    }
    return t
  })
}

const soleBase = (terms) => (terms.length === 1 && terms[0].k === 'base' ? terms[0].v : null)

function evalPart(p, ctx) {
  if (!p) return UNK
  switch (p.__type) {
    case 'NamedDataValueCalculationPart': {
      const v = dataValue(ctx, p.mDataValue)
      return v == null ? UNK : [{ k: 'base', v }]
    }
    case 'NumberCalculationPart':
      return [{ k: 'base', v: p.mNumber }]
    case 'StatByCoefficientCalculationPart':
      return [{ k: 'stat', code: p.mStat ?? 0, f: p.mStatFormula ?? 0, c: p.mCoefficient }]
    case 'StatByNamedDataValueCalculationPart': {
      const c = dataValue(ctx, p.mDataValue)
      return c == null ? UNK : [{ k: 'stat', code: p.mStat ?? 0, f: p.mStatFormula ?? 0, c }]
    }
    case 'SumOfSubPartsCalculationPart':
      return (p.mSubparts ?? []).flatMap((s) => evalPart(s, ctx))
    case 'ProductOfSubPartsCalculationPart': {
      const a = evalPart(p.mPart1, ctx), b = evalPart(p.mPart2, ctx)
      const fa = soleBase(normalize(a)), fb = soleBase(normalize(b))
      if (fa != null) return multiply(b, fa)
      if (fb != null) return multiply(a, fb)
      return UNK
    }
    case 'ByCharLevelInterpolationCalculationPart':
      return [{ k: 'level', from: p.mStartValue, to: p.mEndValue }]
    case 'ByCharLevelBreakpointsCalculationPart': {
      const bonus = (p.mBreakpoints ?? []).filter((b) => b.mLevel <= 18).reduce((s, b) => s + (b.mAdditionalBonusAtThisLevel ?? 0), 0)
      return [{ k: 'level', from: p.mLevel1Value, to: p.mLevel1Value + bonus }]
    }
    case 'ByCharLevelFormulaCalculationPart':
      return p.values?.length >= 18 ? [{ k: 'level', from: p.values[0], to: p.values[17] }] : UNK
    case 'StatBySubPartCalculationPart': {
      const sub = normalize(evalPart(p.mSubpart, ctx))
      if (sub.length !== 1) return UNK
      const t = sub[0]
      const c = t.k === 'base' ? t.v : t.k === 'level' ? { from: t.from, to: t.to } : null
      return c == null ? UNK : [{ k: 'stat', code: p.mStat ?? 0, f: p.mStatFormula ?? 0, c }]
    }
    case 'GameCalculationModified': {
      const ref = evalCalc(p.mModifiedGameCalculation, ctx)
      const m = soleBase(normalize(evalPart(p.mMultiplier, ctx)))
      return m == null ? UNK : multiply(ref, m)
    }
    default:
      return UNK
  }
}

/** Additionne les termes de base entre eux (valeur fixe + valeur par rang). */
function normalize(terms) {
  const base = terms.filter((t) => t.k === 'base')
  if (base.length < 2) return terms
  return [{ k: 'base', v: base.map((t) => t.v).reduce(add) }, ...terms.filter((t) => t.k !== 'base')]
}

function evalCalc(name, ctx) {
  const key = String(name)
  const calc = ctx.calcs[key] ?? Object.entries(ctx.calcs).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]
  if (!calc || ctx.seen.has(key)) return UNK
  ctx.seen.add(key)
  try {
    let terms
    if (calc.__type === 'GameCalculation' || calc.mFormulaParts) {
      terms = (calc.mFormulaParts ?? []).flatMap((p) => evalPart(p, ctx))
      if (calc.mMultiplier) {
        const m = soleBase(normalize(evalPart(calc.mMultiplier, ctx)))
        terms = m == null ? UNK : multiply(terms, m)
      }
    } else if (calc.__type === 'GameCalculationModified') terms = evalPart(calc, ctx)
    else terms = UNK
    const out = normalize(terms)
    out.pct = !!calc.mDisplayAsPercent // la valeur s'affiche en pourcentage (×100 %)
    return out
  } finally {
    ctx.seen.delete(key)
  }
}

// ------------------------------------------------------------------- rendu
const QUAL = { en: { max: 'max', base: 'base', bonus: 'bonus' }, fr: { max: 'max', base: 'de base', bonus: 'bonus' } }

function statInfo(t, lang) {
  const stat = STAT_CODES[t.code] ?? null
  const q = t.f === 1 ? 'base' : t.f === 2 ? 'bonus' : stat === 'hp' ? 'max' : ''
  return { stat, q, qText: q ? QUAL[lang][q] : '' }
}
const fmtCoef = (c) => (Array.isArray(c) ? (sameAll(c) ? fmtNum(c[0] * 100) : c.map((x) => fmtNum(x * 100)).join('/')) : typeof c === 'object' ? `${fmtNum(c.from * 100)}–${fmtNum(c.to * 100)}` : fmtNum(c * 100))
const esc = (s) => String(s).replace(/[<>&"]/g, '')

function statHtml(t, lang, perPoint = false) {
  const { stat, qText } = statInfo(t, lang)
  const label = stat ? '' : ' ?'
  const title = stat ? '' : ` title="stat n°${t.code} (non identifiée)"`
  // calcul en pourcentage : le coefficient est un pourcentage « par point de stat » (« 0.03% / AP »)
  return `<span class="t t-sc" data-s="${stat ?? 'unk'}"${title}>${fmtCoef(t.c)}%${perPoint ? ' /' : ''}${qText ? ' ' + esc(qText) : ''}${label}</span>`
}

/** HTML d'un calcul, ou null s'il est trop complexe. `mult` = multiplicateur du marqueur (@Nom*100@). */
export function renderCalc(terms, lang, mult = 1, pct = false) {
  if (!terms.length || terms.some((t) => t.k === 'unk')) return null
  let ts = mult === 1 ? terms : multiply(terms, mult)
  const nums = ts.filter((t) => t.k === 'base' || t.k === 'level')
  const stats = ts.filter((t) => t.k === 'stat')
  // @Nom*100@ sur des coefficients seuls : le texte de la description donne déjà l'unité (« % des PV max »)
  if (mult !== 1 && !nums.length) return `<span class="t t-v">${stats.map((t) => fmtVal(t.c && typeof t.c === 'object' && !Array.isArray(t.c) ? t.c.from : t.c)).join(' + ')}</span>`
  const k = pct ? 100 : 1
  const numText = nums.map((t) => (t.k === 'base' ? fmtVal(mul(t.v, k)) : `${fmtNum(t.from * k)}–${fmtNum(t.to * k)}`) + (pct ? '%' : '')).join(' + ')
  if (!stats.length) return `<span class="t t-v">${numText}</span>`
  const sHtml = stats.map((t) => statHtml(t, lang, pct))
  if (!numText) return sHtml.join(' + ')
  return `<span class="t t-v">${numText}</span> ` + sHtml.map((h) => `(+${h})`).join(' ')
}

// ------------------------------------------------------------ description
/** Marqueurs d'icônes du client (%i:scaleAP%) -> classe d'icône de l'app (voir TAG_ICON dans src/lib/icons.js). Les autres sont ignorés. */
const ICON_TOKENS = {
  scaleAD: 'scaleAD', scaleAP: 'scaleAP', scaleHealth: 'scaleHealth', scaleArmor: 'scaleArmor', scaleMR: 'scaleMR', scaleMana: 'scaleMana',
  scaleLevel: 'scaleLevel', scaleLethality: 'scaleLethality', scaleAS: 'attackSpeed', scaleMS: 'speed', OnHit: 'OnHit',
}

/**
 * @param {string} dynamicDescription  texte CDragon avec marqueurs @Nom@
 * @param {object} spell               objet `mSpell` du fichier brut
 * @param {{ lang, maxrank, cooldown, cost, resource, effects?: string[], spells: Map<string, object> }} o
 * @returns {{ html: string, scalings: Array<{stat, q, c}>, unresolved: string[] }}
 */
export function describeSpell(dynamicDescription, spell, o) {
  const scalings = new Map()
  const unresolved = []
  const ctxFor = (sp) => ({
    calcs: sp?.mSpellCalculations ?? {},
    dv: new Map((sp?.DataValues ?? []).map((d) => [String(d.name).toLowerCase(), d])),
    maxrank: o.maxrank,
    seen: new Set(),
  })

  const html = bodyHtml(dynamicDescription ?? '').replace(/%i:(\w+)%/g, (all, tag) => (ICON_TOKENS[tag] ? `<span class="t t-${ICON_TOKENS[tag]}"></span>` : '')).replace(/@([^@<>]+)@/g, (all, raw) => {
    const m = raw.match(/^(?:spell\.([^:]+):)?([^*]+?)(?:\*(-?[\d.]+))?$/)
    if (!m) return unknown(raw)
    const [, ref, name, multStr] = m
    const mult = multStr == null ? 1 : parseFloat(multStr)
    // marqueurs « méta »
    const low = name.toLowerCase()
    if (!ref) {
      const em = low.match(/^effect(\d+)amount$/)
      if (em) {
        const v = o.effects?.[Number(em[1])]
        return v && v !== '0' ? `<span class="t t-v">${esc(v)}</span>` : unknown(raw)
      }
      if (low === 'spellmodifierdescriptionappend') return ''
      if (low === 'cooldown' && o.cooldown) return `<span class="t t-v">${esc(o.cooldown)}</span>`
      if (low === 'cost' && o.cost) return `<span class="t t-v">${esc(o.cost)}</span>`
      if (low === 'abilityresourcename') return esc(o.resource ?? '')
    }
    const sp = ref ? o.spells.get(ref) : spell
    if (!sp) return unknown(raw)
    const ctx = ctxFor(sp)
    let terms = null
    if (ctx.calcs[name] || Object.keys(ctx.calcs).some((k) => k.toLowerCase() === low)) terms = evalCalc(name, ctx)
    else {
      const v = dataValue(ctx, name)
      if (v != null) terms = [{ k: 'base', v }]
    }
    const out = terms && renderCalc(terms, o.lang, mult, !!terms.pct)
    if (!out) return unknown(raw)
    for (const t of terms.filter((x) => x.k === 'stat')) {
      const { stat, q } = statInfo(t, o.lang)
      const key = `${stat ?? 'unk' + t.code}|${q}`
      const e = scalings.get(key) ?? { stat: stat ?? null, code: t.code, q, c: [] }
      const coefs = Array.isArray(t.c) ? [t.c[0]] : typeof t.c === 'object' ? [t.c.from, t.c.to] : [t.c]
      for (const c of coefs.map(round)) if (!e.c.includes(c)) e.c.push(c)
      scalings.set(key, e)
    }
    return out
  })

  function unknown(raw) {
    unresolved.push(raw)
    return `<span class="t t-unk" title="valeur non disponible">?</span>`
  }
  return { html, scalings: [...scalings.values()], unresolved }
}

/** Stats sur lesquelles scale un champion, les plus fréquentes d'abord (pour la colonne « Scale »). */
export function championScales(spells, limit = 4) {
  const count = new Map()
  for (const s of spells) for (const sc of s.scalings ?? []) if (sc.stat) count.set(sc.stat, (count.get(sc.stat) ?? 0) + 1)
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([stat]) => stat)
}
