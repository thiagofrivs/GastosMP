import { registerRoute, startRouter } from "./router.js";
import { renderInicio } from "./views/inicio.js";
import { renderMovimientos } from "./views/movimientos.js";
import { renderResumen } from "./views/resumen.js";
import { renderAjustes } from "./views/ajustes.js";

registerRoute("inicio", renderInicio);
registerRoute("movimientos", renderMovimientos);
registerRoute("resumen", renderResumen);
registerRoute("ajustes", renderAjustes);

startRouter(document.getElementById("app"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            mostrarAvisoActualizacion(reg);
          }
        });
      });
    });
  });
}

function mostrarAvisoActualizacion(reg) {
  const banner = document.createElement("div");
  banner.className = "update-banner";
  banner.innerHTML = 'Hay una versión nueva. <button id="btn-actualizar">Actualizar</button>';
  document.body.appendChild(banner);
  banner.querySelector("#btn-actualizar").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage("skipWaiting");
    window.location.reload();
  });
}
