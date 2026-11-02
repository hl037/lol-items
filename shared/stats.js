// Définition des stats, partagée par le script de traitement (node) et l'app (vite).
// `gold` = valeur en or d'une unité de stat, d'après les items de base (approximation
// classique utilisée par la communauté pour calculer l'« efficacité en or »).
// `null` = pas de valeur de référence fiable.
export const STATS = [
  { key: 'ad', en: 'Attack Damage', fr: "Dégâts d'attaque", unit: 'flat', gold: 35, short: 'AD' },
  { key: 'ap', en: 'Ability Power', fr: 'Puissance', unit: 'flat', gold: 21.75, short: 'AP' },
  { key: 'hp', en: 'Health', fr: 'Points de vie', unit: 'flat', gold: 8 / 3, short: 'PV' },
  { key: 'mana', en: 'Mana', fr: 'Mana', unit: 'flat', gold: 1.4, short: 'Mana' },
  { key: 'armor', en: 'Armor', fr: 'Armure', unit: 'flat', gold: 20, short: 'Arm' },
  { key: 'mr', en: 'Magic Resist', fr: 'Résistance magique', unit: 'flat', gold: 18, short: 'RM' },
  { key: 'as', en: 'Attack Speed', fr: "Vitesse d'attaque", unit: 'percent', gold: 25, short: 'VA' },
  { key: 'crit', en: 'Critical Strike Chance', fr: 'Chances de coup critique', unit: 'percent', gold: 40, short: 'Crit' },
  { key: 'critDamage', en: 'Critical Strike Damage', fr: 'Dégâts de coup critique', unit: 'percent', gold: null, short: 'DégCrit' },
  { key: 'ah', en: 'Ability Haste', fr: 'Accélération de compétence', unit: 'flat', gold: 80 / 3, short: 'AH' },
  { key: 'cdr', en: 'Cooldown Reduction', fr: 'Réduction de délai de récupération', unit: 'percent', gold: null, short: 'CDR' },
  { key: 'ms', en: 'Move Speed', fr: 'Vitesse de déplacement', unit: 'flat', gold: 12, short: 'VD' },
  { key: 'msPct', en: 'Move Speed', fr: 'Vitesse de déplacement (%)', unit: 'percent', gold: null, short: 'VD%' },
  { key: 'lethality', en: 'Lethality', fr: 'Létalité', unit: 'flat', gold: 30, short: 'Lét' },
  { key: 'armorPen', en: 'Armor Penetration', fr: "Pénétration d'armure", unit: 'percent', gold: null, short: 'PénArm' },
  { key: 'magicPen', en: 'Magic Penetration', fr: 'Pénétration magique', unit: 'flat', gold: null, short: 'PénMag' },
  { key: 'magicPenPct', en: 'Magic Penetration', fr: 'Pénétration magique (%)', unit: 'percent', gold: null, short: 'PénMag%' },
  { key: 'lifesteal', en: 'Life Steal', fr: 'Vol de vie', unit: 'percent', gold: 37.5, short: 'VdV' },
  { key: 'omnivamp', en: 'Omnivamp', fr: 'Omnivampirisme', unit: 'percent', gold: null, short: 'Omni' },
  { key: 'hsp', en: 'Heal and Shield Power', fr: 'Puissance des soins et boucliers', unit: 'percent', gold: null, short: 'Soins' },
  { key: 'tenacity', en: 'Tenacity', fr: 'Ténacité', unit: 'percent', gold: null, short: 'Tén' },
  { key: 'hpRegen', en: 'Base Health Regen', fr: 'Régén. de PV de base', unit: 'percent', gold: 3, short: 'RégPV%' },
  { key: 'hpRegen5', en: 'Health Regen per 5 seconds', fr: 'Régén. de PV / 5 s', unit: 'flat', gold: null, short: 'RégPV/5s' },
  { key: 'manaRegen', en: 'Base Mana Regen', fr: 'Régén. de mana de base', unit: 'percent', gold: 4, short: 'RégMana%' },
  { key: 'manaRegen5', en: 'Mana Regen per 5 seconds', fr: 'Régén. de mana / 5 s', unit: 'flat', gold: null, short: 'RégMana/5s' },
  { key: 'gold10', en: 'Gold Per 10 Seconds', fr: "Or par 10 secondes", unit: 'flat', gold: null, short: 'Or/10s' },
  { key: 'adaptive', en: 'Adaptive Force', fr: 'Force adaptative', unit: 'flat', gold: null, short: 'Adapt.' },
]

