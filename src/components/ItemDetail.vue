<script setup>
import { STAT_BY_KEY } from '../../shared/stats.js'
import { formatStat, gold } from '../lib/format.js'
import { iconSrc } from '../lib/data.js'
import { decorate } from '../lib/icons.js'
import StatIcon from './StatIcon.vue'
import FormulaChip from './FormulaChip.vue'

defineProps({ item: { type: Object, required: true }, preview: Boolean })
</script>

<template>
  <div class="detail-grid">
    <img class="big" :src="iconSrc(item)" :alt="item.name.en" width="64" height="64" />
    <div class="detail-main">
      <h4>{{ item.name.fr }} <span class="muted">· {{ item.name.en }}</span></h4>
      <div class="stats-line">
        <span v-for="(v, k) in item.stats" :key="k" class="stat-row" :title="STAT_BY_KEY[k]?.fr">
          <StatIcon :stat="k" :size="15" /><b>{{ formatStat(k, v) }}</b> {{ STAT_BY_KEY[k]?.fr ?? k }}
        </span>
      </div>

      <!-- une ligne par effet (passif / actif, donc conditionnel), avec ses formules -->
      <ul v-if="item.effects.length" class="effects">
        <li v-for="(e, idx) in item.effects" :key="idx" :title="e.text.fr">
          <span class="badge" :class="e.type">{{ e.type === 'active' ? 'Actif' : 'Passif' }}</span>
          <b>{{ e.name.fr }}</b>
          <FormulaChip v-for="(f, fi) in e.formulas" :key="fi" :f="f" />
          <span v-if="!e.formulas.length" class="muted small">non chiffré</span>
        </li>
      </ul>

      <div class="desc" v-html="decorate(item.desc.fr)"></div>
      <div class="meta muted">
        Prix {{ gold(item.total) }} or<template v-if="item.from.length"> · recette {{ gold(item.price) }} or</template>
        · valeur des stats ≈ {{ gold(item.gold.value) }} or
      </div>
      <details class="desc-en" :open="preview"><summary>Description anglaise</summary><div class="desc" v-html="decorate(item.desc.en)"></div></details>
    </div>
  </div>
</template>
