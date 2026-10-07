import { crearMovimiento, editarMovimiento, borrarMovimiento, loadMovimientos } from "../data.js";
import { escapeHtml } from "../format.js";
import { CATEGORIAS } from "../categorias.js";
import { getSettings } from "../state.js";
import { usuariosConocidos } from "../persona.js";

export async function abrirFormulario({ movimiento = null, onGuardado } = {}) {
  const esEdicion = !!movimiento;
  const { data } = await loadMovimientos();
  const conceptosPrevios = [...new Set(data.map((m) => m.concepto).filter(Boolean))];
  const usuarioInicial = esEdicion ? movimiento.usuario || "" : getSettings().nombre;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h2>${esEdicion ? "Editar gasto" : "Agregar gasto"}</h2>
      <form id="form-gasto">
        <label for="f-concepto">Concepto</label>
        <input id="f-concepto" name="concepto" list="lista-conceptos" autocomplete="off" required
               value="${escapeHtml(movimiento?.concepto || "")}">
        <datalist id="lista-conceptos">
          ${conceptosPrevios.map((c) => `<option value="${escapeHtml(c)}">`).join("")}
        </datalist>

        <label for="f-monto">Monto</label>
        <input id="f-monto" name="monto" type="number" inputmode="decimal" step="0.01" min="0" required
               value="${movimiento?.monto ?? ""}">

        <label for="f-fecha">Fecha y hora</label>
        <input id="f-fecha" name="fecha" type="datetime-local" required value="${aInputLocal(movimiento?.fecha)}">

        <label for="f-categoria">Categoría</label>
        <select id="f-categoria" name="categoria">
          <option value="">Sin categoría</option>
          ${CATEGORIAS.map(
            (c) => `<option value="${c}" ${movimiento?.categoria === c ? "selected" : ""}>${c}</option>`
          ).join("")}
        </select>

        <label for="f-usuario">Quién</label>
        <input id="f-usuario" name="usuario" list="lista-usuarios" autocomplete="off"
               value="${escapeHtml(usuarioInicial)}" placeholder="Ej. Thiago">
        <datalist id="lista-usuarios">
          ${usuariosConocidos(data).map((u) => `<option value="${escapeHtml(u)}">`).join("")}
        </datalist>

        <p id="form-error" class="mensaje-resultado"></p>
        <div class="acciones-form">
          <button type="button" id="btn-cancelar">Cancelar</button>
          ${esEdicion ? '<button type="button" id="btn-borrar" class="danger">Borrar</button>' : ""}
          <button type="submit" id="btn-guardar">Guardar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const cerrar = () => overlay.remove();

  overlay.querySelector("#btn-cancelar").addEventListener("click", cerrar);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cerrar();
  });

  if (esEdicion) {
    overlay.querySelector("#btn-borrar").addEventListener("click", async () => {
      if (!confirm("¿Borrar este gasto? No se puede deshacer.")) return;
      try {
        await borrarMovimiento(movimiento.id);
        cerrar();
        onGuardado?.();
      } catch (err) {
        mostrarError(overlay, err.message);
      }
    });
  }

  overlay.querySelector("#form-gasto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      concepto: form.concepto.value.trim(),
      monto: Number(form.monto.value),
      fecha: new Date(form.fecha.value).toISOString(),
      categoria: form.categoria.value,
      usuario: form.usuario.value.trim(),
    };
    limpiarError(overlay);

    try {
      if (esEdicion) {
        await editarMovimiento(movimiento.id, payload);
      } else {
        await crearMovimiento(payload);
      }
      cerrar();
      onGuardado?.();
    } catch (err) {
      mostrarError(overlay, err.message);
    }
  });
}

function mostrarError(overlay, mensaje) {
  const el = overlay.querySelector("#form-error");
  el.textContent = "Error: " + mensaje;
  el.className = "mensaje-resultado error";
}

function limpiarError(overlay) {
  const el = overlay.querySelector("#form-error");
  el.textContent = "";
  el.className = "mensaje-resultado";
}

function aInputLocal(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