/**
 * Regroupements de colonnes (items). Règle : toutes les stats d'un groupe partagent la MÊME icône.
 * - `cols`  : un en-tête, une sous-colonne par stat (libellé court `label`), « - » si l'autre est présente.
 * - `merge` : une seule colonne qui juxtapose les valeurs présentes, valeur fixe d'abord puis pourcentage (« +20+10% »).
 * Un groupe n'est appliqué que si au moins deux de ses stats sont affichées.
 */
export const STAT_GROUPS = [
  { kind: 'cols', label: 'Crit', stats: [{ stat: 'crit', label: 'C' }, { stat: 'critDamage', label: 'D' }] },
  { kind: 'merge', label: 'VD', stats: ['ms', 'msPct'] },
  { kind: 'merge', label: 'PénMag', stats: ['magicPen', 'magicPenPct'] },
  { kind: 'merge', label: 'AH', stats: ['ah', 'cdr'] },
  { kind: 'merge', label: 'RégPV', stats: ['hpRegen5', 'hpRegen'] },
  { kind: 'merge', label: 'RégMana', stats: ['manaRegen5', 'manaRegen'] },
]
export const groupKeys = (g) => g.stats.map((u) => u.stat ?? u)

export const STAT_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s]))

// Nom anglais (tel qu'écrit dans les descriptions) + unité -> clé.
export function statKeyFromName(name, isPercent) {
  const n = name.trim().toLowerCase()
  const hit = STATS.filter((s) => s.en.toLowerCase() === n)
  if (!hit.length) return null
  if (hit.length === 1) return hit[0].key
  return (hit.find((s) => (s.unit === 'percent') === !!isPercent) || hit[0]).key
}

// Alias courts utilisés dans le texte des effets.
export const TEXT_STAT_ALIASES = {
  'attack damage': 'ad', ad: 'ad',
  'ability power': 'ap', ap: 'ap',
  health: 'hp', mana: 'mana', armor: 'armor', 'magic resist': 'mr',
  'attack speed': 'as', 'ability haste': 'ah', 'move speed': 'ms', lethality: 'lethality',
}

export const GOLD_STATS = STATS.filter((s) => s.gold != null)

/** Valeur en or des stats valorisables d'un item + part de stats non valorisables. */
export function goldValue(stats) {
  let value = 0
  let unvalued = []
  for (const [k, v] of Object.entries(stats)) {
    const g = STAT_BY_KEY[k]?.gold
    if (g == null) unvalued.push(k)
    else value += g * v
  }
  return { value: Math.round(value), unvalued }
}

