import { fetchList } from "./api.js";
import { saveMovimientos, getMovimientos, getMeta } from "./db.js";

let cache = null;

export async function loadMovimientos({ force = false } = {}) {
  if (cache && !force) return cache;

  try {
    const data = await fetchList();
    await saveMovimientos(data);
    cache = { data, lastSync: Date.now(), fromCache: false, error: null };
    return cache;
  } catch (err) {
    const data = await getMovimientos();
    const lastSync = await getMeta("lastSync");
    cache = { data, lastSync, fromCache: true, error: err };
    return cache;
  }
}

export function invalidateCache() {
  cache = null;
}
