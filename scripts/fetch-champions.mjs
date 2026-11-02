// Télécharge les champions (Data Dragon, EN + FR) + leurs icônes -> public/data/champions.json et public/data/champions/
import { mkdir, writeFile, access } from 'node:fs/promises'
import { processChampions, parsePositions } from './process-champions.mjs'
import { describeSpell, championScales } from './spells.mjs'

const force = process.argv.includes('--force-icons')
const DD = 'https://ddragon.leagueoflegends.com'
const get = async (u, tries = 3) => {
  for (let n = 1; ; n++) {
    try {
      const r = await fetch(u)
      if (!r.ok) throw new Error(`${u} -> HTTP ${r.status}`)
      return r
    } catch (e) {
      if (n >= tries) throw e
      await new Promise((r) => setTimeout(r, 500 * n)) // échecs réseau ponctuels
    }
  }
}

const version = (await get(`${DD}/api/versions.json`).then((r) => r.json()))[0]
const [en, fr] = await Promise.all(
  ['en_US', 'fr_FR'].map((l) => get(`${DD}/cdn/${version}/data/${l}/championFull.json`).then((r) => r.json())),
)
// postes : CommunityDragon (si indisponible, on continue sans)
let positions = new Map()
try {
  const recs = await get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-rune-recommendations.json').then((r) => r.json())
  positions = parsePositions(recs)
} catch (e) {
  console.warn('⚠ postes indisponibles : ' + e.message)
}
const { champions, warnings } = processChampions(en.data, fr.data, positions)
const noPos = champions.filter((c) => !c.positions.length).map((c) => c.id)
if (noPos.length) warnings.push(`${noPos.length} champions sans poste : ${noPos.join(', ')}`)

// formules de sorts : données brutes du jeu + descriptions dynamiques (CommunityDragon)
const CD = 'https://raw.communitydragon.org/latest'
const GLOBAL = `${CD}/plugins/rcp-be-lol-game-data/global`
const aliasByKey = new Map()
try {
  const summary = await get(`${GLOBAL}/default/v1/champion-summary.json`).then((r) => r.json())
  for (const c of summary) aliasByKey.set(c.id, c.alias.toLowerCase())
} catch (e) {
  console.warn('⚠ formules de sorts indisponibles : ' + e.message)
}
const spellWarnings = []
async function addFormulas(c) {
  const alias = aliasByKey.get(c.key)
  if (!alias) return
  try {
    const [bin, jEn, jFr] = await Promise.all([
      get(`${CD}/game/data/characters/${alias}/${alias}.bin.json`).then((r) => r.json()),
      get(`${GLOBAL}/default/v1/champions/${c.key}.json`).then((r) => r.json()),
      get(`${GLOBAL}/fr_fr/v1/champions/${c.key}.json`).then((r) => r.json()),
    ])
    const bySpell = new Map()
    for (const o of Object.values(bin)) if (o?.mSpell && o.mScriptName) bySpell.set(o.mScriptName, o.mSpell)
    const effects = en.data[c.id].spells.map((s) => s.effectBurn) // « EffectNAmount » des anciennes descriptions
    c.spells.forEach((s, i) => {
      const spell = bySpell.get(s.id)
      const find = (j) => j.spells.find((x) => x.spellKey === s.key.toLowerCase())
      if (!spell || !find(jEn)) return spellWarnings.push(`${c.id} ${s.key}: données brutes introuvables`)
      const o = { maxrank: s.maxrank, cooldown: s.cooldown, cost: s.cost, effects: effects[i], spells: bySpell }
      const d = {}
      for (const [lang, j] of [['en', jEn], ['fr', jFr]]) {
        const r = describeSpell(find(j)?.dynamicDescription, spell, { ...o, lang, resource: c.resource[lang] })
        d[lang] = r.html
        if (lang === 'en') { s.scalings = r.scalings; if (r.unresolved.length) spellWarnings.push(`${c.id} ${s.key}: ${r.unresolved.length} valeur(s) non résolue(s) (${[...new Set(r.unresolved)].join(', ')})`) }
      }
      s.desc = d
    })
    c.scales = championScales(c.spells)
  } catch (e) {
    spellWarnings.push(`${c.id}: formules indisponibles (${e.message})`)
  }
}
{
  const queue = [...champions]
  await Promise.all(Array.from({ length: 8 }, async () => { for (let c; (c = queue.shift()); ) await addFormulas(c) }))
}

const dataDir = new URL('../public/data/', import.meta.url)
const dirs = { champ: 'champions/champ/', spell: 'champions/spell/', passive: 'champions/passive/' }
for (const d of Object.values(dirs)) await mkdir(new URL(d, dataDir), { recursive: true })
const seg = { champ: 'champion', spell: 'spell', passive: 'passive' } // segment d'URL Data Dragon
const exists = (u) => access(u).then(() => true, () => false)

// icônes : 8 en parallèle ; en cas d'échec on garde l'URL distante
let downloaded = 0, cached = 0
const failed = []
async function icon(kind, obj) {
  const file = obj.image
  const rel = dirs[kind] + file
  const target = new URL(rel, dataDir)
  try {
    if (force || !(await exists(target))) {
      const r = await get(`${DD}/cdn/${version}/img/${seg[kind]}/${file}`)
      await writeFile(target, Buffer.from(await r.arrayBuffer()))
      downloaded++
    } else cached++
    obj.icon = 'data/' + rel
  } catch (e) {
    obj.icon = `${DD}/cdn/${version}/img/${seg[kind]}/${file}`
    failed.push(`${kind}/${file}: ${e.message}`)
  }
}
const jobs = champions.flatMap((c) => [
  ['champ', c], ['passive', c.passive], ...c.spells.map((s) => ['spell', s]),
])
await Promise.all(Array.from({ length: 8 }, async () => { for (let j; (j = jobs.shift()); ) await icon(...j) }))
for (const c of champions) { delete c.image; delete c.passive.image; c.spells.forEach((s) => delete s.image) }

await writeFile(new URL('champions.json', dataDir), JSON.stringify({ version, generatedAt: new Date().toISOString(), champions }))
console.log(`✔ ${champions.length} champions (patch ${version}) ; icônes : ${downloaded} téléchargées, ${cached} déjà présentes`)
if (failed.length) console.warn(`⚠ ${failed.length} icônes non téléchargées (URL distante conservée) :\n` + failed.slice(0, 20).join('\n'))
const withDesc = champions.reduce((n, c) => n + c.spells.filter((s) => s.desc).length, 0)
console.log(`  formules de sorts : ${withDesc}/${champions.length * 4} sorts, ${spellWarnings.length} avertissement(s)`)
if (spellWarnings.length) console.warn('  ' + spellWarnings.slice(0, 15).join('\n  ') + (spellWarnings.length > 15 ? `\n  … (${spellWarnings.length - 15} autres)` : ''))
if (warnings.length) console.warn('⚠ ' + warnings.join('\n'))
