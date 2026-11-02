// Icônes vectorielles simples (viewBox 24×24, remplies en currentColor) + couleurs.
// Réalisées pour ce projet : le client LoL n'expose pas d'icônes de stats exploitables.
export const PATHS = {
  sword: 'M20 3h1v1L10.5 14.5l-2-2L19 2zM7.6 13.6l2.8 2.8-1.4 1.4 1.8 1.8-1.4 1.4-1.8-1.8L5.8 21 4.4 19.6l1.4-1.4-1.8-1.8 1.4-1.4 1.8 1.8z',
  star: 'M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z',
  heart: 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z',
  shield: 'M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z',
  shieldMr: 'M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  drop: 'M12 2.5c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11z',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l4.5 2.5 1-1.7L13 12.3z',
  target: 'M11 1h2v5h-2zM11 18h2v5h-2zM1 11h5v2H1zM18 11h5v2h-5zM12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  diamond: 'M12 2l8 10-8 10L4 12z',
  plus: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  arrow: 'M3 11h13l-4-4 1.4-1.4L20 12l-6.6 6.4L12 17l4-4H3z',
  chevrons: 'M3 5l8 7-8 7zm10 0l8 7-8 7z',
  half: 'M12 2a10 10 0 1 0 0 20zm2 0v20a10 10 0 0 0 0-20z',
  triangle: 'M12 3l9 17H3z',
  fang: 'M5 3h14l-3 8-4 10-4-10z',
}

// clé de stat -> [icône, couleur]
export const STAT_ICON = {
  ad: ['sword', '#f4a03c'], ap: ['star', '#5aa9ff'], hp: ['heart', '#6fd16f'], mana: ['drop', '#4c8cff'],
  armor: ['shield', '#e0a84c'], mr: ['shieldMr', '#62c3d8'], as: ['chevrons', '#f0d060'],
  crit: ['target', '#ef5b3f'], critDamage: ['target', '#ef5b3f'], ah: ['clock', '#b58cff'], cdr: ['clock', '#b58cff'],
  ms: ['bolt', '#e8e8e8'], msPct: ['bolt', '#e8e8e8'], lethality: ['arrow', '#e0603a'], armorPen: ['arrow', '#e0a84c'],
  magicPen: ['arrow', '#5aa9ff'], magicPenPct: ['arrow', '#5aa9ff'], lifesteal: ['fang', '#d23f5a'], omnivamp: ['fang', '#e06a9a'],
  hsp: ['plus', '#5fd38d'], tenacity: ['shield', '#b0b8c4'], hpRegen: ['plus', '#6fd16f'], hpRegen5: ['plus', '#6fd16f'],
  range: ['target', '#c8aa6e'], manaRegen: ['drop', '#4c8cff'], manaRegen5: ['drop', '#4c8cff'], gold10: ['coin', '#f0c04a'], adaptive: ['half', '#d0b070'],
}

// balises colorées des descriptions -> [icône, couleur]
export const TAG_ICON = {
  physicalDamage: ['sword', '#f4a03c'], magicDamage: ['star', '#5aa9ff'], trueDamage: ['diamond', '#f2f2f2'],
  healing: ['plus', '#5fd38d'], shield: ['shield', '#cfd8e3'], OnHit: ['sword', '#f4a03c'],
  lifeSteal: ['fang', '#d23f5a'], omnivamp: ['fang', '#e06a9a'], gold: ['coin', '#f0c04a'], speed: ['bolt', '#e8e8e8'],
  attackSpeed: ['chevrons', '#f0d060'], scaleAD: ['sword', '#f4a03c'], scaleAP: ['star', '#5aa9ff'],
  scaleHealth: ['heart', '#6fd16f'], health: ['heart', '#6fd16f'], scaleArmor: ['shield', '#e0a84c'], scaleMR: ['shieldMr', '#62c3d8'],
  scaleMana: ['drop', '#4c8cff'], scaleLevel: ['triangle', '#c8aa6e'], scaleLethality: ['arrow', '#e0603a'],
}

/** Clé d'identité d'une icône (forme + couleur) : toutes les icônes de même clé sont mises en évidence ensemble. */
export const hlOf = (def) => (def ? def[0] + def[1].slice(1) : null)
export const hlOfStat = (key) => hlOf(STAT_ICON[key])
export const hlOfTag = (tag) => hlOf(TAG_ICON[tag])

// type de dégâts d'une formule (`as`) -> balise d'icône
export const DMG_TAG = { physical: 'physicalDamage', magic: 'magicDamage', true: 'trueDamage', heal: 'healing', shield: 'shield' }

export const svg = (icon, size = 14, hl = '') =>
  `<svg class="ico" data-hl="${hl}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="${PATHS[icon]}"/></svg>`

/** Insère les icônes devant le texte des balises colorées d'une description (HTML produit par process.mjs). */
export function decorate(html) {
  return html
    // scaling d'un sort (scripts/spells.mjs) : « 50% bonus » + icône de la stat
    .replace(/<span class="t t-sc" data-s="(\w+)"([^>]*)>([^<]*)<\/span>/g, (m, stat, attrs, text) => {
      const d = STAT_ICON[stat]
      return d ? `<span class="t t-sc" style="--c:${d[1]}"${attrs}>${text} ${svg(d[0], 13, hlOf(d))}</span>` : m
    })
    .replace(/<span class="t t-(\w+)">/g, (m, tag) => {
    const t = TAG_ICON[tag]
    return t ? `<span class="t t-${tag}" style="--c:${t[1]}">${svg(t[0], 13, hlOf(t))}` : m
  })
}
