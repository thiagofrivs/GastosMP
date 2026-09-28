const CURRENCY = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const DATE_LONG = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_DAY = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATE_MONTH = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

export function money(n) {
  if (n == null || isNaN(n)) return CURRENCY.format(0);
  return CURRENCY.format(n);
}

export function fechaLarga(iso) {
  if (!iso) return "";
  return DATE_LONG.format(new Date(iso));
}

export function fechaDia(iso) {
  if (!iso) return "";
  return DATE_DAY.format(new Date(iso));
}

export function mesLabel(iso) {
  if (!iso) return "";
  const label = DATE_MONTH.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
