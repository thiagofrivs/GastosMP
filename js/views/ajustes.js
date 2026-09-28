import { getSettings, setSettings } from "../state.js";
import { testConnection } from "../api.js";
import { clearAll } from "../db.js";
import { loadMovimientos, invalidateCache } from "../data.js";
import { escapeHtml } from "../format.js";
import { CATEGORIAS } from "../categorias.js";

const APP_VERSION = "0.3.0-fase3";

export async function renderAjustes(container) {
  const { url, token, presupuesto, presupuestosCategoria } = getSettings();
  container.innerHTML = `
    <section class="card">
      <h2>Conexión</h2>
      <label for="url">URL del backend (/exec)</label>
      <input id="url" type="url" value="${escapeHtml(url)}" placeholder="https://script.google.com/macros/s/.../exec">
      <label for="token">Token</label>
      <input id="token" type="text" value="${escapeHtml(token)}" placeholder="(si todavía no es obligatorio, dejalo vacío)">
      <button id="guardar-conexion">Guardar</button>
      <button id="probar">Probar conexión</button>
      <p id="resultado-conexion" class="mensaje-resultado"></p>
    </section>
    <section class="card">
      <h2>Presupuesto</h2>
      <label for="presupuesto">Mensual total (opcional)</label>
      <input id="presupuesto" type="number" inputmode="decimal" step="0.01" min="0"
             value="${presupuesto || ""}" placeholder="0 = sin presupuesto / sin alerta">

      <label>Por categoría (opcional, dejar en blanco = sin límite)</label>
      ${CATEGORIAS.map(
        (cat) => `
        <label for="presupuesto-${cat}" class="presupuesto-cat-label">${cat}</label>
        <input id="presupuesto-${cat}" type="number" inputmode="decimal" step="0.01" min="0"
               data-categoria="${cat}" value="${presupuestosCategoria[cat] || ""}">
      `
      ).join("")}

      <button id="guardar-presupuesto">Guardar presupuesto</button>
      <p id="resultado-presupuesto" class="mensaje-resultado"></p>
    </section>
    <section class="card">
      <h2>Datos</h2>
      <button id="exportar">Exportar CSV</button>
      <button id="borrar" class="danger">Borrar datos locales</button>
    </section>
    <section class="card">
      <h2>Versión</h2>
      <p>${APP_VERSION}</p>
    </section>
  `;

  container.querySelector("#guardar-conexion").addEventListener("click", () => {
    setSettings({
      url: container.querySelector("#url").value.trim(),
      token: container.querySelector("#token").value.trim(),
    });
    invalidateCache();
    mostrarResultado(container, "#resultado-conexion", "Guardado.", false);
  });

  container.querySelector("#probar").addEventListener("click", async () => {
    const url = container.querySelector("#url").value.trim();
    const token = container.querySelector("#token").value.trim();
    mostrarResultado(container, "#resultado-conexion", "Probando…", false);
    try {
      const cantidad = await testConnection(url, token);
      mostrarResultado(container, "#resultado-conexion", `OK — se leyeron ${cantidad} movimientos.`, false);
    } catch (err) {
      mostrarResultado(container, "#resultado-conexion", `Error: ${err.message}`, true);
    }
  });

  container.querySelector("#guardar-presupuesto").addEventListener("click", () => {
    const nuevosLimites = {};
    container.querySelectorAll("[data-categoria]").forEach((input) => {
      const valor = Number(input.value) || 0;
      if (valor > 0) nuevosLimites[input.dataset.categoria] = valor;
    });

    setSettings({
      presupuesto: Number(container.querySelector("#presupuesto").value) || 0,
      presupuestosCategoria: nuevosLimites,
    });
    mostrarResultado(container, "#resultado-presupuesto", "Guardado.", false);
  });

  container.querySelector("#exportar").addEventListener("click", async () => {
    const { data } = await loadMovimientos();
    exportarCsv(data);
  });

  container.querySelector("#borrar").addEventListener("click", async () => {
    if (!confirm("¿Borrar todos los datos guardados en este dispositivo? Esto no borra nada del Google Sheet.")) return;
    await clearAll();
    localStorage.clear();
    invalidateCache();
    mostrarResultado(container, "#resultado-conexion", "Datos locales borrados. Recargá la app.", false);
  });
}

function mostrarResultado(container, selector, msg, isError) {
  const el = container.querySelector(selector);
  el.textContent = msg;
  el.className = "mensaje-resultado " + (isError ? "error" : "ok");
}

function exportarCsv(data) {
  const header = "fecha,concepto,monto,categoria\n";
  const rows = data.map((m) => [m.fecha, csvEscape(m.concepto), m.monto, csvEscape(m.categoria)].join(",")).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pagos-mp-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function csvEscape(str) {
  const s = String(str ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
