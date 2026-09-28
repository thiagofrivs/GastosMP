import { getSettings, setSettings } from "../state.js";
import { testConnection } from "../api.js";
import { clearAll } from "../db.js";
import { loadMovimientos, invalidateCache } from "../data.js";
import { escapeHtml } from "../format.js";

const APP_VERSION = "0.1.0-fase1";

export async function renderAjustes(container) {
  const { url, token } = getSettings();
  container.innerHTML = `
    <section class="card">
      <h2>Conexión</h2>
      <label for="url">URL del backend (/exec)</label>
      <input id="url" type="url" value="${escapeHtml(url)}" placeholder="https://script.google.com/macros/s/.../exec">
      <label for="token">Token</label>
      <input id="token" type="text" value="${escapeHtml(token)}" placeholder="(si todavía no es obligatorio, dejalo vacío)">
      <button id="guardar">Guardar</button>
      <button id="probar">Probar conexión</button>
      <p id="resultado-conexion"></p>
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

  container.querySelector("#guardar").addEventListener("click", () => {
    setSettings({
      url: container.querySelector("#url").value.trim(),
      token: container.querySelector("#token").value.trim(),
    });
    invalidateCache();
    mostrarResultado(container, "Guardado.", false);
  });

  container.querySelector("#probar").addEventListener("click", async () => {
    const url = container.querySelector("#url").value.trim();
    const token = container.querySelector("#token").value.trim();
    mostrarResultado(container, "Probando…", false);
    try {
      const cantidad = await testConnection(url, token);
      mostrarResultado(container, `OK — se leyeron ${cantidad} movimientos.`, false);
    } catch (err) {
      mostrarResultado(container, `Error: ${err.message}`, true);
    }
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
    mostrarResultado(container, "Datos locales borrados. Recargá la app.", false);
  });
}

function mostrarResultado(container, msg, isError) {
  const el = container.querySelector("#resultado-conexion");
  el.textContent = msg;
  el.className = isError ? "error" : "ok";
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
