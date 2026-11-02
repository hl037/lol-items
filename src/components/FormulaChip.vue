<script setup>
// Formule structurée (voir scripts/process.mjs) rendue avec des icônes à la place des noms de stats.
import { computed } from 'vue'
import { DMG_TAG } from '../lib/icons.js'
import { formatFormula, pct } from '../lib/format.js'
import StatIcon from './StatIcon.vue'

const props = defineProps({ f: { type: Object, required: true } })
const SCOPE = { max: 'max', bonus: 'bonus', current: 'actuel', missing: 'manquant', base: 'de base', total: 'total' }
const n = (v) => String(+v.toFixed(2))
const title = computed(() => formatFormula(props.f))
</script>

<template>
  <code class="fchip" :title="title">
    <template v-if="f.type === 'grant'">
      +{{ n(f.value) }}{{ f.unit === 'percent' ? '%' : '' }} <StatIcon :stat="f.stat" /><small v-if="f.perStack"> /cumul</small>
    </template>
    <template v-else-if="f.type === 'multiplier'">×{{ n(1 + f.factor) }} <StatIcon :stat="f.stat" /> <small>total</small></template>
    <template v-else-if="f.type === 'reduce'">−{{ pct(f.factor) }} <StatIcon :stat="f.stat" /> <small>cible</small></template>
    <template v-else-if="f.type === 'convert'">
      +{{ pct(f.ratio) }} <StatIcon :stat="f.from.stat" /><small> {{ SCOPE[f.from.scope] }}</small> → <StatIcon :stat="f.to" />
    </template>
    <template v-else-if="f.type === 'percentOf'">
      {{ pct(f.ratio) }} <StatIcon :stat="f.from.stat" /><small> {{ SCOPE[f.from.scope] }}</small> →
      <StatIcon v-if="DMG_TAG[f.as]" :tag="DMG_TAG[f.as]" /><small v-else>dégâts</small>
    </template>
    <template v-else-if="f.type === 'restore'">
      +{{ n(f.value) }} <StatIcon :stat="f.stat" /><small v-if="f.every"> {{ f.every === 'hit' ? '/coup' : '/' + f.every + 's' }}</small>
    </template>
    <template v-else-if="f.type === 'duration'">{{ n(f.seconds) }} s</template>
    <template v-else-if="f.type === 'slow'">ralentit {{ pct(f.value) }}</template>
    <template v-else>{{ title }}</template>
  </code>
</template>
