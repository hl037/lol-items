import { ref, computed } from 'vue'

const data = ref(null)
const error = ref(null)

export async function loadItems() {
  if (data.value) return
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/items.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status} — lance « pnpm fetch-items » pour générer les données`)
    data.value = await r.json()
  } catch (e) {
    error.value = e.message
  }
}

export function useItems() {
  const items = computed(() => data.value?.items ?? [])
  const byId = computed(() => new Map(items.value.map((i) => [i.id, i])))
  return { data, items, byId, error, loadItems }
}

const champs = ref(null)
const champError = ref(null)

export async function loadChampions() {
  if (champs.value) return
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}data/champions.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status} — lance « pnpm fetch-data » pour générer les données`)
    champs.value = await r.json()
  } catch (e) {
    champError.value = e.message
  }
}

export function useChampions() {
  const champions = computed(() => champs.value?.champions ?? [])
  return { champData: champs, champions, champError, loadChampions }
}

/** Chemin local (relatif à la base de l'app) ou URL distante de repli. */
export const localSrc = (p) => (!p || /^https?:/.test(p) ? p : import.meta.env.BASE_URL + p)

/** Les icônes locales (data/icons/…) sont relatives à la base de l'app ; sinon URL distante de repli. */
export const iconSrc = (item) => (!item.icon || /^https?:/.test(item.icon) ? item.icon : import.meta.env.BASE_URL + item.icon)
