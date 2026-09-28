import { loadMovimientos } from "../data.js";
import { money, fechaLarga, escapeHtml } from "../format.js";
import { abrirFormulario } from "./form.js";

export async function renderInicio(container) {
  const { data, fromCache, lastSync, error } = await loadMovimientos();

  const now = new Date();
  const curKey = monthKeyLocal(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = monthKeyLocal(prevDate);

  const totalMes = sumMonth(data, curKey);
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
    </section>
    <section class="card">
      <h2>Últimos movimientos</h2>
      <ul class="lista-movs">
        ${
          ultimos
            .map(
              (m) => `
          <li>
            <span class="concepto">${escapeHtml(m.concepto)}${m._pending ? ' <span class="pendiente-badge">pendiente</span>' : ""}</span>
            <span class="fecha">${fechaLarga(m.fecha)}</span>
            <span class="monto">${money(m.monto)}</span>
          </li>
        `
            )
            .join("") || '<li class="vacio">Todavía no hay movimientos.</li>'
        }
      </ul>
    </section>
    <button id="fab-agregar" class="fab" aria-label="Agregar gasto">+</button>
  `;

  container.querySelector("#fab-agregar").addEventListener("click", () => {
    abrirFormulario({ onGuardado: () => renderInicio(container) });
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

export function bannerHtml(fromCache, lastSync, error) {
  if (!fromCache) return "";
  const when = lastSync ? new Date(lastSync).toLocaleString("es-AR") : "nunca";
  return `<div class="banner ${error ? "banner-error" : "banner-warn"}">
    ${error ? "Sin conexión. " : ""}Mostrando datos de la última sincronización: ${when}.
  </div>`;
}
