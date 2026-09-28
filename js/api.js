import { getSettings } from "./state.js";

// Error "real": el servidor respondió pero dice que algo está mal (token, datos, etc.).
// Se distingue de una falla de red (fetch rechazado) para no reintentar infinitamente
// algo que nunca va a andar. Ver js/data.js.
export class ServerError extends Error {}

export async function fetchList({ from, to } = {}) {
  const { url, token } = getSettings();
  if (!url) throw new Error("Falta configurar la URL en Ajustes");
  return fetchListFrom(url, token, { from, to });
}

export async function testConnection(urlOverride, tokenOverride) {
  const data = await fetchListFrom(urlOverride, tokenOverride, {});
  return data.length;
}

export async function addMovimiento(payload) {
  return postAction({ action: "add", ...payload });
}

export async function updateMovimiento(payload) {
  return postAction({ action: "update", ...payload });
}

export async function deleteMovimiento(payload) {
  return postAction({ action: "delete", ...payload });
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
  if (json.status !== "ok") throw new ServerError(json.message || "Error desconocido del servidor");
  return json.data;
}

async function postAction(body) {
  const { url, token } = getSettings();
  if (!url) throw new Error("Falta configurar la URL en Ajustes");

  const fullBody = token ? { ...body, token } : body;

  // text/plain a propósito: un POST con Content-Type application/json dispara
  // preflight (OPTIONS), que Apps Script no maneja. Ver apps-script/DEPLOY.md.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(fullBody),
  });
  if (!res.ok) throw new Error("Error de red: " + res.status);
  const json = await res.json();
  if (json.status !== "ok") throw new ServerError(json.message || "Error desconocido del servidor");
  return json.data;
}
