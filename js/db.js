const DB_NAME = "pagosmp";
const DB_VERSION = 2;
const STORE_MOVS = "movimientos";
const STORE_META = "meta";
const STORE_PENDIENTES = "pendientes";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MOVS)) {
        db.createObjectStore(STORE_MOVS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_PENDIENTES)) {
        db.createObjectStore(STORE_PENDIENTES, { keyPath: "opId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Reemplazo completo de la lista (viene de una sincronización real con el servidor).
export async function saveMovimientos(list) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOVS, "readwrite");
    tx.objectStore(STORE_MOVS).clear();
    list.forEach((item) => tx.objectStore(STORE_MOVS).put(item));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  await setMeta("lastSync", Date.now());
}

// Escritura incremental (altas/ediciones optimistas locales). No toca "lastSync":
// no es una sincronización real, es solo reflejar en el cache lo que el usuario hizo.
export async function putMovimiento(item) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOVS, "readwrite");
    tx.objectStore(STORE_MOVS).put(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMovimientoLocal(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOVS, "readwrite");
    tx.objectStore(STORE_MOVS).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMovimientos() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MOVS, "readonly");
    const req = tx.objectStore(STORE_MOVS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put({ key, value });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMeta(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// Cola de operaciones que no se pudieron mandar al servidor (sin red). Se reintentan
// la próxima vez que haya una carga de datos exitosa (ver js/data.js: flushPendientes).
export async function addPendiente(op) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDIENTES, "readwrite");
    tx.objectStore(STORE_PENDIENTES).add(op);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendientes() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDIENTES, "readonly");
    const req = tx.objectStore(STORE_PENDIENTES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendiente(opId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDIENTES, "readwrite");
    tx.objectStore(STORE_PENDIENTES).delete(opId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MOVS, STORE_META, STORE_PENDIENTES], "readwrite");
    tx.objectStore(STORE_MOVS).clear();
    tx.objectStore(STORE_META).clear();
    tx.objectStore(STORE_PENDIENTES).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
