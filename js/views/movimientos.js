import {
  filtrarPorPersona,
  usuarioBadge,
  getPersona,
  setPersona,
  actualizarSelectorPersona,
} from "../persona.js";
import { loadMovimientos, invalidateCache } from "../data.js";
import { money, fechaDia, escapeHtml } from "../format.js";
import { bannerHtml } from "./inicio.js";
import { abrirFormulario } from "./form.js";
import { CATEGORIAS } from "../categorias.js";

const SIN_CATEGORIA = "__sin__";

const ICONO_FILTRO =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>';

let searchTerm = "";
let fromFilter = "";
let toFilter = "";
let categoryFilter = "";
let filtrosAbiertos = false;

// Para saltar acá desde otra vista (ej. tocar una barra en Resumen) ya filtrado
// por una categoría puntual.
export function filtrarPorCategoria(categoria) {
  categoryFilter = categoria === "Sin categoría" ? SIN_CATEGORIA : categoria;
  searchTerm = "";
  fromFilter = "";
  toFilter = "";
}

export async function renderMovimientos(container) {
  const { data, fromCache, lastSync, error } = await loadMovimientos();
  renderShell(container, data, fromCache, lastSync, error);
}

// El "cascarón" (buscador, botón y panel de filtros) se dibuja una sola vez por
// navegación real a esta pestaña. Solo #lista-dias se vuelve a pintar en cada
// letra tipeada o cambio de filtro (ver actualizarLista) — si reconstruyéramos
// también el input de búsqueda en cada tecla, el navegador le perdería el foco
// y solo se podría escribir un carácter por vez.
function renderShell(container, data, fromCache, lastSync, error) {
  container.innerHTML = `
    ${bannerHtml(fromCache, lastSync, error)}
    <div class="toolbar">
      <div class="toolbar-fila">
        <input type="search" id="buscar" placeholder="Buscar…" value="${escapeHtml(searchTerm)}">
        <button type="button" id="btn-filtros" class="btn-filtros" aria-controls="panel-filtros"
                aria-expanded="${filtrosAbiertos}">
          ${ICONO_FILTRO}<span>Filtros</span><span id="filtros-contador" class="filtros-contador" hidden></span>
        </button>
      </div>
      <div id="panel-filtros" class="panel-filtros" ${filtrosAbiertos ? "" : "hidden"}>
        <div class="filtros">
          <div>
            <label for="desde">Desde</label>
            <input type="date" id="desde" value="${fromFilter}">
          </div>
          <div>
            <label for="hasta">Hasta</label>
            <input type="date" id="hasta" value="${toFilter}">
          </div>
        </div>
        <label for="categoria-filtro">Categoría</label>
        <select id="categoria-filtro">
          <option value="">Todas las categorías</option>
          ${CATEGORIAS.map(
            (c) => `<option value="${c}" ${categoryFilter === c ? "selected" : ""}>${c}</option>`
          ).join("")}
          <option value="${SIN_CATEGORIA}" ${categoryFilter === SIN_CATEGORIA ? "selected" : ""}>Sin categoría</option>
        </select>
        <label for="persona-filtro">Persona</label>
        <select id="persona-filtro"></select>
        <div class="panel-filtros-acciones">
          <button type="button" id="limpiar-filtros">Limpiar filtros</button>
          <button type="button" id="sincronizar">Sincronizar</button>
        </div>
      </div>
    </div>
    <div id="pull-indicator" class="pull-indicator" hidden>Soltá para sincronizar</div>
    <div id="lista-dias"></div>
  `;

  const $ = (sel) => container.querySelector(sel);
  const selectPersona = $("#persona-filtro");
  actualizarSelectorPersona(selectPersona, data);

  const actualizar = () => actualizarLista(container, data);

  $("#buscar").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    actualizar();
  });
  $("#btn-filtros").addEventListener("click", () => {
    filtrosAbiertos = !filtrosAbiertos;
    $("#panel-filtros").hidden = !filtrosAbiertos;
    $("#btn-filtros").setAttribute("aria-expanded", String(filtrosAbiertos));
  });
  $("#desde").addEventListener("change", (e) => {
    fromFilter = e.target.value;
    actualizar();
  });
  $("#hasta").addEventListener("change", (e) => {
    toFilter = e.target.value;
    actualizar();
  });
  $("#categoria-filtro").addEventListener("change", (e) => {
    categoryFilter = e.target.value;
    actualizar();
  });
  selectPersona.addEventListener("change", (e) => {
    setPersona(e.target.value);
    actualizar();
  });
  $("#limpiar-filtros").addEventListener("click", () => {
    fromFilter = toFilter = categoryFilter = "";
    setPersona("");
    $("#desde").value = "";
    $("#hasta").value = "";
    $("#categoria-filtro").value = "";
    selectPersona.value = "";
    actualizar();
  });
  $("#sincronizar").addEventListener("click", () => sincronizar(container));

  setupPullToRefresh(container, () => sincronizar(container));

  actualizar();
}

