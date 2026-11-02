<script setup>
import { CHAMP_COLS, fmt, CLASSES_FR, POSITION_LABEL, mobalyticsUrl } from '../../shared/champions.js'
import { localSrc } from '../lib/data.js'
import { decorate } from '../lib/icons.js'
import { STAT_BY_KEY } from '../../shared/stats.js'
import StatIcon from './StatIcon.vue'

defineProps({ champion: { type: Object, required: true }, level: { type: Number, default: 1 }, preview: Boolean })

const INFO = [['attack', 'Attaque'], ['defense', 'Défense'], ['magic', 'Magie'], ['difficulty', 'Difficulté']]
const QUAL = { max: 'max', base: 'de base', bonus: 'bonus' }
const pct = (c) => String(+(c * 100).toPrecision(3))
// stats de scaling d'un sort, avec leurs coefficients (« 50% AP ») ; les stats non identifiées sont omises
const scal = (s) => (s.scalings ?? []).filter((x) => x.stat)
const rank = (s) => (s.maxrank === 1 ? 'rang unique' : `${s.maxrank} rangs`)
</script>

<template>
  <div class="detail-grid">
    <img class="big" :src="localSrc(champion.icon)" :alt="champion.name.en" width="64" height="64" />
    <div class="detail-main">
      <h4>{{ champion.name.fr }} <span class="muted">· {{ champion.name.en }}</span></h4>
      <div class="muted small">{{ champion.title.fr }} · <a class="ext" :href="mobalyticsUrl(champion)" target="_blank" rel="noopener noreferrer">Mobalytics ↗</a></div>
      <div class="stats-line">
        <span v-for="t in champion.tags" :key="t" class="tag">{{ CLASSES_FR[t] ?? t }}</span>
        <span v-for="p in champion.positions" :key="p" class="tag pos" title="Poste jouable">{{ POSITION_LABEL[p] }}</span>
        <span v-if="champion.resource.fr && champion.resource.fr !== 'Aucun'" class="tag">{{ champion.resource.fr }}</span>
      </div>

      <div v-if="champion.scales?.length" class="stats-line scale-line">
        <span class="muted small">Scale sur</span>
        <span v-for="st in champion.scales" :key="st" class="stat-row"><StatIcon :stat="st" :size="15" /> {{ STAT_BY_KEY[st]?.short ?? st }}</span>
      </div>

      <div class="info-bars pv-late">
        <div v-for="[k, label] in INFO" :key="k" :title="label + ' : ' + champion.info[k] + ' / 10'">
          <span class="muted small">{{ label }}</span>
          <span class="bar"><i :style="{ width: champion.info[k] * 10 + '%' }"></i></span>
        </div>
      </div>

      <div class="muted small pv-late">Niveau {{ level }} (base + croissance par niveau)</div>
      <div class="cstats pv-late">
        <div v-for="c in CHAMP_COLS" :key="c.key" class="cstat" :title="c.fr">
          <StatIcon :stat="c.icon" :size="15" />
          <span class="muted">{{ c.label }}</span>
          <b>{{ fmt(c.at(champion.stats, level), c.digits) }}</b>
          <span class="muted small">{{ c.per(champion.stats) ? '+' + fmt(c.per(champion.stats), 3) + (c.perUnit ?? '') : '' }}</span>
        </div>
      </div>

      <ul class="effects spells">
        <li>
          <img :src="localSrc(champion.passive.icon)" width="28" height="28" :alt="champion.passive.name.en" />
          <span class="badge passive">Passif</span> <b>{{ champion.passive.name.fr }}</b>
          <p>{{ champion.passive.text.fr }}</p>
        </li>
        <li v-for="s in champion.spells" :key="s.key">
          <img :src="localSrc(s.icon)" width="28" height="28" :alt="s.name.en" />
          <span class="badge active">{{ s.key }}</span> <b>{{ s.name.fr }}</b>
          <span class="fchip" title="Délai de récupération par rang (s)">⏱ {{ s.cooldown }} s</span>
          <span v-if="s.cost && s.cost !== '0'" class="fchip" title="Coût par rang">{{ s.cost }} {{ champion.resource.fr }}</span>
          <span v-if="s.range && s.range !== '0'" class="fchip" title="Portée"><StatIcon stat="range" /> {{ s.range }}</span>
          <span class="muted small">{{ rank(s) }}</span>
          <span v-for="sc in scal(s)" :key="sc.stat + sc.q" class="fchip sc" title="Scaling">
            {{ sc.c.map(pct).join('/') }}% <small v-if="sc.q">{{ QUAL[sc.q] }}</small> <StatIcon :stat="sc.stat" />
          </span>
          <p v-if="s.desc" class="sdesc" v-html="decorate(s.desc.fr)"></p>
          <p v-else>{{ s.text.fr }}</p>
        </li>
      </ul>

      <details class="desc-en" :open="preview">
        <summary>Descriptions anglaises</summary>
        <p class="desc"><b>{{ champion.passive.name.en }}</b> — {{ champion.passive.text.en }}</p>
        <p v-for="s in champion.spells" :key="s.key" class="desc"><b>{{ s.key }} · {{ s.name.en }}</b> — <span v-if="s.desc" v-html="decorate(s.desc.en)"></span><template v-else>{{ s.text.en }}</template></p>
      </details>
    </div>
  </div>
</template>
