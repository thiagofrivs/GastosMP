# PWA Registro de pagos MercadoPago

## Correr en local (Windows, sin Mac)

Los ES modules (`<script type="module">`) no cargan bien abriendo `index.html` con doble clic
(`file://`) por las restricciones de CORS del navegador. Hace falta un servidor estático mínimo:

```powershell
# Opción 1: si tenés Python
python -m http.server 8080

# Opción 2: si tenés Node
npx serve -l 8080
```

Después abrí `http://localhost:8080` en el navegador. Los service workers funcionan en `localhost`
sin necesitar HTTPS real.

## Íconos (paso previo, si no lo hiciste)

Todavía no hay PNGs en `icons/`. Abrí `icons/generate-icons.html` con doble clic (este sí anda con
`file://` porque no usa módulos) y descargá los 3 archivos (`icon-192.png`, `icon-512.png`,
`apple-touch-icon-180.png`) a esta misma carpeta `icons/`. Es un placeholder ($ en círculo azul);
reemplazalo cuando quieras por un diseño propio con el mismo nombre y tamaño.

## Primer uso

1. Levantá el servidor local y abrí la app.
2. Andá a la pestaña **Ajustes**.
3. Pegá la URL `/exec` de tu Apps Script (la misma que ya probaste en la Fase 0) y, si configuraste
   `TOKEN` en las Propiedades del script, pegalo también.
4. Tocá **Guardar**, después **Probar conexión**. Tiene que decir "OK — se leyeron N movimientos."
5. Andá a **Inicio**, **Movimientos** o **Resumen** para ver tus datos reales.

## Qué implementa esta Fase 1

- **Inicio**: total del mes en curso + comparación % contra el mes anterior, últimos 10 movimientos.
- **Movimientos**: lista agrupada por día (orden descendente), búsqueda por concepto, filtro por
  rango de fechas, pull-to-refresh (gesto táctil) + botón "Sincronizar".
- **Resumen**: gráfico de gastos por mes (últimos 12), por categoría del mes actual, por día del mes
  actual, promedio diario y mayor gasto del mes.
- **Ajustes**: URL + token (se guardan en `localStorage`, nunca en el repo), botón "Probar conexión",
  exportar a CSV lo que está cargado, borrar datos locales.
- **Offline**: siempre intenta la red primero (`GET action=list`); si falla, muestra la última copia
  guardada en IndexedDB con un aviso de "datos de la última sincronización: [fecha]".
- **Service worker**: cache-first (con actualización en segundo plano) para el app shell. Las
  llamadas al Apps Script pasan directo a la red, nunca se cachean ahí — la copia offline de los
  datos vive en IndexedDB, no en el Service Worker.
- Tolera filas con celdas vacías/malformadas del Sheet (el propio Apps Script ya las filtra, ver
  Fase 0).

## Qué agrega la Fase 2

- **Agregar gasto**: botón flotante "+" en Inicio. Formulario con concepto (autosugerido según
  conceptos anteriores vía `<datalist>`), monto, fecha/hora (default: ahora) y categoría (Comida,
  Transporte, Servicios, Salud, Ocio, Otros — o sin categoría).
- **Editar/borrar**: tocá cualquier movimiento en la lista de Movimientos para abrir el mismo
  formulario precargado, con botón "Borrar" (con confirmación).
- **Actualización optimista**: el cambio se ve al toque en la UI, aunque el POST todavía no haya
  terminado.
- **Reintento offline**: si el POST falla por falta de red, la operación queda en una cola en
  IndexedDB (`js/db.js`, store `pendientes`) y se reintenta sola la próxima vez que la app cargue
  datos con conexión. Si en cambio el servidor responde con un error real (token inválido, dato
  faltante), se deshace el cambio optimista y se muestra el error — no se reintenta algo que va a
  fallar siempre.
- Mientras una operación está en la cola de pendientes, el ítem se muestra con la etiqueta
  "pendiente" en la lista.

**Ojo con el token**: mientras no se active `REQUIRE_TOKEN` en el Apps Script (ver
`apps-script/FASE2-TOKEN.md`), cualquiera que tenga la URL `/exec` puede escribir en el Sheet. Esto
ya era así desde la Fase 0/1 para las lecturas; ahora también aplica a las escrituras nuevas.

## Deploy

Esta carpeta (`pwa/`) es su propio repo git, separado de `apps-script/` y del documento de contexto
(para no exponer nada del backend en un repo público). Vive en
[github.com/thiagofrivs/GastosMP](https://github.com/thiagofrivs/GastosMP), publicado con GitHub
Pages en `https://thiagofrivs.github.io/GastosMP/`. Para subir cambios nuevos: commit + push a `main`
de ese repo, GitHub Pages redespliega solo.

## Decisión que tomé sin preguntarte: sin Chart.js

El documento sugería vendorizar Chart.js. Para 3 gráficos de barras simples (mes, categoría, día)
implementé un mini helper con `<canvas>` nativo (`js/charts.js`, ~40 líneas) en vez de sumar una
librería de terceros: menos código para mantener, cero dependencias, funciona offline sin vendorizar
nada. Si más adelante querés gráficos más ricos (líneas, tooltips interactivos, animaciones), ahí sí
conviene sumar Chart.js vendorizado como decía el documento original.
