// Transforme items.json (CommunityDragon) en données structurées.
import { STATS, STAT_BY_KEY, statKeyFromName, TEXT_STAT_ALIASES, goldValue } from '../shared/stats.js'

const ICON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/'

export const iconUrl = (p) =>
  p ? ICON_BASE + p.replace(/^\/lol-game-data\/assets\//i, '').toLowerCase() : null

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')

export const toText = (html) =>
  decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()

/** <stats><attention> 75</attention> Attack Damage<br>... -> { ad: 75 } */
export function parseStats(desc) {
  const m = desc.match(/<stats>([\s\S]*?)<\/stats>/)
  const stats = {}
  const unknown = []
  if (!m) return { stats, unknown }
  for (const line of m[1].split(/<br\s*\/?>/i)) {
    const lm = line.match(/<attention>\s*\+?\s*(-?[\d.]+)\s*(%?)\s*<\/attention>\s*(.+)/)
    if (!lm) continue
    const [, num, pct, rawName] = lm
    const name = toText(rawName)
    const key = statKeyFromName(name, pct === '%')
    if (!key) { unknown.push(line.trim()); continue }
    stats[key] = (stats[key] ?? 0) + parseFloat(num)
  }
  return { stats, unknown }
}

/** Découpe la partie hors <stats> en effets (passifs / actifs). */
export function splitEffects(desc) {
  let rest = desc.replace(/<\/?mainText>/g, '').replace(/<stats>[\s\S]*?<\/stats>/, '')
  const re = /<(passive|active)>([\s\S]*?)<\/\1>/g
  const marks = [...rest.matchAll(re)]
  const effects = []
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : rest.length
    const body = rest.slice(m.index + m[0].length, end)
    effects.push({
      type: m[1],
      name: toText(m[2]).replace(/:$/, ''),
      html: body,
      text: toText(body),
    })
  })
  return effects
}

// ------------------------------------------------- description affichable
const KEEP = /^[A-Za-z][A-Za-z0-9]*$/

/**
 * Description complète (hors bloc <stats>) en HTML sûr : seules des balises <span class="t t-xxx"> et <br>
 * sont produites, les attributs et balises inconnues sont supprimés. Le style/icônes sont gérés côté app.
 */
export function bodyHtml(desc) {
  let h = desc.replace(/<\/?mainText>/g, '').replace(/<stats>[\s\S]*?<\/stats>/, '')
  const stack = []
  let out = ''
  let last = 0
  for (const m of h.matchAll(/<(\/?)([A-Za-z][A-Za-z0-9]*)[^>]*?(\/?)>/g)) {
    out += escapeText(h.slice(last, m.index))
    last = m.index + m[0].length
    const [, close, name, selfClose] = m
    if (name.toLowerCase() === 'br') out += '<br>'
    else if (name === 'li') out += '<br>'
    else if (close) {
      const i = stack.lastIndexOf(name)
      if (i >= 0) { stack.splice(i) ; out += '</span>' }
    } else if (!selfClose && KEEP.test(name)) {
      stack.push(name)
      out += `<span class="t t-${name}">`
    }
  }
  out += escapeText(h.slice(last)) + '</span>'.repeat(stack.length)
  return out
    .replace(/(\s*<br>\s*){3,}/g, '<br><br>')
    .replace(/^(\s|<br>)+|(\s|<br>)+$/g, '')
}
const escapeText = (t) => t.replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------------------------------------------------------------- formules
const STAT_NAMES = Object.keys(TEXT_STAT_ALIASES).sort((a, b) => b.length - a.length)
const STAT_RE = '(' + STAT_NAMES.map((s) => s.replace(/ /g, '\\s+')).join('|') + ')'
const NUM = '(\\d+(?:\\.\\d+)?)'
const SCOPE = '(max|maximum|bonus|current|missing|base|total)'
const statKey = (s) => TEXT_STAT_ALIASES[s.toLowerCase().replace(/\s+/g, ' ')]
const DMG = { 'physical damage': 'physical', 'magic damage': 'magic', 'true damage': 'true', damage: 'any', healing: 'heal', shield: 'shield', 'a shield': 'shield' }
const DMG_RE = '(physical damage|magic damage|true damage|damage|healing|a shield|shield)'

