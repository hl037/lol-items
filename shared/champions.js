// Stats de champions : colonnes, formules de niveau et aide. Partagé par l'app et les tests.

/** Facteur de croissance par niveau du jeu : (n-1) × (0,7025 + 0,0175 × (n-1)). Vaut 17 au niveau 18. */
export const growth = (lvl) => (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1))
export const statAt = (base, per, lvl) => base + per * growth(lvl)
/** La vitesse d'attaque croît en pourcentage de la valeur de base. */
export const attackSpeedAt = (base, perPct, lvl) => base * (1 + (perPct * growth(lvl)) / 100)

const r = (v, d) => +v.toFixed(d)

/**
 * Colonnes du tableau. `icon` = clé d'icône de stat (src/lib/icons.js STAT_ICON), `at(stats, lvl)` = valeur au niveau choisi,
 * `per(stats)` = croissance par niveau affichée dans le détail.
 */
export const CHAMP_COLS = [
  { key: 'hp', label: 'PV', fr: 'Points de vie', icon: 'hp', digits: 0, at: (s, l) => statAt(s.hp, s.hpperlevel, l), per: (s) => s.hpperlevel,
    help: "Points de vie de base du champion au niveau choisi. Ils augmentent à chaque niveau (la croissance par niveau est indiquée dans le détail)." },
  { key: 'mp', label: 'Mana', fr: 'Mana / ressource', icon: 'mana', digits: 0, at: (s, l) => statAt(s.mp, s.mpperlevel, l), per: (s) => s.mpperlevel,
    help: "Réserve de ressource de base (mana ou énergie). Vaut 0 pour les champions qui n'en utilisent pas (ou qui utilisent une autre ressource, comme la fureur ou le courage)." },
  { key: 'ad', label: 'AD', fr: "Dégâts d'attaque", icon: 'ad', digits: 1, at: (s, l) => statAt(s.attackdamage, s.attackdamageperlevel, l), per: (s) => s.attackdamageperlevel,
    help: "Dégâts physiques de base des attaques du champion, avant les bonus d'items." },
  { key: 'armor', label: 'Arm', fr: 'Armure', icon: 'armor', digits: 1, at: (s, l) => statAt(s.armor, s.armorperlevel, l), per: (s) => s.armorperlevel,
    help: "Armure de base : réduit les dégâts physiques subis (dégâts × 100 / (100 + armure))." },
  { key: 'mr', label: 'RM', fr: 'Résistance magique', icon: 'mr', digits: 1, at: (s, l) => statAt(s.spellblock, s.spellblockperlevel, l), per: (s) => s.spellblockperlevel,
    help: "Résistance magique de base : réduit les dégâts magiques subis, avec la même formule que l'armure." },
  { key: 'as', label: 'VA', fr: "Vitesse d'attaque", icon: 'as', digits: 3, at: (s, l) => attackSpeedAt(s.attackspeed, s.attackspeedperlevel, l), per: (s) => s.attackspeedperlevel, perUnit: '%',
    help: "Attaques par seconde, au niveau choisi. Contrairement aux autres stats, la croissance par niveau est un pourcentage de la valeur de base." },
  { key: 'ms', label: 'VD', fr: 'Vitesse de déplacement', icon: 'ms', digits: 0, at: (s) => s.movespeed, per: () => 0,
    help: "Vitesse de déplacement de base, en unités par seconde. Ne croît pas avec le niveau." },
  { key: 'range', label: 'Portée', fr: "Portée d'attaque", icon: 'range', digits: 0, at: (s) => s.attackrange, per: () => 0,
    help: "Distance à laquelle le champion peut attaquer. Environ 125-175 pour le corps à corps, 500 et plus pour les champions à distance." },
  { key: 'hpregen', label: 'PV/5s', fr: 'Régénération de PV', icon: 'hpRegen5', digits: 1, at: (s, l) => statAt(s.hpregen, s.hpregenperlevel, l), per: (s) => s.hpregenperlevel,
    help: "Points de vie régénérés toutes les 5 secondes." },
  { key: 'mpregen', label: 'Mana/5s', fr: 'Régénération de mana', icon: 'manaRegen5', digits: 1, at: (s, l) => statAt(s.mpregen, s.mpregenperlevel, l), per: (s) => s.mpregenperlevel,
    help: "Mana régénéré toutes les 5 secondes." },
]

export const fmt = (v, d) => (v == null ? '' : String(r(v, d)))

/** Postes de la Faille de l'invocateur : [clé du client, libellé, libellé court]. */
export const POSITIONS = [
  ['TOP', 'Top', 'Top'], ['JUNGLE', 'Jungle', 'Jgl'], ['MIDDLE', 'Mid', 'Mid'], ['BOTTOM', 'ADC', 'ADC'], ['UTILITY', 'Support', 'Sup'],
]
export const POSITION_LABEL = Object.fromEntries(POSITIONS.map(([k, l]) => [k, l]))
export const POSITION_ORDER = POSITIONS.map(([k]) => k)

export const LEVEL_HELP = "Niveau : les stats affichées sont celles du champion à ce niveau (1 à 18), sans aucun item. Formule du jeu : base + croissance × (n−1) × (0,7025 + 0,0175 × (n−1))."

