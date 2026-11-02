<script setup>
import { computed, ref } from 'vue'
import { STATS } from '../../shared/stats.js'
import { formatStat, gold } from '../lib/format.js'
import { iconSrc } from '../lib/data.js'
import { MAPS, MODES, newBlock, newSet, toLolSet, fromLolSet } from '../lib/sets.js'

const props = defineProps({
  sets: { type: Array, required: true },
  currentUid: { type: String, required: true },
  activeBlock: { type: String, default: null },
  byId: { type: Map, required: true },
  champions: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:currentUid', 'update:activeBlock'])

const set = computed(() => props.sets.find((s) => s.uid === props.currentUid))
const json = computed(() => JSON.stringify(toLolSet(set.value, props.champions), null, 2))
const status = ref('')
const importText = ref('')
const showImport = ref(false)

const flash = (m) => { status.value = m; setTimeout(() => (status.value = ''), 2500) }

function create() {
  const s = newSet()
  props.sets.push(s)
  emit('update:currentUid', s.uid)
}
function remove() {
  if (!confirm(`Supprimer « ${set.value.title} » ?`)) return
  const i = props.sets.findIndex((s) => s.uid === props.currentUid)
  props.sets.splice(i, 1)
  if (!props.sets.length) props.sets.push(newSet())
  emit('update:currentUid', props.sets[Math.min(i, props.sets.length - 1)].uid)
}
function duplicate() {
  const copy = JSON.parse(JSON.stringify(set.value))
  const fresh = newSet()
  copy.uid = fresh.uid
  copy.title += ' (copie)'
  copy.blocks.forEach((b) => (b.uid = newBlock().uid))
  props.sets.push(copy)
  emit('update:currentUid', copy.uid)
}
function doImport() {
  try {
    const s = fromLolSet(importText.value, props.champions)
    props.sets.push(s)
    emit('update:currentUid', s.uid)
    importText.value = ''
    showImport.value = false
    flash('Set importé')
  } catch (e) {
    flash('Import impossible : ' + e.message)
  }
}

const addBlock = () => {
  const b = newBlock('Nouveau bloc')
  set.value.blocks.push(b)
  emit('update:activeBlock', b.uid)
}
const removeBlock = (i) => set.value.blocks.splice(i, 1)
const move = (arr, i, d) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
const item = (id) => props.byId.get(id)

function blockSummary(b) {
  let total = 0
  const stats = {}
  for (const it of b.items) {
    const d = item(it.id)
    if (!d) continue
    total += d.total * it.count
    for (const [k, v] of Object.entries(d.stats)) stats[k] = (stats[k] ?? 0) + v * it.count
  }
  return { total, stats: STATS.filter((s) => stats[s.key]).map((s) => ({ ...s, v: stats[s.key] })) }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(json.value)
    flash('JSON copié dans le presse-papiers')
  } catch {
    flash('Copie refusée par le navigateur : sélectionne le texte ci-dessous')
  }
}
function download() {
  const blob = new Blob([json.value], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${set.value.title.replace(/[^\w.-]+/g, '_') || 'set'}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
const path = computed(() => {
  const c = set.value.champion.trim()
  return c ? `Config/Champions/${c}/Recommended/` : 'Config/Global/Recommended/'
})
</script>

<template>
  <aside class="builder" v-if="set">
    <div class="row">
      <select :value="currentUid" @change="emit('update:currentUid', $event.target.value)">
        <option v-for="s in sets" :key="s.uid" :value="s.uid">{{ s.title }}</option>
      </select>
      <button @click="create" title="Nouveau set">＋</button>
      <button @click="duplicate" title="Dupliquer">⧉</button>
      <button @click="remove" title="Supprimer">🗑</button>
    </div>

    <label>Titre <input v-model="set.title" /></label>
    <div class="row">
      <label>Carte
        <select v-model="set.map"><option v-for="m in MAPS" :key="m.value" :value="m.value">{{ m.label }}</option></select>
      </label>
      <label>Mode
        <select v-model="set.mode"><option v-for="m in MODES" :key="m.value" :value="m.value">{{ m.label }}</option></select>
      </label>
    </div>

    <div v-for="(b, bi) in set.blocks" :key="b.uid" class="block" :class="{ active: b.uid === activeBlock }" @click="emit('update:activeBlock', b.uid)">
      <div class="block-head">
        <input v-model="b.type" class="block-title" />
        <button @click.stop="move(set.blocks, bi, -1)" title="Monter">↑</button>
        <button @click.stop="move(set.blocks, bi, 1)" title="Descendre">↓</button>
        <button @click.stop="removeBlock(bi)" title="Supprimer le bloc">✕</button>
      </div>
      <div class="block-items">
        <div v-for="(it, ii) in b.items" :key="ii" class="set-item">
          <img v-if="item(it.id)" :src="iconSrc(item(it.id))" :title="`${item(it.id).name.fr} — ${gold(item(it.id).total)} or`" width="40" height="40" />
          <span v-else class="missing" :title="`Item ${it.id} inconnu`">?</span>
          <input v-if="item(it.id)?.tier === 'consumable' || it.count > 1" v-model.number="it.count" type="number" min="1" max="9" class="count-in" />
          <div class="item-ctl">
            <button @click.stop="move(b.items, ii, -1)">←</button>
            <button @click.stop="move(b.items, ii, 1)">→</button>
            <button @click.stop="b.items.splice(ii, 1)">✕</button>
          </div>
        </div>
        <span v-if="!b.items.length" class="muted">Clique sur « + » dans le tableau pour ajouter ici.</span>
      </div>
      <div class="block-sum muted" v-if="b.items.length">
        {{ gold(blockSummary(b).total) }} or ·
        <span v-for="s in blockSummary(b).stats" :key="s.key" class="tag">{{ formatStat(s.key, s.v) }} {{ s.short }}</span>
      </div>
    </div>
    <button @click="addBlock">＋ Ajouter un bloc</button>

    <h3>Export</h3>
    <div class="row">
      <button class="primary" @click="copy">Copier le JSON</button>
      <button @click="download">Télécharger .json</button>
      <button @click="showImport = !showImport">Importer…</button>
    </div>
    <p v-if="status" class="status">{{ status }}</p>
    <div v-if="showImport">
      <textarea v-model="importText" rows="5" placeholder="Colle ici le JSON d'un set LoL"></textarea>
      <button @click="doImport">Importer</button>
    </div>
    <label>Champion associé
      <select v-model="set.champion">
        <option value="">Aucun (global)</option>
        <option v-for="c in champions" :key="c.id" :value="c.id">{{ c.name.fr }}</option>
      </select>
    </label>
    <p class="muted small">
      À enregistrer dans <code>&lt;dossier LoL&gt;/{{ path }}</code>, puis redémarrer le client.
    </p>
    <textarea readonly :value="json" rows="10" class="json" @focus="$event.target.select()"></textarea>
  </aside>
</template>