/** Extrait des formules typées depuis le texte anglais d'un effet. */
export function extractFormulas(text) {
  const t = text.replace(/\s+/g, ' ')
  const out = []
  const seen = new Set()
  const push = (f) => {
    const k = JSON.stringify(f)
    if (!seen.has(k)) { seen.add(k); out.push(f) }
  }

  // "2% max Mana as bonus Attack Damage" / "1.2% max Mana as bonus physical damage"
  const reConv = new RegExp(
    `${NUM}%(?:\\s*[-–]\\s*${NUM}%)?\\s+(?:${SCOPE}\\s+)?${STAT_RE}\\s+as\\s+(?:bonus\\s+)?(?:${STAT_RE}|${DMG_RE})`, 'gi')
  for (const m of t.matchAll(reConv)) {
    const [, a, b, scope, src, dstStat, dstKind] = m
    const dst = dstStat ? statKey(dstStat) : null
    const ratio = [parseFloat(a) / 100, ...(b ? [parseFloat(b) / 100] : [])]
    const f = { type: dst ? 'convert' : 'percentOf', from: { stat: statKey(src), scope: scope?.toLowerCase().replace('maximum', 'max') ?? 'total' }, ratio: ratio.length === 1 ? ratio[0] : ratio }
    if (dst) f.to = dst
    else f.as = DMG[dstKind.toLowerCase()]
    push(f)
  }

  // "increases your total Ability Power by 30%" (multiplicateur) / "reduces the target's Armor by 6%" (réduction)
  const reMul = new RegExp(`${STAT_RE}\\b\\s+by\\s+${NUM}%`, 'gi')
  for (const m of t.matchAll(reMul)) {
    const before = t.slice(Math.max(0, m.index - 60), m.index).toLowerCase()
    const sentence = before.slice(before.lastIndexOf('.') + 1)
    if (/reduc|shred|lower/.test(sentence)) push({ type: 'reduce', stat: statKey(m[1]), factor: parseFloat(m[2]) / 100 })
    else if (/increas|boost|amplif/.test(sentence)) {
      const stat = statKey(m[1])
      // la vitesse de déplacement « boostée de 15% » est un bonus additif, pas un multiplicateur de stat
      if (stat === 'ms') push({ type: 'grant', stat: 'msPct', value: parseFloat(m[2]), unit: 'percent' })
      else push({ type: 'multiplier', stat, factor: parseFloat(m[2]) / 100 })
    }
  }

  // "grants 20 Move Speed" / "Gain 4 Ability Power per stack"
  const reGrant = new RegExp(`(?:gains?|grants?)\\s+(?:you\\s+)?${NUM}(%)?\\s+(?:bonus\\s+)?${STAT_RE}\\b(?!\\s+(?:penetration|regen|range|damage))(\\s+per\\b)?`, 'gi')
  for (const m of t.matchAll(reGrant)) {
    const stat = statKey(m[3])
    const f = stat === 'ms' && m[2]
      ? { type: 'grant', stat: 'msPct', value: parseFloat(m[1]), unit: 'percent' }
      : { type: 'grant', stat, value: parseFloat(m[1]), unit: m[2] ? 'percent' : 'flat' }
    if (m[4]) f.perStack = true
    push(f)
  }

  // "restores 120 Health" / "Restore 4 Health every 5 seconds"
  const reRestore = new RegExp(`restores?\\s+${NUM}\\s+(Health|Mana)\\b(?:\\s+(?:every|per)\\s+(?:${NUM}\\s+)?(seconds?|On-Hit))?`, 'gi')
  for (const m of t.matchAll(reRestore)) {
    const f = { type: 'restore', stat: statKey(m[2]), value: parseFloat(m[1]) }
    if (m[4]) f.every = /on-hit/i.test(m[4]) ? 'hit' : (m[3] ? parseFloat(m[3]) : 1)
    push(f)
  }

  // Durées
  for (const m of t.matchAll(/for\s+(\d+(?:\.\d+)?)\s+seconds?/gi)) if (parseFloat(m[1]) <= 600) push({ type: 'duration', seconds: parseFloat(m[1]) })
  // Ralentissements, vulnérabilité, etc. : "Slows them by 30%"
  for (const m of t.matchAll(/(slows?|reduces?|increases?)\s+[^.%]{0,40}?by\s+(\d+(?:\.\d+)?)%/gi)) {
    const w = m[1].toLowerCase()
    if (/^slow/.test(w)) push({ type: 'slow', value: parseFloat(m[2]) / 100 })
  }
  return out
}