/** Comment lire les formules de scaling des sorts : [terme, explication]. */
export const SCALING_HELP = [
  ['Scaling (ratio)', "Bonus de dégâts, de soin ou d'effet qui dépend d'une stat du champion. « +50% [AP] » = +0,5 par point de puissance : avec 200 AP, ce ratio ajoute 100 à la valeur de base."],
  ['Valeurs par rang : 35/60/85', "Valeur à chaque rang de la compétence (rang 1 à 5, ou 1 à 3 pour l'ultime). Une seule valeur = identique à tous les rangs."],
  ['bonus / de base / max', "« bonus » : seulement la part de la stat venant des items, runes et effets (pas celle du champion). « de base » : la part propre au champion. Sans précision : la stat totale. « max » : PV maximums."],
  ['Valeur en x–y', "Valeur qui dépend du niveau du champion, du niveau 1 (x) au niveau 18 (y)."],
  ['0,03% / [AP]', "Pourcentage ajouté par point de la stat (ici, 0,03% de PV max en plus par point de puissance)."],
  ['?', "Valeur ou formule non disponible dans les données du jeu (mécanique trop complexe), ou stat non identifiée."],
]

/** Stats pour lesquelles le tableau affiche une colonne de ratio de scaling. */
export const RATIO_STATS = ['ap', 'ad', 'hp', 'armor', 'mr']

/**
 * Poids d'une stat dans le kit d'un champion : somme, sur ses compétences, du plus grand ratio de scaling de cette stat
 * (en %). Indicateur de dépendance à la stat, pas un total de dégâts ; bonus / total / max sont confondus.
 */
export function scalingRatio(champion, stat) {
  let sum = 0
  for (const s of champion.spells) {
    const c = (s.scalings ?? []).filter((x) => x.stat === stat).flatMap((x) => x.c)
    if (c.length) sum += Math.max(...c)
  }
  return Math.round(sum * 100)
}

export const CHAMP_COLUMN_HELP = {
  name: ['Nom', "Nom du champion en français et en anglais."],
  classes: ['Classes', "Classe(s) selon Riot : une ou deux, la première est la principale. À ne pas confondre avec les postes (top, jungle…)."],
  positions: ['Postes', "Postes jouables sur la Faille de l'invocateur : ceux pour lesquels le client Riot propose des runes recommandées pour ce champion (top, jungle, mid, ADC, support). Un champion peut en avoir plusieurs."],
  scales: ['Scale', "Stats sur lesquelles les compétences du champion s'appuient (les plus fréquentes d'abord, quatre au maximum) : par exemple AP pour un mage, AD pour un tireur, PV pour un tank. Détail et lecture des formules ci-dessous."],
  ratios: ['Ratios', "Poids de chaque stat dans les compétences du champion : somme, sur ses 4 compétences, du plus grand ratio de scaling de cette stat. Par exemple 185% d'AP = les ratios AP de Q, W, E et R font 185% au total. C'est un indicateur de dépendance à la stat (à quoi acheter), pas un total de dégâts ; « bonus », « total » et « max » sont confondus. Vide = aucune compétence ne scale dessus."],
  level: ['Niveau', LEVEL_HELP],
  difficulty: ['Diff.', "Difficulté de prise en main selon Riot, de 1 (facile) à 10 (très difficile)."],
}

/** Classes de champions (clé Data Dragon -> nom français). */
export const CLASSES_FR = { Fighter: 'Combattant', Tank: 'Tank', Mage: 'Mage', Assassin: 'Assassin', Marksman: 'Tireur', Support: 'Soutien' }

/** Documentation des classes : [résumé court, description]. */
export const CLASS_HELP = {
  Fighter: ['Polyvalent au corps à corps',
    "Champions de mêlée ou de courte portée, à la fois résistants et dangereux. Ils infligent des dégâts soutenus en restant au contact de l'ennemi, mais doivent s'en approcher pour être efficaces. Ils achètent en général un mélange de dégâts d'attaque et de PV / résistances."],
  Tank: ['Première ligne, encaisse et contrôle',
    "Champions très résistants (PV, armure, résistance magique) qui engagent les combats, absorbent les dégâts à la place de leurs alliés et les empêchent d'être atteints grâce au contrôle (étourdissements, ralentissements…). Leurs dégâts sont faibles."],
  Mage: ['Dégâts magiques à distance',
    "Champions dont les dégâts viennent surtout des compétences, avec de la puissance (AP). Ils ont souvent de la portée, des dégâts de zone ou en rafale, et du contrôle, mais sont fragiles et dépendent de leur ressource (mana) et des délais de récupération."],
  Assassin: ['Rafale de dégâts sur une cible',
    "Champions mobiles qui éliminent une cible précise (en général fragile : mage, tireur) en quelques secondes avant de ressortir du combat. Très gros dégâts en rafale, mais peu résistants et vulnérables s'ils sont repérés."],
  Marksman: ['Dégâts soutenus par les attaques',
    "Champions à distance dont les dégâts viennent surtout des attaques de base (dégâts d'attaque, vitesse d'attaque, coups critiques). Ils sont la principale source de dégâts de l'équipe sur la durée, mais très fragiles : ils ont besoin d'être protégés."],
  Support: ['Protège et aide ses alliés',
    "Champions qui améliorent leur équipe : soins, boucliers, bonus, contrôle, vision. Leur utilité compte plus que leurs propres dégâts, faibles. Ils jouent souvent aux côtés du tireur (en bas) ou autour de leurs alliés."],
}

/**
 * Lien Mobalytics d'un champion. Le slug est le nom anglais en minuscules, sans apostrophes ni points, espaces -> « - »
 * (Kai'Sa -> kaisa, Dr. Mundo -> dr-mundo). Cas particulier : Nunu & Willump -> nunu.
 * Format construit de mémoire : le site refuse les accès automatisés, il n'a pas pu être vérifié.
 */
const SLUG_EXCEPTIONS = { 'Nunu & Willump': 'nunu' }
export const mobalyticsSlug = (nameEn) =>
  SLUG_EXCEPTIONS[nameEn] ??
  nameEn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const mobalyticsUrl = (champion) => `https://mobalytics.gg/lol/champions/${mobalyticsSlug(champion.name.en)}/build`
