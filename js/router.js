const routes = {};

export function registerRoute(name, renderFn) {
  routes[name] = renderFn;
}

export function currentRoute() {
  const hash = window.location.hash.replace(/^#\//, "") || "inicio";
  return routes[hash] ? hash : "inicio";
}

export async function renderRoute(container) {
  const name = currentRoute();
  document.querySelectorAll("#tabbar a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === name);
  });
  container.innerHTML = '<div class="loading">Cargando…</div>';
  try {
    await routes[name](container);
  } catch (err) {
    container.innerHTML = `<div class="banner banner-error">Error: ${err.message}</div>`;
  }

  // Solo en una navegación real entre pestañas, nunca en los re-renders internos
  // que dispara cada vista sola (buscar, filtrar, editar) — para eso, cada vista
  // llama a su propia función de render directamente, sin pasar por acá.
  container.classList.remove("view-enter");
  void container.offsetWidth;
  container.classList.add("view-enter");
}

export function startRouter(container) {
  window.addEventListener("hashchange", () => renderRoute(container));
  renderRoute(container);
}
