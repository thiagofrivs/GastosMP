import { loadMovimientos } from "../data.js";
import { getSettings } from "../state.js";
import { money, fechaLarga, escapeHtml } from "../format.js";
import { abrirFormulario } from "./form.js";
import { CATEGORIAS } from "../categorias.js";

export async function renderInicio(container) {
  const { data, fromCache, lastSync, error } = await loadMovimientos();
  const { presupuesto, presupuestosCategoria } = getSettings();

  const now = new Date();
  const curKey = monthKeyLocal(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = monthKeyLocal(prevDate);

  const monthData = data.filter((m) => m.fecha && m.fecha.startsWith(curKey));
  const totalMes = monthData.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const totalMesAnterior = sumMonth(data, prevKey);
  const diff = totalMesAnterior === 0 ? null : ((totalMes - totalMesAnterior) / totalMesAnterior) * 100;

  const ultimos = [...data]
    .filter((m) => m.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10);

  container.innerHTML = `
    ${bannerHtml(fromCache, lastSync, error)}
    <section class="card">
      <h2>Este mes</h2>
      <p class="total">${money(totalMes)}</p>
      ${
        diff !== null
          ? `<p class="diff ${diff >= 0 ? "up" : "down"}">${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% vs mes anterior</p>`
          : ""
      }
      ${presupuestoHtml(totalMes, presupuesto)}
    </section>
    ${presupuestoCategoriaHtml(monthData, presupuestosCategoria)}
    <section class="card">
      <h2>Últimos movimientos</h2>
      <ul class="lista-movs">
        ${
          ultimos
            .map(
              (m) => `
          <li class="clickable" data-id="${m.id}">
            <span class="concepto">${escapeHtml(m.categoria || "Sin categoría")}${m._pending ? ' <span class="pendiente-badge">pendiente</span>' : ""}</span>
            <span class="fecha">${fechaLarga(m.fecha)}</span>
            <span class="monto">${money(m.monto)}</span>
          </li>
        `
            )
            .join("") ||
          `<li class="vacio">
            <span class="vacio-titulo">Todavía no hay movimientos.</span>
            <span class="vacio-subtitulo">Se van a mostrar acá los gastos que registres.</span>
          </li>`
        }
      </ul>
    </section>
    <button id="fab-agregar" class="fab" aria-label="Agregar gasto">+</button>
  `;

  container.querySelector("#fab-agregar").addEventListener("click", () => {
    abrirFormulario({ onGuardado: () => renderInicio(container) });
  });

  container.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const mov = data.find((m) => m.id === el.dataset.id);
      if (mov) abrirFormulario({ movimiento: mov, onGuardado: () => renderInicio(container) });
    });
  });

  animarBarrasPresupuesto(container);
}

// Las barras ya se insertan con su ancho final (calculado server-side, por así
// decirlo); para que se vea la animación de "llenado" en vez de aparecer ya
// llenas, las arrancamos en 0 y las llevamos al valor real un frame después.
function animarBarrasPresupuesto(container) {
  const barras = container.querySelectorAll(".presupuesto-fill");
  barras.forEach((barra) => {
    const destino = barra.style.width;
    barra.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        barra.style.width = destino;
      });
    });
  });
}

function monthKeyLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sumMonth(data, key) {
  return data
    .filter((m) => m.fecha && m.fecha.startsWith(key))
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
}

function presupuestoHtml(totalMes, presupuesto) {
  if (!presupuesto || presupuesto <= 0) return "";

  const pct = (totalMes / presupuesto) * 100;
  const pctBarra = Math.min(pct, 100);
  const estado = pct >= 100 ? "danger" : pct >= 80 ? "warn" : "ok";

  const mensaje =
    pct >= 100
      ? `Te pasaste del presupuesto por ${money(totalMes - presupuesto)}.`
      : `Llevás gastado el ${pct.toFixed(0)}% de tu presupuesto de ${money(presupuesto)}.`;

  return `
    <div class="presupuesto presupuesto-${estado}">
      <div class="presupuesto-barra">
        <div class="presupuesto-fill" style="width:${pctBarra}%"></div>
      </div>
      <p class="presupuesto-texto">${mensaje}</p>
    </div>
  `;
}

function presupuestoCategoriaHtml(monthData, presupuestosCategoria) {
  const categoriasConLimite = CATEGORIAS.filter((cat) => presupuestosCategoria[cat] > 0);
  if (!categoriasConLimite.length) return "";

  const filas = categoriasConLimite
    .map((categoria) => {
      const limite = presupuestosCategoria[categoria];
      const gastado = monthData
        .filter((m) => (m.categoria || "") === categoria)
        .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
      const pct = (gastado / limite) * 100;
      const pctBarra = Math.min(pct, 100);
      const estado = pct >= 100 ? "danger" : pct >= 80 ? "warn" : "ok";

      return `
        <div class="presupuesto-cat presupuesto-${estado}">
          <div class="presupuesto-cat-header">
            <span>${escapeHtml(categoria)}</span>
            <span>${money(gastado)} / ${money(limite)}</span>
          </div>
          <div class="presupuesto-barra">
            <div class="presupuesto-fill" style="width:${pctBarra}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="card">
      <h2>Presupuesto por categoría</h2>
      ${filas}
    </section>
  `;
}

export function bannerHtml(fromCache, lastSync, error) {
  if (!fromCache) return "";
  const when = lastSync ? new Date(lastSync).toLocaleString("es-AR") : "nunca";
  return `<div class="banner ${error ? "banner-error" : "banner-warn"}">
    ${error ? "Sin conexión. " : ""}Mostrando datos de la última sincronización: ${when}.
  </div>`;
}
