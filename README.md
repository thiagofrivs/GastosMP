# PWA Registro de pagos MercadoPago — Fase 1 (solo lectura)

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

## Qué falta para instalarlo de verdad en el iPhone

Todavía no está desplegado en ningún hosting público — falta decidir GitHub Pages vs Cloudflare
Pages/Netlify (pregunta abierta del documento de contexto, §11.3). Sin HTTPS público, Safari no deja
"Agregar a pantalla de inicio" con service worker funcionando de forma confiable. Mientras tanto:

- Revisá todo en Chrome/Brave de escritorio en modo dispositivo móvil (DevTools) y corré Lighthouse
  ahí (auditoría "Progressive Web App").
- Cuando decidamos el hosting, desplegamos esta carpeta tal cual (es 100% estática) y ahí sí probamos
  "Agregar a pantalla de inicio" en el iPhone real.

## Decisión que tomé sin preguntarte: sin Chart.js

El documento sugería vendorizar Chart.js. Para 3 gráficos de barras simples (mes, categoría, día)
implementé un mini helper con `<canvas>` nativo (`js/charts.js`, ~40 líneas) en vez de sumar una
librería de terceros: menos código para mantener, cero dependencias, funciona offline sin vendorizar
nada. Si más adelante querés gráficos más ricos (líneas, tooltips interactivos, animaciones), ahí sí
conviene sumar Chart.js vendorizado como decía el documento original.
