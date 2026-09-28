import { loadMovimientos, invalidateCache } from "../data.js";
import { money, fechaDia, escapeHtml } from "../format.js";
import { bannerHtml } from "./inicio.js";

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
          <li>
            <span class="concepto">${escapeHtml(m.concepto)}</span>
            <span class="monto">${money(m.monto)}</span>
          </li>
        `
          )
          .join("")}
      </ul>
    </section>
  `;
}

function setupPullToRefresh(container, onRefresh) {
  let startY = null;
  let pulling = false;
  const indicator = container.querySelector("#pull-indicator");

  container.addEventListener(
    "touchstart",
    (e) => {
      if (container.scrollTop === 0) startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  container.addEventListener(
    "touchmove",
    (e) => {
      if (startY === null) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 60) {
        pulling = true;
        if (indicator) indicator.hidden = false;
      }
    },
    { passive: true }
  );

  container.addEventListener("touchend", () => {
    if (pulling) onRefresh();
    startY = null;
    pulling = false;
  });
}
