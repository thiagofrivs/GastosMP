const KEY_URL = "pagosmp.url";
const KEY_TOKEN = "pagosmp.token";
const KEY_PRESUPUESTO = "pagosmp.presupuesto";
const KEY_PRESUPUESTOS_CATEGORIA = "pagosmp.presupuestos_categoria";

export function getSettings() {
  return {
    url: localStorage.getItem(KEY_URL) || "",
    token: localStorage.getItem(KEY_TOKEN) || "",
    presupuesto: Number(localStorage.getItem(KEY_PRESUPUESTO)) || 0,
    presupuestosCategoria: leerPresupuestosCategoria(),
  };
}

export function setSettings({ url, token, presupuesto, presupuestosCategoria }) {
  if (url !== undefined) localStorage.setItem(KEY_URL, url);
  if (token !== undefined) localStorage.setItem(KEY_TOKEN, token);
  if (presupuesto !== undefined) localStorage.setItem(KEY_PRESUPUESTO, String(presupuesto));
  if (presupuestosCategoria !== undefined) {
    localStorage.setItem(KEY_PRESUPUESTOS_CATEGORIA, JSON.stringify(presupuestosCategoria));
  }
}

function leerPresupuestosCategoria() {
  try {
    return JSON.parse(localStorage.getItem(KEY_PRESUPUESTOS_CATEGORIA) || "{}");
  } catch {
    return {};
  }
}
