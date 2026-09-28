import { registerRoute, startRouter, renderRoute } from "./router.js";
import { invalidateCache } from "./data.js";
import { renderInicio } from "./views/inicio.js";
import { renderMovimientos } from "./views/movimientos.js";
import { renderResumen } from "./views/resumen.js";
import { renderAjustes } from "./views/ajustes.js";
import { renderOtros } from "./views/otros.js";

registerRoute("inicio", renderInicio);
registerRoute("movimientos", renderMovimientos);
registerRoute("otros", renderOtros);
registerRoute("resumen", renderResumen);
registerRoute("ajustes", renderAjustes);

const container = document.getElementById("app");
startRouter(container);

let swRegistration = null;

// iOS no recarga la PWA al volver a abrirla: la "despierta" tal cual quedó. Así que
// al volver a primer plano refrescamos los datos (ej. gastos cargados con el Atajo
// mientras la app estaba en segundo plano) y buscamos si hay una versión nueva.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (document.querySelector(".overlay")) return; // no pisar un formulario abierto
  invalidateCache();
  renderRoute(container);
  swRegistration?.update();
});

if ("serviceWorker" in navigator) {
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando) return;
    recargando = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      swRegistration = reg;
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            nuevo.postMessage("skipWaiting");
          }
        });
      });
    });
  });
}
