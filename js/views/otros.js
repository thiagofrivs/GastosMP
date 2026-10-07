import { filtrarPorPersona, usuarioBadge } from "../persona.js";
import { loadMovimientos } from "../data.js";
import { money, fechaLarga, mesLabel, monthKey, escapeHtml } from "../format.js";
import { bannerHtml } from "./inicio.js";
import { abrirFormulario } from "./form.js";

export async function renderOtros(container) {
  const { data: todos, fromCache, lastSync, error } = await loadMovimientos();
  const data = filtrarPorPersona(todos);

  const otros = data
    .filter((m) => m.fecha && m.categoria === "Otros")
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const total = otros.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

  container.innerHTML = `
    ${bannerHtml(fromCache, lastSync, error)}
    <section class="card">
      <h2>Gastos en "Otros"</h2>
      <p class="total">${money(total)}</p>
      <p class="pie-grafico">${otros.length} ${otros.length === 1 ? "gasto" : "gastos"} en total</p>
    </section>
    ${otros.length ? agruparPorMes(otros).map(renderMes).join("") : vacioHtml()}
  `;

  container.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const mov = data.find((m) => m.id === el.dataset.id);
      if (mov) abrirFormulario({ movimiento: mov, onGuardado: () => renderOtros(container) });
    });
  });
}

function agruparPorMes(list) {
  const map = new Map();
  list.forEach((m) => {
    const key = monthKey(m.fecha);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  });
  return [...map.values()];
}

function renderMes(items) {
  const totalMes = items.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  return `
    <section class="card">
      <h2 class="mes-header">
        <span>${mesLabel(items[0].fecha)}</span>
        <span>${money(totalMes)}</span>
      </h2>
      <ul class="lista-movs">
        ${items
          .map(
            (m) => `
          <li class="clickable" data-id="${m.id}">
            <span class="concepto">${escapeHtml(m.concepto || "(sin descripción)")}${usuarioBadge(m)}${m._pending ? ' <span class="pendiente-badge">pendiente</span>' : ""}</span>
            <span class="fecha">${fechaLarga(m.fecha)}</span>
            <span class="monto">${money(m.monto)}</span>
          </li>
        `
          )
          .join("")}
      </ul>
    </section>
  `;
}

function vacioHtml() {
  return `
    <p class="vacio">
      <span class="vacio-titulo">Todavía no hay gastos en "Otros".</span>
      <span class="vacio-subtitulo">Cuando elijas "Otros" en el Atajo, acá vas a ver el detalle de cada uno.</span>
    </p>
  `;
}
