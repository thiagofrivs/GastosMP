import { loadMovimientos, invalidateCache } from "../data.js";
import { money, fechaDia, escapeHtml } from "../format.js";
import { bannerHtml } from "./inicio.js";
import { abrirFormulario } from "./form.js";

let searchTerm = "";
let fromFilter = "";
let toFilter = "";

export async function renderMovimientos(container) {
  const { data, fromCache, lastSync, error } = await loadMovimientos();
  renderList(container, data, fromCache, lastSync, error);
}

function renderList(container, data, fromCache, lastSync, error) {
  const filtered = data
    .filter((m) => m.fecha)
    .filter((m) => !searchTerm || (m.concepto || "").toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((m) => !fromFilter || m.fecha.slice(0, 10) >= fromFilter)
    .filter((m) => !toFilter || m.fecha.slice(0, 10) <= toFilter)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const groups = groupByDay(filtered);

  container.innerHTML = `
    ${bannerHtml(fromCache, lastSync, error)}
    <div class="toolbar">
      <input type="search" id="buscar" placeholder="Buscar por concepto…" value="${escapeHtml(searchTerm)}">
      <div class="filtros">
        <input type="date" id="desde" value="${fromFilter}">
        <input type="date" id="hasta" value="${toFilter}">
      </div>
      <button id="sincronizar">Sincronizar</button>
    </div>
    <div id="pull-indicator" class="pull-indicator" hidden>Soltá para sincronizar</div>
    <div id="lista-dias">
      ${groups.length ? groups.map(renderDayGroup).join("") : '<p class="vacio">No hay movimientos para este filtro.</p>'}
    </div>
  `;

  container.querySelector("#buscar").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderList(container, data, fromCache, lastSync, error);
  });
  container.querySelector("#desde").addEventListener("change", (e) => {
    fromFilter = e.target.value;
    renderList(container, data, fromCache, lastSync, error);
  });
  container.querySelector("#hasta").addEventListener("change", (e) => {
    toFilter = e.target.value;
    renderList(container, data, fromCache, lastSync, error);
  });
  container.querySelector("#sincronizar").addEventListener("click", () => sincronizar(container));

  container.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const mov = data.find((m) => m.id === el.dataset.id);
      if (mov) abrirFormulario({ movimiento: mov, onGuardado: () => renderMovimientos(container) });
    });
  });

  setupPullToRefresh(container, () => sincronizar(container));
}

async function sincronizar(container) {
  invalidateCache();
  const fresh = await loadMovimientos({ force: true });
  renderList(container, fresh.data, fresh.fromCache, fresh.lastSync, fresh.error);
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
            <span class="concepto">${escapeHtml(m.concepto)}${m._pending ? ' <span class="pendiente-badge">pendiente</span>' : ""}</span>
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