function actualizarLista(container, data) {
  const filtered = filtrarPorPersona(data)
    .filter((m) => m.fecha)
    .filter((m) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (m.concepto || "").toLowerCase().includes(q) || (m.categoria || "").toLowerCase().includes(q);
    })
    .filter((m) => !fromFilter || m.fecha.slice(0, 10) >= fromFilter)
    .filter((m) => !toFilter || m.fecha.slice(0, 10) <= toFilter)
    .filter((m) => {
      if (!categoryFilter) return true;
      if (categoryFilter === SIN_CATEGORIA) return !m.categoria;
      return m.categoria === categoryFilter;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const activos = [fromFilter, toFilter, categoryFilter, getPersona()].filter(Boolean).length;
  const contador = container.querySelector("#filtros-contador");
  contador.textContent = String(activos);
  contador.hidden = activos === 0;

  const groups = groupByDay(filtered);

  container.querySelector("#lista-dias").innerHTML = groups.length
    ? groups.map(renderDayGroup).join("")
    : vacioHtml(data.length === 0);

  container.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const mov = data.find((m) => m.id === el.dataset.id);
      if (mov) abrirFormulario({ movimiento: mov, onGuardado: () => renderMovimientos(container) });
    });
  });
}

async function sincronizar(container) {
  invalidateCache();
  const fresh = await loadMovimientos({ force: true });
  renderShell(container, fresh.data, fresh.fromCache, fresh.lastSync, fresh.error);
}

function vacioHtml(sinDatos) {
  return `
    <p class="vacio">
      <span class="vacio-titulo">${sinDatos ? "Todavía no hay movimientos." : "No hay movimientos para este filtro."}</span>
      <span class="vacio-subtitulo">${
        sinDatos ? "Se van a mostrar acá los gastos que registres." : "Probá cambiar la búsqueda o los filtros."
      }</span>
    </p>
  `;
}

function groupByDay(list) {
  const map = new Map();
  list.forEach((m) => {
    const key = m.fecha.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  });
  return [...map.entries()].map(([key, items]) => ({ key, items }));
}

function renderDayGroup(group) {
  const total = group.items.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  return `
    <section class="dia">
      <h3>${fechaDia(group.items[0].fecha)} <span class="total-dia">${money(total)}</span></h3>
      <ul class="lista-movs">
        ${group.items
          .map(
            (m) => `
          <li class="clickable" data-id="${m.id}">
            <span class="concepto">${escapeHtml(m.categoria || "Sin categoría")}${usuarioBadge(m)}${m._pending ? ' <span class="pendiente-badge">pendiente</span>' : ""}</span>
            <span class="monto">${money(m.monto)}</span>
          </li>
        `
          )
          .join("")}
      </ul>
    </section>
  `;
}

// El contenedor (#app) lo reutiliza el router para todas las vistas, así que hay que
// sacar los listeners de la vez anterior (si no, se acumulan en cada re-render) y
// chequear que sigamos en Movimientos antes de refrescar (si no, un pull-to-refresh
// hecho en otra pestaña podría disparar una sincronización de esta vista por atrás).
function setupPullToRefresh(container, onRefresh) {
  if (container._pullHandlers) {
    const h = container._pullHandlers;
    container.removeEventListener("touchstart", h.start);
    container.removeEventListener("touchmove", h.move);
    container.removeEventListener("touchend", h.end);
  }

  let startY = null;
  let pulling = false;

  const enMovimientos = () => window.location.hash.replace(/^#\//, "") === "movimientos";

  const start = (e) => {
    if (enMovimientos() && container.scrollTop === 0) startY = e.touches[0].clientY;
  };

  const move = (e) => {
    if (startY === null) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 60) {
      pulling = true;
      const indicator = container.querySelector("#pull-indicator");
      if (indicator) indicator.hidden = false;
    }
  };

  const end = () => {
    if (pulling && enMovimientos()) onRefresh();
    startY = null;
    pulling = false;
  };

  container.addEventListener("touchstart", start, { passive: true });
  container.addEventListener("touchmove", move, { passive: true });
  container.addEventListener("touchend", end);

  container._pullHandlers = { start, move, end };
}
