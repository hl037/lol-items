// Construit l'app dans pages.ignored/ pour GitHub Pages SANS vider le dossier : il peut contenir un dépôt git
// (.git), un CNAME, un .nojekyll… qui doivent rester. Seules les sorties d'un build précédent sont supprimées :
// index.html, assets/ et chaque entrée de public/ (data/…).
import { build } from 'vite'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const out = new URL('pages.ignored/', root)

await mkdir(out, { recursive: true })
const generated = ['index.html', 'assets', ...(await readdir(new URL('public/', root)))]
for (const name of generated) await rm(new URL(name, out), { recursive: true, force: true })

await build({ root: fileURLToPath(root), build: { outDir: fileURLToPath(out), emptyOutDir: false } })

const kept = (await readdir(out)).filter((n) => !generated.includes(n) && n !== 'index.html')
console.log(`✔ build dans pages.ignored/ ; fichiers conservés : ${kept.length ? kept.join(', ') : '(aucun)'}`)
