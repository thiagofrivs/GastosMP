import { fetchList, addMovimiento, updateMovimiento, deleteMovimiento, ServerError } from "./api.js";
import {
  saveMovimientos,
  getMovimientos,
  getMeta,
  putMovimiento,
  deleteMovimientoLocal,
  addPendiente,
  getPendientes,
  removePendiente,
} from "./db.js";

let cache = null;

export async function loadMovimientos({ force = false } = {}) {
  if (cache && !force) return cache;

  await flushPendientes();

  try {
    const data = await fetchList();
    await saveMovimientos(data);
    cache = { data, lastSync: Date.now(), fromCache: false, error: null };
  } catch (err) {
    const data = await getMovimientos();
    const lastSync = await getMeta("lastSync");
    cache = { data, lastSync, fromCache: true, error: err };
  }
  return cache;
}

export function invalidateCache() {
  cache = null;
}

// Alta con actualización optimista: el ítem aparece en la UI al toque, con un id
// temporal. Si el POST falla por red, queda en la cola de "pendientes" para
// reintentar más tarde. Si el servidor responde con un error real (no de red), se
// deshace el optimismo y se le avisa al usuario.
export async function crearMovimiento(payload) {
  const tempId = "tmp-" + crypto.randomUUID();
  await aplicarLocal({ ...payload, id: tempId, _pending: true });

  try {
    const creado = await addMovimiento(payload);
    await quitarLocal(tempId);
    await aplicarLocal(creado);
  } catch (err) {
    if (err instanceof ServerError) {
      await quitarLocal(tempId);
      throw err;
    }
    await addPendiente({ type: "add", payload, tempId });
  }
}

export async function editarMovimiento(id, payload) {
  const anterior = cache?.data.find((m) => m.id === id);
  await aplicarLocal({ ...anterior, ...payload, id, _pending: true });

  try {
    const actualizado = await updateMovimiento({ id, ...payload });
    await aplicarLocal({ ...actualizado, id });
  } catch (err) {
    if (err instanceof ServerError) {
      if (anterior) await aplicarLocal(anterior);
      throw err;
    }
    await addPendiente({ type: "update", payload: { id, ...payload } });
  }
}

export async function borrarMovimiento(id) {
  const anterior = cache?.data.find((m) => m.id === id);
  await quitarLocal(id);

  try {
    await deleteMovimiento({ id });
  } catch (err) {
    if (err instanceof ServerError) {
      if (anterior) await aplicarLocal(anterior);
      throw err;
    }
    await addPendiente({ type: "delete", payload: { id } });
  }
}

async function flushPendientes() {
  const pendientes = await getPendientes();
  for (const p of pendientes) {
    try {
      if (p.type === "add") {
        const creado = await addMovimiento(p.payload);
        await quitarLocal(p.tempId);
        await aplicarLocal(creado);
      } else if (p.type === "update") {
        const actualizado = await updateMovimiento(p.payload);
        await aplicarLocal({ ...actualizado, id: p.payload.id });
      } else if (p.type === "delete") {
        await deleteMovimiento(p.payload);
      }
      await removePendiente(p.opId);
    } catch (err) {
      if (err instanceof ServerError) {
        // No tiene sentido seguir reintentando algo que el servidor rechaza siempre.
        await removePendiente(p.opId);
        continue;
      }
      break; // Seguimos sin red: cortamos acá, se reintenta la próxima carga.
    }
  }
}

async function aplicarLocal(item) {
  await putMovimiento(item);
  if (cache) {
    const idx = cache.data.findIndex((m) => m.id === item.id);
    if (idx >= 0) cache.data[idx] = item;
    else cache.data.push(item);
  }
}

async function quitarLocal(id) {
  await deleteMovimientoLocal(id);
  if (cache) cache.data = cache.data.filter((m) => m.id !== id);
}
