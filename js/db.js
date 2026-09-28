const DB_NAME = "pagosmp";
const DB_VERSION = 1;
const STORE_MOVS = "movimientos";
const STORE_META = "meta";

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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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

export async function clearAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MOVS, STORE_META], "readwrite");
    tx.objectStore(STORE_MOVS).clear();
    tx.objectStore(STORE_META).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
