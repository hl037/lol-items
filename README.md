# LoL Items

Tableau triable des items de League of Legends (noms FR/EN, stats, formules d'effets) + éditeur de sets
exportables au format du client.

```sh
pnpm install
pnpm fetch-data          # items + champions (les deux commandes ci-dessous)
pnpm fetch-champions     # champions (Data Dragon) + icônes -> public/data/champions.json et public/data/champions/
pnpm fetch-items         # télécharge items.json (EN+FR) + les icônes -> public/data/items.json et public/data/icons/<id>.png
pnpm fetch-items --pbe   # idem depuis le PBE
pnpm fetch-items --force-icons   # retélécharge toutes les icônes
pnpm dev                 # app sur http://localhost:5173
pnpm test                # tests du parseur
pnpm build               # build statique dans dist/ (relancer fetch-data avant pour mettre à jour)
pnpm gh-pages            # même build, dans pages.ignored/ (ignoré par git) pour GitHub Pages ; ne supprime que ses propres sorties (index.html, assets/, data/) : .git, CNAME… sont conservés
```

> `pnpm fetch` est une commande native de pnpm : le script s'appelle donc `fetch-items`.

## Données

`scripts/process.mjs` transforme les descriptions HTML en :
- `stats` : `{ ad: 75, crit: 25, ... }` (clés et valeur en or dans `shared/stats.js`) ;
- `effects[]` : passifs/actifs FR+EN avec `formulas` typées (`grant`, `multiplier`, `reduce`, `convert`,
  `percentOf`, `restore`, `duration`, `slow`) ;
- `gold` : valeur en or des stats et efficacité (uniquement si toutes les stats ont un prix de référence).

Les formules viennent de regex sur le texte : elles couvrent les cas simples, le texte reste la référence.
CommunityDragon n'expose pas les ratios/dégâts chiffrés dans `items.json` (« bonus magic damage »).

## Champions

Sources : Data Dragon (`championFull.json`, EN + FR) pour les stats de base et par niveau, les noms, descriptions courtes, coûts, délais et portées ;
CommunityDragon pour les **formules de sorts** : les données brutes du jeu (`game/data/characters/<alias>/<alias>.bin.json`) et les descriptions
dynamiques (`champions/<id>.json`, avec des marqueurs `@TotalDamage@`).

`scripts/spells.mjs` évalue les calculs des sorts (valeur par rang + coefficients × stat) et remplace chaque marqueur par la formule lisible
« 35/60/85/110/135 (+50% [AP]) ». Pour chaque sort, `scalings` liste les stats utilisées ; `scales` (champion) les plus fréquentes.
- Les codes numériques de stat (`mStat`) ont été **déduits** en comparant avec des sorts dont le scaling est connu : 0 = AP, 1 = armure, 2 = AD,
  4 = vitesse d'attaque, 6 = RM, 7 = vitesse de déplacement, 8 = chances de critique, 9 = dégâts critiques, 12 = PV, 18 = omnivampirisme,
  29 = létalité. Les autres (10, 13-16, 31) s'affichent « ? » avec le numéro en infobulle. `mStatFormula` : absent = total, 1 = de base, 2 = bonus.
- Colonnes « Ratios » (AP, AD, PV, Arm, RM) : `scalingRatio` (`shared/champions.js`) = somme, sur les 4 compétences, du plus grand ratio de la stat. Indicateur de dépendance à la stat (bonus/total/max confondus), pas un total de dégâts ; les champions n'ont pas d'AP de base, d'où ces colonnes.
- Non gérés : les passifs (le texte source n'a pas de marqueurs), et les calculs trop complexes (compteurs d'effets, conditions, produits de deux
  valeurs variables) qui s'affichent « ? ». Environ 96 % des marqueurs sont résolus ; `pnpm fetch-champions` liste les sorts concernés.
- Les stats de base viennent de Data Dragon ; les stats par niveau sont calculées au niveau choisi (1-18) avec la formule du jeu.

Les **classes** (combattant, tank, mage, assassin, tireur, soutien ; colonne « Classes » et filtres) sont celles de Riot via Data Dragon, documentées dans l'aide (`CLASS_HELP`). Les **postes** (top, jungle, mid, ADC, support) viennent de `champion-rune-recommendations.json` (CommunityDragon) : ce sont les postes pour lesquels le client Riot propose des runes sur la Faille de l'invocateur. Colonne, filtre et badges dans le détail.
Lien ↗ vers Mobalytics (`mobalyticsUrl` dans `shared/champions.js`, URL construite d'après le nom anglais, non vérifiable automatiquement : le site renvoie 403 aux scripts).
Le drapeau ⚑ d'une ligne associe le champion au set en cours (`associatedChampions` dans le JSON exporté).

## Interface

- Clic sur une ligne : description complète (FR, et EN repliée) avec icônes et couleurs par type de dégâts.
- Zone d'aperçu (volet de droite, au-dessus du set) : survol d'une ligne = détail de l'item avec une ligne par effet ;
  survol d'un en-tête de colonne = son aide ; le bouton « ? » de la barre d'outils affiche le glossaire complet.
  Textes d'aide dans `shared/stats.js`, icônes dessinées dans `src/lib/icons.js`.
- Survoler une icône met en évidence toutes les icônes identiques (et la colonne de la stat).
- Valeurs : `+75` = absolue, `+25%` = relative.
- Items : regroupements de colonnes définis dans `STAT_GROUPS` (`shared/stats.js`), toujours entre stats de **même icône** (vérifié par `scripts/groups.test.mjs`). Critique : sous-colonnes C (chance) / D (dégâts), « - » si l'autre est présente. Fixe + pourcentage (vitesse de déplacement, pénétration magique…) : une seule colonne `+20+8%`. Un groupe n'est appliqué que si au moins deux de ses stats sont cochées dans « Colonnes de stats ».
- Les icônes d'items sont servies localement (`data/icons/`) ; si un téléchargement échoue, l'URL CommunityDragon est conservée.

## Sets

Le JSON copié suit le format des fichiers `Config/**/Recommended/*.json` du client. À placer dans
`<dossier LoL>/Config/Champions/<Champion>/Recommended/` (ou `Config/Global/Recommended/`).
