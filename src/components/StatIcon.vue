<script setup>
import { computed } from 'vue'
import { PATHS, STAT_ICON, TAG_ICON, hlOf } from '../lib/icons.js'

const props = defineProps({ stat: String, tag: String, size: { type: Number, default: 14 } })
const def = computed(() => (props.stat ? STAT_ICON[props.stat] : TAG_ICON[props.tag]))
</script>

<template>
  <svg v-if="def" class="ico" :data-hl="hlOf(def)" :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" :style="{ color: def[1] }" aria-hidden="true">
    <path fill-rule="evenodd" :d="PATHS[def[0]]" />
  </svg>
</template>
