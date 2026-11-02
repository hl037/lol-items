<script setup>
import { computed, ref, watch } from 'vue'
import { STATS, STAT_BY_KEY, STAT_GROUPS, groupKeys } from '../../shared/stats.js'
import { formatStat, gold } from '../lib/format.js'
import { iconSrc } from '../lib/data.js'
import { hlOfStat } from '../lib/icons.js'
import StatIcon from './StatIcon.vue'
import ItemDetail from './ItemDetail.vue'

const props = defineProps({ items: { type: Array, required: true } })
const emit = defineEmits(['add', 'help', 'helphover', 'hover'])

const TIERS = [
  ['starter', 'Départ'], ['consumable', 'Consommables'], ['trinket', 'Trinkets'], ['boots', 'Bottes'],
  ['basic', 'Basiques'], ['epic', 'Intermédiaires'], ['legendary', 'Légendaires'], ['other', 'Autres'],
]
const HEAD = [['nameFr', 'Nom (FR)', ''], ['nameEn', 'Name (EN)', ''], ['total', 'Prix', 'num'], ['price', 'Recette', 'num'], ['eff', 'Eff. or', 'num']]
const DEFAULT_COLS = ['ad', 'ap', 'hp', 'armor', 'mr', 'as', 'crit', 'critDamage', 'ah', 'ms']
const KEY = 'lol-items:table:v1'

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {} } catch { return {} } }
const saved = load()

const query = ref('')
const tiers = ref(new Set(saved.tiers ?? ['legendary', 'epic', 'boots', 'basic']))
const cols = ref(saved.cols ?? DEFAULT_COLS)
const showSpecial = ref(false)
const colPicker = ref(false)
const sort = ref({ key: 'total', dir: 'desc' })
const open = ref(new Set())

watch([tiers, cols], () => {
  try { localStorage.setItem(KEY, JSON.stringify({ tiers: [...tiers.value], cols: cols.value })) } catch { /* ignore */ }
}, { deep: true })

// stats réellement présentes dans les données, pour ne proposer que celles-là
const presentStats = computed(() => {
  const used = new Set(props.items.flatMap((i) => Object.keys(i.stats)))
  return STATS.filter((s) => used.has(s.key))
})
const shownStats = computed(() => presentStats.value.filter((s) => cols.value.includes(s.key)))

/**
 * Disposition des colonnes de stats : colonne simple, groupe de sous-colonnes (`cols`) ou colonne fusionnée (`merge`),
 * à condition qu'au moins deux stats du groupe soient affichées. Le groupe se place à la position de sa première stat.
 */
const layout = computed(() => {
  const sel = new Set(shownStats.value.map((s) => s.key))
  const done = new Set()
  const out = []
  for (const s of shownStats.value) {
    if (done.has(s.key)) continue
    const g = STAT_GROUPS.find((x) => groupKeys(x).includes(s.key))
    const keys = g ? groupKeys(g).filter((k) => sel.has(k)) : []
    if (g && keys.length > 1) {
      keys.forEach((k) => done.add(k))
      if (g.kind === 'cols') {
        out.push({ kind: 'cols', label: g.label, icon: keys[0], id: keys[0],
          cols: keys.map((k) => ({ id: k, stat: STAT_BY_KEY[k], sub: g.stats.find((u) => u.stat === k).label })) })
      } else {
        out.push({ kind: 'merge', label: g.label, icon: keys[0], id: 'm:' + keys.join(','), keys })
      }
    } else {
      done.add(s.key)
      out.push({ kind: 'single', label: s.short, icon: s.key, id: s.key })
    }
  }
  return out
})

/** Colonnes de données (une cellule chacune) dans l'ordre d'affichage. */
const flatCols = computed(() => layout.value.flatMap((l) => (l.kind === 'cols' ? l.cols.map((c) => ({ ...c, l })) : [l])))

/** Texte d'une cellule. `cols` : « - » si la stat est absente alors que l'autre sous-colonne est présente. `merge` : « +20+10% ». */
function cell(i, c) {
  if (c.kind === 'merge') return c.keys.filter((k) => i.stats[k] != null).map((k) => formatStat(k, i.stats[k])).join('')
  if (c.kind === 'single') return i.stats[c.id] != null ? formatStat(c.id, i.stats[c.id]) : ''
  if (i.stats[c.id] != null) return formatStat(c.id, i.stats[c.id])
  return c.l.cols.some((o) => i.stats[o.id] != null) ? '-' : ''
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const value = (i, key) => {
  if (key === 'nameEn') return i.name.en
  if (key === 'nameFr') return i.name.fr
  if (key === 'total') return i.total
  if (key === 'price') return i.price
  if (key === 'eff') return i.gold.efficiency
  if (key === 'id') return i.id
  if (key.startsWith('m:')) {
    // colonne fusionnée : tri par valeur fixe, puis par pourcentage (poids 1/1000)
    const ks = key.slice(2).split(',')
    return ks.every((k) => i.stats[k] == null) ? null : ks.reduce((acc, k, n) => acc + (i.stats[k] ?? 0) / 1000 ** n, 0)
  }
  return i.stats[key] ?? null
}

const rows = computed(() => {
  const q = norm(query.value.trim())
  const list = props.items.filter((i) =>
    tiers.value.has(i.tier) && (showSpecial.value || !i.special) &&
    (!q || norm(i.name.en).includes(q) || norm(i.name.fr).includes(q) || String(i.id) === q))
  const { key, dir } = sort.value
  const m = dir === 'asc' ? 1 : -1
  return list.slice().sort((a, b) => {
    const x = value(a, key), y = value(b, key)
    if (x == null && y == null) return a.id - b.id
    if (x == null) return 1 // les valeurs absentes restent en bas quel que soit le sens
    if (y == null) return -1
    return (typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y) * m || a.id - b.id
  })
})

function setSort(key) {
  const text = key === 'nameEn' || key === 'nameFr'
  sort.value = sort.value.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: text ? 'asc' : 'desc' }
}
const arrow = (key) => (sort.value.key === key ? (sort.value.dir === 'asc' ? ' ▲' : ' ▼') : '')

