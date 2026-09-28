import { getSettings } from "./state.js";

export async function fetchList({ from, to } = {}) {
  const { url, token } = getSettings();
  if (!url) throw new Error("Falta configurar la URL en Ajustes");
  return fetchListFrom(url, token, { from, to });
}

export async function testConnection(urlOverride, tokenOverride) {
  const data = await fetchListFrom(urlOverride, tokenOverride, {});
  return data.length;
}

async function fetchListFrom(url, token, { from, to }) {
  const u = new URL(url);
  u.searchParams.set("action", "list");
  if (token) u.searchParams.set("token", token);
  if (from) u.searchParams.set("from", from);
  if (to) u.searchParams.set("to", to);

  const res = await fetch(u.toString(), { method: "GET" });
  if (!res.ok) throw new Error("Error de red: " + res.status);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(json.message || "Error desconocido del servidor");
  return json.data;
}
