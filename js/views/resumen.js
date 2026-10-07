import { filtrarPorPersona } from "../persona.js";
import { loadMovimientos } from "../data.js";
import { getSettings } from "../state.js";
import { money, dayKey, mesLabel } from "../format.js";
import { mesContable, mesActualKey, diasDelMesActual } from "../periodo.js";
import { drawBarChart } from "../charts.js";
import { filtrarPorCategoria } from "./movimientos.js";

export async function renderResumen(container) {
  const data = filtrarPorPersona((await loadMovimientos()).data);
  const { presupuesto, presupuestosCategoria } = getSettings();
  const valid = data.filter((m) => m.fecha && m.monto != null);

  const months = lastMonths(12);
  const totalsByMonth = months.map((key) => sumWhere(valid, (m) => mesContable(m.fecha) === key));

  const now = new Date();
  const curMonthKey = mesActualKey();
  const monthData = valid.filter((m) => mesContable(m.fecha) === curMonthKey);

  const byCategory = groupSum(monthData, (m) => m.categoria || "Sin categoría");
  const categoryLabels = Object.keys(byCategory);
  const categoryThresholds = categoryLabels.map((cat) =>
    presupuestosCategoria[cat] > 0 ? presupuestosCategoria[cat] : null
  );
  const hayLimitesCategoria = categoryThresholds.some((t) => t != null);

  const dias = diasDelMesActual();
  const dailyTotals = dias.map((key) => sumWhere(monthData, (m) => dayKey(m.fecha) === key));

  const totalMes = monthData.reduce((acc, m) => acc + Number(m.monto), 0);
  const diasConGasto = dailyTotals.filter((v) => v > 0).length || 1;
  const promedioDiario = totalMes / diasConGasto;
  const mayorGasto = monthData.reduce((max, m) => Math.max(max, Number(m.monto)), 0);

  container.innerHTML = `
    <section class="card">
      <h2>Gastos por mes</h2>
      <canvas id="chart-meses"></canvas>
      ${presupuesto > 0 ? `<p class="pie-grafico">En rojo, los meses por encima de tu presupuesto (${money(presupuesto)}).</p>` : ""}
    </section>
    <section class="card">
      <h2>Por categoría — ${mesLabel(now.toISOString())}</h2>
      <canvas id="chart-categorias"></canvas>
      <p class="pie-grafico">Tocá una barra para ver el detalle en Movimientos.${
        hayLimitesCategoria ? " En rojo, las categorías por encima de su límite configurado en Ajustes." : ""
      }</p>
    </section>
    <section class="card">
      <h2>Por día — ${mesLabel(now.toISOString())}</h2>
      <canvas id="chart-dias"></canvas>
    </section>
    <section class="card stats">
      <div><span>Promedio diario</span><strong>${money(promedioDiario)}</strong></div>
      <div><span>Mayor gasto del mes</span><strong>${money(mayorGasto)}</strong></div>
    </section>
  `;

  drawBarChart(container.querySelector("#chart-meses"), {
    labels: months.map((k) => k.slice(5)),
    values: totalsByMonth,
    threshold: presupuesto > 0 ? presupuesto : null,
  });
  drawBarChart(container.querySelector("#chart-categorias"), {
    labels: categoryLabels,
    values: Object.values(byCategory),
    threshold: categoryThresholds,
    onBarClick: (categoria) => {
      filtrarPorCategoria(categoria);
      window.location.hash = "#/movimientos";
    },
  });
  drawBarChart(container.querySelector("#chart-dias"), {
    labels: dias.map((key) => String(Number(key.slice(8)))),
    values: dailyTotals,
  });
}

function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function sumWhere(list, predicate) {
  return list.filter(predicate).reduce((acc, m) => acc + Number(m.monto), 0);
}

function groupSum(list, keyFn) {
  const map = {};
  list.forEach((m) => {
    const key = keyFn(m);
    map[key] = (map[key] || 0) + Number(m.monto);
  });
  return map;
}