export function effectTags(html) {
  const tags = new Set()
  const map = { physicalDamage: 'physical', magicDamage: 'magic', trueDamage: 'true', OnHit: 'onhit', healing: 'heal', shield: 'shield', lifeSteal: 'lifesteal', omnivamp: 'omnivamp' }
  for (const m of html.matchAll(/<(\w+)>/g)) {
    if (map[m[1]]) tags.add(map[m[1]])
    if (/^scale/.test(m[1])) tags.add(m[1].replace(/^scale/, 'scale:').toLowerCase())
  }
  return [...tags]
}

// ----------------------------------------------------------------- items
export function tierOf(i) {
  const c = i.categories ?? []
  if (c.includes('Consumable')) return 'consumable'
  if (c.includes('Trinket')) return 'trinket'
  if (c.includes('Boots')) return 'boots'
  if (c.includes('Lane') || c.includes('Jungle')) return 'starter'
  if (!i.from.length && i.to.length) return 'basic'
  if (i.to.length) return 'epic'
  if (i.priceTotal >= 1600) return 'legendary'
  return 'other'
}

export function processItems(en, fr) {
  const frById = new Map(fr.map((i) => [i.id, i]))
  const items = []
  const warnings = []
  for (const i of en) {
    if (!i.inStore || !i.displayInItemSets) continue
    const f = frById.get(i.id) ?? i
    const { stats, unknown } = parseStats(i.description)
    if (unknown.length) warnings.push(`${i.id} ${i.name}: stat inconnue ${unknown.join(' | ')}`)
    const effEn = splitEffects(i.description)
    const effFr = splitEffects(f.description)
    if (effEn.length !== effFr.length) warnings.push(`${i.id} ${i.name}: ${effEn.length} effets EN vs ${effFr.length} FR`)
    const effects = effEn.map((e, idx) => ({
      type: e.type,
      name: { en: e.name, fr: effFr[idx]?.name ?? e.name },
      text: { en: e.text, fr: effFr[idx]?.text ?? e.text },
      tags: effectTags(e.html),
      formulas: extractFormulas(e.text),
    }))
    const gv = goldValue(stats)
    items.push({
      id: i.id,
      name: { en: i.name, fr: f.name },
      tier: tierOf(i),
      price: i.price,
      total: i.priceTotal,
      from: i.from,
      to: i.to,
      categories: i.categories,
      special: i.id >= 100000, // variantes d'autres modes (Arena…)
      champion: i.requiredChampion || null,
      icon: iconUrl(i.iconPath),
      stats,
      desc: { en: bodyHtml(i.description), fr: bodyHtml(f.description) },
      effects,
      gold: {
        value: gv.value,
        // efficacité calculable seulement si toutes les stats sont valorisées
        efficiency: Object.keys(stats).length && !gv.unvalued.length && i.priceTotal ? +(gv.value / i.priceTotal).toFixed(3) : null,
        unvalued: gv.unvalued,
      },
    })
  }
  items.sort((a, b) => a.id - b.id)
  return { items, warnings }
}
