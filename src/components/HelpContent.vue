<script setup>
// Aide sur les colonnes : une seule entrée (`only`, au survol d'un en-tête) ou le glossaire complet de l'onglet.
// Les clés d'aide des champions sont préfixées « champ. ».
import { computed } from 'vue'
import { STATS, STAT_HELP, COLUMN_HELP, TAG_HELP } from '../../shared/stats.js'
import { CHAMP_COLS, CHAMP_COLUMN_HELP, CLASSES_FR, CLASS_HELP, SCALING_HELP } from '../../shared/champions.js'
import StatIcon from './StatIcon.vue'

const props = defineProps({ only: String, scope: { type: String, default: 'items' } })
defineEmits(['close'])

const champ = computed(() => props.scope === 'champions' || props.only?.startsWith('champ.'))
const key = computed(() => props.only?.replace(/^champ\./, ''))
const match = (k) => !props.only || k === key.value
// au survol de l'en-tête « Classes » : une ligne par classe (le texte complet est sur les boutons de filtre et dans le glossaire)
const compact = computed(() => props.only && key.value === 'classes')
const classKey = computed(() => key.value?.startsWith('class.') ? key.value.slice(6) : null)

const cols = computed(() => Object.entries(champ.value ? CHAMP_COLUMN_HELP : COLUMN_HELP).filter(([k]) => match(k)))
const stats = computed(() => (champ.value ? [] : STATS.filter((s) => match(s.key))))
const cstats = computed(() => (champ.value ? CHAMP_COLS.filter((c) => match(c.key)) : []))
const scaling = computed(() => (champ.value && (!props.only || key.value === 'scales') ? SCALING_HELP : []))
const tags = computed(() => (props.only || champ.value ? [] : TAG_HELP))
// classes : toutes dans le glossaire ou au survol de « Classes », une seule au survol d'un bouton de filtre
const classes = computed(() => !champ.value ? []
  : classKey.value ? [classKey.value]
  : !props.only || key.value === 'classes' ? Object.keys(CLASSES_FR) : [])
</script>

<template>
  <div class="help">
    <h4 v-if="!only">Aide : colonnes {{ champ ? 'des champions' : 'et stats' }} <button class="close" @click="$emit('close')" title="Fermer l'aide">✕</button></h4>
    <dl>
      <template v-for="[k, [label, text]] in cols" :key="k">
        <dt>{{ label }}</dt>
        <dd>{{ text }}</dd>
      </template>
      <template v-for="s in stats" :key="s.key">
        <dt><StatIcon :stat="s.key" :size="16" /> {{ s.fr }} <small class="muted">({{ s.short }})</small></dt>
        <dd>{{ STAT_HELP[s.key] }}</dd>
      </template>
      <template v-for="c in cstats" :key="c.key">
        <dt><StatIcon :stat="c.icon" :size="16" /> {{ c.fr }} <small class="muted">({{ c.label }})</small></dt>
        <dd>{{ c.help }}</dd>
      </template>
      <template v-for="k in classes" :key="'class-' + k">
        <dt>{{ CLASSES_FR[k] }} <small class="muted">({{ k }})<template v-if="!compact"> · {{ CLASS_HELP[k][0] }}</template></small></dt>
        <dd>{{ compact ? CLASS_HELP[k][0] : CLASS_HELP[k][1] }}</dd>
      </template>
      <template v-for="[label, text] in scaling" :key="'sc-' + label">
        <dt>{{ label }}</dt>
        <dd>{{ text }}</dd>
      </template>
      <template v-for="[tag, label, text] in tags" :key="tag">
        <dt><StatIcon :tag="tag" :size="16" /> <span :class="'t t-' + tag">{{ label }}</span></dt>
        <dd>{{ text }}</dd>
      </template>
    </dl>
  </div>
</template>
