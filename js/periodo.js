import { monthKey, dayKey } from "./format.js";

// Opción de Ajustes "contar días anteriores como parte de este mes". Vale solo para
// el mes en que se configuró: al cambiar de mes se borra sola y todo vuelve a ser
// mes calendario. Se guarda por celular, como el resto de Ajustes.
const KEY_INICIO_MES = "pagosmp.inicio_mes";

export function mesActualKey() {
  return monthKey(new Date());
}

// { fecha: "YYYY-MM-DD", mes: "YYYY-MM" } si está activo para el mes actual, o null.
export function getInicioMes() {
  let valor = null;
  try {
    valor = JSON.parse(localStorage.getItem(KEY_INICIO_MES) || "null");
  } catch {
    valor = null;
  }
  if (!valor || !valor.fecha) return null;
  if (valor.mes !== mesActualKey()) {
    localStorage.removeItem(KEY_INICIO_MES);
    return null;
  }
  return valor;
}

export function setInicioMes(fecha) {
  if (!fecha) {
    localStorage.removeItem(KEY_INICIO_MES);
    return;
  }
  localStorage.setItem(KEY_INICIO_MES, JSON.stringify({ fecha, mes: mesActualKey() }));
}

// Mes ("YYYY-MM") al que cuenta un gasto. Los días entre la fecha elegida y el fin
// del mes anterior pasan al mes actual (y por lo tanto dejan de contar en el anterior).
export function mesContable(iso) {
  const inicio = getInicioMes();
  if (inicio) {
    const dia = dayKey(iso);
    if (dia >= inicio.fecha && dia < `${inicio.mes}-01`) return inicio.mes;
  }
  return monthKey(iso);
}

// Días ("YYYY-MM-DD") que forman el mes actual, del primero al último.
export function diasDelMesActual() {
  const hoy = new Date();
  const inicio = getInicioMes();
  const desde = inicio ? new Date(`${inicio.fecha}T12:00:00`) : new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12);
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12);

  const dias = [];
  for (const d = desde; d <= ultimo; d.setDate(d.getDate() + 1)) dias.push(dayKey(d));
  return dias;
}
