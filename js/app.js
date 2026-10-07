import { registerRoute, startRouter, renderRoute } from "./router.js";
import { invalidateCache, loadMovimientos } from "./data.js";
import { setPersona, actualizarSelectorPersona } from "./persona.js";
import { renderInicio } from "./views/inicio.js";
import { renderMovimientos } from "./views/movimientos.js";
import { renderResumen } from "./views/resumen.js";
import { renderAjustes } from "./views/ajustes.js";
import { renderOtros } from "./views/otros.js";

const container = document.getElementById("app");
const barraPersona = document.getElementById("barra-persona");
const selectPersona = document.getElementById("filtro-persona");

// Las vistas con datos muestran arriba el filtro "Ver gastos de" (Ajustes no).
function conFiltroPersona(render) {
  return async (c) => {
    await render(c);
    const { data } = await loadMovimientos();
    actualizarSelectorPersona(selectPersona, data);
    barraPersona.hidden = false;
  };
}

registerRoute("inicio", conFiltroPersona(renderInicio));
registerRoute("movimientos", conFiltroPersona(renderMovimientos));
registerRoute("otros", conFiltroPersona(renderOtros));
registerRoute("resumen", conFiltroPersona(renderResumen));
registerRoute("ajustes", async (c) => {
  barraPersona.hidden = true;
  await renderAjustes(c);
});

selectPersona.addEventListener("change", () => {
  setPersona(selectPersona.value);
  renderRoute(container);
});

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
