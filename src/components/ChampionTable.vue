<script setup>
import { computed, toRef, watch } from 'vue'
import { CHAMP_COLS, fmt, CLASSES_FR, POSITIONS, POSITION_LABEL, mobalyticsUrl, RATIO_STATS, scalingRatio } from '../../shared/champions.js'
import { localSrc } from '../lib/data.js'
import { ui, setRef } from '../lib/state.js'
import { hlOfStat } from '../lib/icons.js'
import { STAT_BY_KEY } from '../../shared/stats.js'
import StatIcon from './StatIcon.vue'
import ChampionDetail from './ChampionDetail.vue'

const props = defineProps({ champions: { type: Array, required: true }, currentChampion: String })
const emit = defineEmits(['pick', 'help', 'helphover', 'hover', 'level'])

// état persistant (src/lib/state.js) : recherche, classes, postes, niveau, tri, lignes dépliées
const st = ui.champions
const query = toRef(st, 'query')
const classes = setRef(st, 'classes')
const positions = setRef(st, 'positions')
const level = toRef(st, 'level')
const sort = toRef(st, 'sort')
const open = setRef(st, 'open')
watch(level, (l) => emit('level', Math.min(18, Math.max(1, Math.round(l) || 1))), { immediate: true })

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const lvl = computed(() => Math.min(18, Math.max(1, Math.round(level.value) || 1)))

const colByKey = Object.fromEntries(CHAMP_COLS.map((c) => [c.key, c]))
// ratios de scaling par champion (calculés une fois)
const ratios = computed(() => new Map(props.champions.map((c) => [c.id, Object.fromEntries(RATIO_STATS.map((st) => [st, scalingRatio(c, st)]))])))

const value = (c, key) => {
  if (key.startsWith('ratio.')) return ratios.value.get(c.id)[key.slice(6)]
  if (key === 'name') return c.name.fr
  if (key === 'nameEn') return c.name.en
  if (key === 'difficulty') return c.info.difficulty
  return colByKey[key].at(c.stats, lvl.value)
}


const rows = computed(() => {
  const q = norm(query.value.trim())
  const { key, dir } = sort.value
  const m = dir === 'asc' ? 1 : -1
  return props.champions
    .filter((c) => (!classes.value.size || c.tags.some((t) => classes.value.has(t))) &&
      (!positions.value.size || c.positions.some((p) => positions.value.has(p))) &&
      (!q || norm(c.name.fr).includes(q) || norm(c.name.en).includes(q) || norm(c.title.fr).includes(q)))
    .sort((a, b) => {
      const x = value(a, key), y = value(b, key)
      return (typeof x === 'string' ? x.localeCompare(y, 'fr') : x - y) * m || a.name.fr.localeCompare(b.name.fr, 'fr')
    })
})