function toggleIn(r, v) {
  const s = new Set(r.value)
  s.has(v) ? s.delete(v) : s.add(v)
  r.value = s
}
// (dans le template les refs sont déballées : on passe par ces fonctions plutôt que par toggleIn directement)
const toggleTier = (k) => toggleIn(tiers, k)
const toggleOpen = (id) => toggleIn(open, id)
function toggleCol(k) {
  cols.value = cols.value.includes(k) ? cols.value.filter((c) => c !== k) : [...cols.value, k]
}
const eff = (i) => (i.gold.efficiency == null ? '—' : Math.round(i.gold.efficiency * 100) + '%')
const effClass = (i) => (i.gold.efficiency == null ? '' : i.gold.efficiency >= 1 ? 'good' : i.gold.efficiency < 0.75 ? 'low' : '')
</script>

<template>
  <section class="table-wrap">
    <div class="toolbar">
      <input v-model="query" type="search" placeholder="Rechercher (FR / EN / id)…" />
      <div class="chips">
        <button v-for="[k, label] in TIERS" :key="k" :class="{ on: tiers.has(k) }" @click="toggleTier(k)">{{ label }}</button>
      </div>
      <label class="check"><input v-model="showSpecial" type="checkbox" /> autres modes</label>
      <div class="picker">
        <button @click="colPicker = !colPicker">Colonnes de stats ({{ shownStats.length }})</button>
        <div v-if="colPicker" class="popover">
          <label v-for="s in presentStats" :key="s.key">
            <input type="checkbox" :checked="cols.includes(s.key)" @change="toggleCol(s.key)" /> {{ s.fr }}
          </label>
        </div>
      </div>
      <button class="help-btn" title="Aide sur les colonnes" @click="emit('help', null)">?</button>
      <span class="count">{{ rows.length }} items</span>
    </div>

    <div class="scroll">
      <table class="two-rows">
        <thead>
          <tr>
            <th class="icon" rowspan="2"></th>
            <th v-for="[k, label, cls] in HEAD" :key="k" rowspan="2" class="sortable" :class="cls" @click="setSort(k)"
                @mouseenter="emit('helphover', k)" @mouseleave="emit('helphover', null)">
              {{ label }}{{ arrow(k) }}
            </th>
            <template v-for="l in layout" :key="l.id">
              <th v-if="l.kind === 'cols'" class="group" :colspan="l.cols.length" :data-hl="hlOfStat(l.icon)"
                  @mouseenter="emit('helphover', l.icon)" @mouseleave="emit('helphover', null)">
                <StatIcon :stat="l.icon" /> {{ l.label }}
              </th>
              <th v-else class="sortable num" rowspan="2" :data-hl="hlOfStat(l.icon)" @click="setSort(l.id)"
                  @mouseenter="emit('helphover', l.icon)" @mouseleave="emit('helphover', null)">
                <StatIcon :stat="l.icon" /> {{ l.label }}{{ arrow(l.id) }}
              </th>
            </template>
            <th rowspan="2"></th>
          </tr>
          <tr class="sub">
            <template v-for="l in layout.filter((x) => x.kind === 'cols')" :key="l.id">
              <th v-for="c in l.cols" :key="c.id" class="sortable num" :data-hl="hlOfStat(c.id)" @click="setSort(c.id)"
                  @mouseenter="emit('helphover', c.id)" @mouseleave="emit('helphover', null)">{{ c.sub }}{{ arrow(c.id) }}</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <template v-for="i in rows" :key="i.id">
            <tr :class="{ expanded: open.has(i.id) }" @click="toggleOpen(i.id)" @mouseenter="emit('hover', i)" @mouseleave="emit('hover', null)">
              <td class="icon"><img :src="iconSrc(i)" :alt="i.name.en" loading="lazy" width="32" height="32" /></td>
              <td>{{ i.name.fr }}</td>
              <td class="muted">{{ i.name.en }}</td>
              <td class="num">{{ gold(i.total) }}</td>
              <td class="num muted">{{ i.from.length ? gold(i.price) : '' }}</td>
              <td class="num" :class="effClass(i)">{{ eff(i) }}</td>
              <td v-for="c in flatCols" :key="c.id" class="num" :data-hl="hlOfStat(c.icon ?? c.id)">{{ cell(i, c) }}</td>
              <td class="act"><button class="add" title="Ajouter au set" @click.stop="emit('add', i)">+</button></td>
            </tr>
            <tr v-if="open.has(i.id)" class="detail">
              <td :colspan="7 + flatCols.length">
                <ItemDetail :item="i" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
