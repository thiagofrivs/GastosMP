import { escapeHtml } from "./format.js";

const KEY_PERSONA = "pagosmp.persona";
const SIN_ASIGNAR = "__sin__";

// "" = Todos.
export function getPersona() {
  return localStorage.getItem(KEY_PERSONA) || "";
}

export function setPersona(valor) {
  localStorage.setItem(KEY_PERSONA, valor);
}

export function filtrarPorPersona(list) {
  const persona = getPersona();
  if (!persona) return list;
  if (persona === SIN_ASIGNAR) return list.filter((m) => !m.usuario);
  return list.filter((m) => m.usuario === persona);
}

export function usuariosConocidos(list) {
  return [...new Set(list.map((m) => m.usuario).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

export function usuarioBadge(m) {
  return m.usuario ? ` <span class="usuario-badge">${escapeHtml(m.usuario)}</span>` : "";
}

export function actualizarSelectorPersona(select, data) {
  const persona = getPersona();
  const usuarios = usuariosConocidos(data);
  const haySinAsignar = data.some((m) => !m.usuario);

  select.innerHTML = `
    <option value="">Todos</option>
    ${usuarios.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("")}
    ${haySinAsignar ? `<option value="${SIN_ASIGNAR}">Sin asignar</option>` : ""}
  `;

  // Si la persona guardada ya no existe en los datos, volvemos a "Todos".
  const existe = [...select.options].some((o) => o.value === persona);
  select.value = existe ? persona : "";
  if (!existe) setPersona("");
}