function setSort(key) {
  const text = key === 'name' || key === 'nameEn'
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
const toggleClass = (t) => toggleIn(classes, t)
const togglePos = (p) => toggleIn(positions, p)
const toggleOpen = (id) => toggleIn(open, id)
const CLASS_LIST = Object.entries(CLASSES_FR)
const help = (k) => 'champ.' + k
</script>

<template>
  <section class="table-wrap">
    <div class="toolbar">
      <input v-model="query" type="search" placeholder="Rechercher…" />
      <div class="chips">
        <button v-for="[k, label] in CLASS_LIST" :key="k" :class="{ on: classes.has(k) }" @click="toggleClass(k)"
                @mouseenter="emit('helphover', help('class.' + k))" @mouseleave="emit('helphover', null)">{{ label }}</button>
      </div>
      <div class="chips">
        <button v-for="[k, label] in POSITIONS" :key="k" :class="{ on: positions.has(k) }" @click="togglePos(k)">{{ label }}</button>
      </div>
      <label class="level" @mouseenter="emit('helphover', help('level'))" @mouseleave="emit('helphover', null)">
        Niveau <input v-model.number="level" type="range" min="1" max="18" /> <b>{{ lvl }}</b>
      </label>
      <button class="help-btn" title="Aide sur les colonnes" @click="emit('help')">?</button>
      <span class="count">{{ rows.length }} champions</span>
    </div>

    <div class="scroll">
      <table class="two-rows">
        <thead>
          <tr>
            <th class="icon" rowspan="2"></th>
            <th rowspan="2" class="sortable" @click="setSort('name')" @mouseenter="emit('helphover', help('name'))" @mouseleave="emit('helphover', null)">Nom (FR){{ arrow('name') }}</th>
            <th rowspan="2" class="sortable" @click="setSort('nameEn')" @mouseenter="emit('helphover', help('name'))" @mouseleave="emit('helphover', null)">Name (EN){{ arrow('nameEn') }}</th>
            <th rowspan="2" @mouseenter="emit('helphover', help('classes'))" @mouseleave="emit('helphover', null)">Classes</th>
            <th rowspan="2" @mouseenter="emit('helphover', help('positions'))" @mouseleave="emit('helphover', null)">Postes</th>
            <th rowspan="2" class="sortable num" @click="setSort('difficulty')" @mouseenter="emit('helphover', help('difficulty'))" @mouseleave="emit('helphover', null)">Diff.{{ arrow('difficulty') }}</th>
            <th rowspan="2" @mouseenter="emit('helphover', help('scales'))" @mouseleave="emit('helphover', null)">Scale</th>
            <th class="group" :colspan="RATIO_STATS.length" @mouseenter="emit('helphover', help('ratios'))" @mouseleave="emit('helphover', null)">Ratios</th>
            <th v-for="c in CHAMP_COLS" :key="c.key" rowspan="2" class="sortable num" :data-hl="hlOfStat(c.icon)"
                @click="setSort(c.key)" @mouseenter="emit('helphover', help(c.key))" @mouseleave="emit('helphover', null)">
              <StatIcon :stat="c.icon" /> {{ c.label }}{{ arrow(c.key) }}
            </th>
            <th rowspan="2"></th>
          </tr>
          <tr class="sub">
            <th v-for="st in RATIO_STATS" :key="st" class="sortable num" :data-hl="hlOfStat(st)" @click="setSort('ratio.' + st)"
                @mouseenter="emit('helphover', help('ratios'))" @mouseleave="emit('helphover', null)">
              <StatIcon :stat="st" /> {{ STAT_BY_KEY[st].short }}{{ arrow('ratio.' + st) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="c in rows" :key="c.id">
            <tr :class="{ expanded: open.has(c.id) }" @click="toggleOpen(c.id)" @mouseenter="emit('hover', c)" @mouseleave="emit('hover', null)">
              <td class="icon"><img :src="localSrc(c.icon)" :alt="c.name.en" loading="lazy" width="32" height="32" /></td>
              <td>{{ c.name.fr }}</td>
              <td class="muted">{{ c.name.en }}</td>
              <td class="muted">{{ c.tags.map((t) => CLASSES_FR[t] ?? t).join(', ') }}</td>
              <td>{{ c.positions.map((p) => POSITION_LABEL[p]).join(', ') }}</td>
              <td class="num">{{ c.info.difficulty }}</td>
              <td class="scales"><StatIcon v-for="st in c.scales" :key="st" :stat="st" :size="15" /></td>
              <td v-for="st in RATIO_STATS" :key="st" class="num" :data-hl="hlOfStat(st)">{{ ratios.get(c.id)[st] ? ratios.get(c.id)[st] + '%' : '' }}</td>
              <td v-for="col in CHAMP_COLS" :key="col.key" class="num" :data-hl="hlOfStat(col.icon)">{{ fmt(col.at(c.stats, lvl), col.digits) }}</td>
              <td class="act">
                <a class="ext" :href="mobalyticsUrl(c)" target="_blank" rel="noopener noreferrer" title="Ouvrir sur Mobalytics" @click.stop>↗</a>
                <button class="add" :class="{ on: currentChampion === c.id }" title="Associer ce champion au set en cours" @click.stop="emit('pick', c)">⚑</button>
              </td>
            </tr>
            <tr v-if="open.has(c.id)" class="detail">
              <td :colspan="8 + RATIO_STATS.length + CHAMP_COLS.length"><ChampionDetail :champion="c" :level="lvl" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