// ------------------------------------------------------------------ aide
/** Explication de chaque stat (affichée dans le panneau d'aide). */
export const STAT_HELP = {
  ad: "Augmente les dégâts physiques de tes attaques de base et des compétences qui s'appuient dessus. Les dégâts physiques sont réduits par l'armure de la cible.",
  ap: "Augmente la puissance des compétences qui infligent des dégâts magiques, ainsi que les soins et boucliers de nombreuses compétences. Les dégâts magiques sont réduits par la résistance magique de la cible.",
  hp: "Quantité de dégâts que tu peux encaisser avant de mourir.",
  mana: "Ressource nécessaire pour lancer la plupart des compétences (certains champions n'en utilisent pas).",
  armor: "Réduit les dégâts physiques subis. À 100 d'armure, tu subis moitié moins de dégâts physiques (dégâts × 100 / (100 + armure)).",
  mr: "Réduit les dégâts magiques subis, avec la même formule que l'armure : à 100 de RM, moitié moins de dégâts magiques.",
  as: "Bonus de vitesse d'attaque : nombre d'attaques de base par seconde en plus de celui de base de ton champion (pourcentage).",
  crit: "Probabilité que tes attaques de base soient des coups critiques, qui infligent davantage de dégâts (175 % des dégâts normaux, sans bonus).",
  critDamage: "Augmente les dégâts de tes coups critiques (par rapport aux 175 % de base).",
  ah: "Réduit les délais de récupération de tes compétences. Délai effectif = délai de base × 100 / (100 + AH) : 100 AH divisent les délais par 2.",
  cdr: "Réduction directe, en pourcentage, des délais de récupération (rare : la plupart des items donnent de l'accélération de compétence).",
  ms: "Vitesse de déplacement, en unités par seconde (valeur fixe ajoutée à celle de ton champion).",
  msPct: "Bonus de vitesse de déplacement en pourcentage.",
  lethality: "Pénétration d'armure fixe : ignore une partie de l'armure de la cible. Cet effet augmente avec le niveau du champion.",
  armorPen: "Pénétration d'armure en pourcentage : ignore ce pourcentage de l'armure de la cible avant la létalité.",
  magicPen: "Pénétration magique fixe : ignore une partie de la résistance magique de la cible.",
  magicPenPct: "Pénétration magique en pourcentage : ignore ce pourcentage de la résistance magique de la cible.",
  lifesteal: "Tu te soignes d'un pourcentage des dégâts infligés par tes attaques de base. Ne fonctionne pas avec les compétences.",
  omnivamp: "Tu te soignes d'un pourcentage de tous les dégâts infligés (attaques et compétences), réduit pour les dégâts de zone.",
  hsp: "Augmente l'efficacité des soins et boucliers que tu lances (sur toi ou sur tes alliés).",
  tenacity: "Réduit la durée des effets de contrôle subis (étourdissement, ralentissement, peur…), hors projections.",
  hpRegen: "Augmente la régénération naturelle de points de vie du champion, en pourcentage de sa valeur de base.",
  hpRegen5: "Points de vie régénérés toutes les 5 secondes.",
  manaRegen: "Augmente la régénération naturelle de mana du champion, en pourcentage de sa valeur de base.",
  manaRegen5: "Mana régénéré toutes les 5 secondes.",
  gold10: "Or gagné passivement toutes les 10 secondes.",
  adaptive: "Se convertit en dégâts d'attaque ou en puissance selon la plus grande des deux stats bonus de ton champion.",
}

/** Colonnes qui ne sont pas des stats. */
export const COLUMN_HELP = {
  nameFr: ['Nom (FR)', "Nom de l'item en français."],
  nameEn: ['Name (EN)', "Nom de l'item en anglais, utile pour retrouver un item en jeu ou dans un guide."],
  total: ['Prix', "Coût total de l'item en or, composants compris."],
  price: ['Recette', "Coût d'assemblage : ce qu'il reste à payer pour fabriquer l'item quand tu possèdes déjà ses composants. Vide pour les items sans composants."],
  eff: ['Eff. or', "Efficacité en or : valeur en or des stats de l'item (d'après le prix des items de base) divisée par son prix. 100 % = prix juste ; au-dessus, l'item est « rentable » en stats. Ne compte pas les passifs et actifs, et n'est calculée que si toutes les stats de l'item ont un prix de référence."],
}

/** Types de dégâts et autres mots-clés colorés des descriptions. */
export const TAG_HELP = [
  ['physicalDamage', 'Dégâts physiques', "Réduits par l'armure de la cible. Leur puissance vient surtout des dégâts d'attaque."],
  ['magicDamage', 'Dégâts magiques', 'Réduits par la résistance magique de la cible. Leur puissance vient surtout de la puissance (AP).'],
  ['trueDamage', 'Dégâts bruts', "Ignorent l'armure et la résistance magique : la cible les subit en entier."],
  ['healing', 'Soins', "Rendent des points de vie. Peuvent être augmentés par la puissance des soins et boucliers, et réduits par les effets de « blessure grave »."],
  ['shield', 'Bouclier', "Points de vie temporaires qui absorbent les dégâts avant ta vie, pendant une durée limitée."],
  ['OnHit', "À l'impact (on-hit)", "Effet appliqué à chaque attaque de base qui touche (pas aux compétences)."],
  ['lifeSteal', 'Vol de vie', 'Soigne un pourcentage des dégâts infligés par les attaques de base.'],
  ['omnivamp', 'Omnivampirisme', 'Soigne un pourcentage de tous les dégâts infligés.'],
  ['status', 'Altération', "Effet de contrôle (ralentissement, immobilisation…) appliqué à un champion."],
  ['gold', 'Or', "Monnaie du jeu, gagnée en tuant des sbires, monstres et champions."],
]
