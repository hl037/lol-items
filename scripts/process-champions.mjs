// Transforme championFull.json (Data Dragon, EN + FR) en données compactes.
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&#39;': "'", '&apos;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>' }

/** Texte brut : <br> -> retour à la ligne, autres balises supprimées, entités décodées. */
export const plain = (s) =>
  (s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|#39|apos|quot|lt|gt);/g, (m) => ENT[m])
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const POSITION_ORDER = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

/**
 * Postes par champion (clé = id numérique du champion), d'après champion-rune-recommendations.json de CommunityDragon :
 * les postes pour lesquels le client propose des runes sur la Faille de l'invocateur (mapId 11).
 */
export function parsePositions(recs) {
  const out = new Map()
  for (const c of recs) {
    const set = new Set(c.runeRecommendations.filter((r) => r.mapId === 11 && POSITION_ORDER.includes(r.position)).map((r) => r.position))
    out.set(c.championId, POSITION_ORDER.filter((p) => set.has(p)))
  }
  return out
}

const KEYS = ['Q', 'W', 'E', 'R']

export function processChampions(en, fr, positions = new Map()) {
  const out = []
  const warnings = []
  for (const id of Object.keys(en).sort()) {
    const e = en[id]
    const f = fr[id]
    if (!f) warnings.push(`${id}: absent de la version française`)
    const g = f ?? e
    out.push({
      id,
      key: Number(e.key),
      name: { en: e.name, fr: g.name },
      title: { en: e.title, fr: g.title },
      tags: e.tags,
      positions: positions.get(Number(e.key)) ?? [],
      resource: { en: e.partype, fr: g.partype },
      info: e.info, // attack / defense / magic / difficulty (0-10)
      stats: e.stats,
      image: e.image.full, // fichier source, remplacé par le chemin local au téléchargement
      passive: {
        name: { en: e.passive.name, fr: g.passive.name },
        text: { en: plain(e.passive.description), fr: plain(g.passive.description) },
        image: e.passive.image.full,
      },
      spells: e.spells.map((s, i) => ({
        key: KEYS[i] ?? String(i),
        id: s.id,
        name: { en: s.name, fr: g.spells[i]?.name ?? s.name },
        text: { en: plain(s.description), fr: plain(g.spells[i]?.description ?? s.description) },
        cooldown: s.cooldownBurn,
        cost: s.costBurn,
        range: s.rangeBurn,
        maxrank: s.maxrank,
        image: s.image.full,
      })),
    })
  }
  return { champions: out, warnings }
}
