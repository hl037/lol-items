// Télécharge items.json (EN + FR) + les icônes depuis CommunityDragon et génère public/data/
//   pnpm fetch-items [--pbe] [--force-icons]
import { mkdir, writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { processItems } from './process.mjs'

const channel = process.argv.includes('--pbe') ? 'pbe' : 'latest'
const force = process.argv.includes('--force-icons')
const base = `https://raw.communitydragon.org/${channel}`
const url = (loc) => `${base}/plugins/rcp-be-lol-game-data/global/${loc}/v1/items.json`
const dataDir = new URL('../public/data/', import.meta.url)
const iconDir = new URL('icons/', dataDir)

const get = async (u) => {
  const r = await fetch(u)
  if (!r.ok) throw new Error(`${u} -> HTTP ${r.status}`)
  return r
}

const [en, fr, meta] = await Promise.all([
  get(url('default')).then((r) => r.json()),
  get(url('fr_fr')).then((r) => r.json()),
  get(`${base}/content-metadata.json`).then((r) => r.json()),
])
const { items, warnings } = processItems(en, fr)
await mkdir(iconDir, { recursive: true })

const exists = (u) => access(u).then(() => true, () => false)

// icônes : 8 téléchargements en parallèle, on garde l'URL distante si un téléchargement échoue
let downloaded = 0, cached = 0
const failed = []
async function icon(item) {
  if (!item.icon) return
  const name = `${item.id}.png`
  const file = new URL(name, iconDir)
  try {
    if (force || !(await exists(file))) {
      const r = await get(item.icon.replace('/latest/', `/${channel}/`))
      await writeFile(file, Buffer.from(await r.arrayBuffer()))
      downloaded++
    } else cached++
    item.icon = `data/icons/${name}`
  } catch (e) {
    failed.push(`${item.id} ${item.name.en}: ${e.message}`)
  }
}
const queue = [...items]
await Promise.all(Array.from({ length: 8 }, async () => { for (let i; (i = queue.shift()); ) await icon(i) }))

const out = { version: meta.version.split('+')[0], channel, generatedAt: new Date().toISOString(), items }
await writeFile(new URL('items.json', dataDir), JSON.stringify(out))
console.log(`✔ ${items.length} items (patch ${out.version}, ${channel}) ; icônes : ${downloaded} téléchargées, ${cached} déjà présentes`)
if (failed.length) console.warn(`⚠ ${failed.length} icônes non téléchargées (URL distante conservée) :\n` + failed.join('\n'))
if (warnings.length) console.warn(`⚠ ${warnings.length} avertissements :\n` + warnings.slice(0, 30).join('\n'))
