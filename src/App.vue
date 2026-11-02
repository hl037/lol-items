<script setup>
import { computed, onMounted, onUnmounted, ref, toRef, watch, watchEffect } from 'vue'
import ItemTable from './components/ItemTable.vue'
import ItemDetail from './components/ItemDetail.vue'
import ChampionTable from './components/ChampionTable.vue'
import ChampionDetail from './components/ChampionDetail.vue'
import HelpContent from './components/HelpContent.vue'
import SetBuilder from './components/SetBuilder.vue'
import { useItems, useChampions } from './lib/data.js'
import { useSets } from './lib/sets.js'
import { ui } from './lib/state.js'

const { data, items, byId, error, loadItems } = useItems()
const { champData, champions, champError, loadChampions } = useChampions()
const { sets } = useSets()

const TABS = [['items', 'Items'], ['champions', 'Champions']]
// état persistant (src/lib/state.js)
const tab = toRef(ui, 'tab')
const currentUid = toRef(ui, 'currentUid')
const activeBlock = toRef(ui, 'activeBlock')
const helpOpen = toRef(ui, 'helpOpen')

const hovered = ref(null)
const hoveredChamp = ref(null)
const champLevel = ref(1)
// aide : survol d'un en-tête de colonne = son entrée ; bouton « ? » de la barre d'outils = glossaire complet de l'onglet
const helpHover = ref(null)
const toggleHelp = () => { helpOpen.value = !helpOpen.value }

// L'aperçu reste affiché quand la souris passe de la ligne (ou de l'en-tête) à l'aperçu, pour pouvoir le faire défiler :
// la fermeture est retardée et annulée si la souris entre dans l'aperçu ou sur un autre élément.
let clearTimer
const clearAll = () => { hovered.value = hoveredChamp.value = helpHover.value = null }
function onHover(kind, v) {
  clearTimeout(clearTimer)
  const target = kind === 'item' ? hovered : kind === 'champ' ? hoveredChamp : helpHover
  if (v) target.value = v
  else clearTimer = setTimeout(clearAll, 250)
}
const keepPreview = () => clearTimeout(clearTimer)
const leavePreview = () => { clearTimeout(clearTimer); clearTimer = setTimeout(clearAll, 150) }

watch(tab, () => { hovered.value = hoveredChamp.value = helpHover.value = null })

// survol d'une icône : toutes les icônes identiques (et la colonne de la stat) sont mises en évidence
const hl = ref(null)
let styleEl
const onOver = (e) => {
  const el = e.target instanceof Element ? e.target.closest('.ico[data-hl]') : null
  hl.value = el?.dataset.hl || null
}
onMounted(() => {
  styleEl = document.head.appendChild(document.createElement('style'))
  document.addEventListener('mouseover', onOver)
})
onUnmounted(() => { document.removeEventListener('mouseover', onOver); styleEl?.remove() })
watch(hl, (k) => {
  // k ne contient que [a-zA-Z0-9] (forme + couleur) : pas d'injection possible
  styleEl.textContent = k && /^\w+$/.test(k)
    ? `.ico[data-hl="${k}"]{scale:1.45;filter:drop-shadow(0 0 3px currentColor);background:#ffffff26;border-radius:3px}
       th[data-hl="${k}"],td[data-hl="${k}"]{background:#c8aa6e1f}`
    : ''
})

onMounted(() => { loadItems(); loadChampions() })

const currentSet = computed(() => sets.value.find((x) => x.uid === currentUid.value))

// le set sélectionné doit exister (il a pu être supprimé) et le bloc actif appartenir au set courant
watchEffect(() => {
  if (!sets.value.some((x) => x.uid === currentUid.value)) currentUid.value = sets.value[0]?.uid ?? null
  const s = currentSet.value
  if (s && !s.blocks.some((b) => b.uid === activeBlock.value)) activeBlock.value = s.blocks[0]?.uid ?? null
})

function add(item) {
  const b = currentSet.value?.blocks.find((x) => x.uid === activeBlock.value)
  if (!b) return
  const existing = b.items.find((i) => i.id === item.id)
  if (existing && item.tier === 'consumable') existing.count++
  else b.items.push({ id: item.id, count: 1 })
}

// associe (ou dissocie) un champion au set en cours
function pick(champ) {
  const s = currentSet.value
  if (s) s.champion = s.champion === champ.id ? '' : champ.id
}

const meta = computed(() => {
  const d = tab.value === 'items' ? data.value : champData.value
  if (!d) return ''
  const n = tab.value === 'items' ? `${items.value.length} items · données CommunityDragon` : `${champions.value.length} champions · données Data Dragon`
  return `patch ${d.version} · ${n} (${new Date(d.generatedAt).toLocaleDateString('fr-FR')})`
})
</script>

<template>
  <header>
    <h1>LoL Items</h1>
    <nav class="tabs" role="tablist">
      <button v-for="[k, label] in TABS" :key="k" role="tab" :aria-selected="tab === k" :class="{ on: tab === k }" @click="tab = k">{{ label }}</button>
    </nav>
    <span class="muted">{{ meta }}</span>
  </header>
  <main>
    <div class="left">
      <template v-if="tab === 'items'">
        <p v-if="error" class="error">{{ error }}</p>
        <p v-else-if="!data" class="muted pad">Chargement…</p>
      </template>
      <template v-else>
        <p v-if="champError" class="error">{{ champError }}</p>
        <p v-else-if="!champData" class="muted pad">Chargement…</p>
      </template>
      <ItemTable v-if="data" v-show="tab === 'items'" :items="items" @add="add" @help="toggleHelp" @helphover="(k) => onHover('help', k)" @hover="(i) => onHover('item', i)" />
      <ChampionTable v-if="champData" v-show="tab === 'champions'" :champions="champions" :current-champion="currentSet?.champion"
        @pick="pick" @help="toggleHelp" @helphover="(k) => onHover('help', k)" @hover="(c) => onHover('champ', c)" @level="(l) => (champLevel = l)" />
    </div>
    <div class="side">
      <!-- aperçu au survol d'une ligne du tableau (défilable) ; la place est toujours réservée pour ne rien décaler -->
      <div class="preview" :class="{ tall: tab === 'champions' }" @mouseenter="keepPreview" @mouseleave="leavePreview">
        <HelpContent v-if="helpHover" :only="helpHover" />
        <template v-else-if="tab === 'items'">
          <ItemDetail v-if="hovered" :item="hovered" preview />
          <HelpContent v-else-if="helpOpen" scope="items" @close="helpOpen = false" />
          <p v-else class="muted">Survole un item du tableau pour voir son détail ici, ou clique sur « ? » pour l'aide sur les colonnes (ou survole un en-tête).</p>
        </template>
        <template v-else>
          <ChampionDetail v-if="hoveredChamp" :champion="hoveredChamp" :level="champLevel" preview />
          <HelpContent v-else-if="helpOpen" scope="champions" @close="helpOpen = false" />
          <p v-else class="muted">Survole un champion du tableau pour voir son détail ici, ou clique sur « ? » pour l'aide sur les colonnes (ou survole un en-tête).</p>
        </template>
      </div>
      <SetBuilder :sets="sets" v-model:currentUid="currentUid" v-model:activeBlock="activeBlock" :by-id="byId" :champions="champions" />
    </div>
  </main>
</template>
