// Mini helper de barras sobre <canvas> nativo. Ver README.md ("Decisión que tomé sin
// preguntarte") por qué no se vendorizó Chart.js para esto.
export function drawBarChart(canvas, { labels, values, threshold = null }) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 300;
  const cssHeight = canvas.clientHeight || 160;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const styles = getComputedStyle(document.documentElement);
  const barColor = styles.getPropertyValue("--accent").trim() || "#4f8cff";
  const dangerColor = styles.getPropertyValue("--danger").trim() || "#dc2626";
  const textColor = styles.getPropertyValue("--text").trim() || "#111";

  const max = Math.max(...values, 1);
  const paddingLeft = 4;
  const paddingBottom = 20;
  const paddingTop = 8;
  const chartHeight = cssHeight - paddingBottom - paddingTop;
  const barGap = values.length > 20 ? 2 : 8;
  const barWidth = Math.max(
    2,
    (cssWidth - paddingLeft * 2 - barGap * (values.length - 1)) / values.length
  );

  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";

  values.forEach((v, i) => {
    const barHeight = max === 0 ? 0 : (v / max) * chartHeight;
    const x = paddingLeft + i * (barWidth + barGap);
    const y = paddingTop + (chartHeight - barHeight);
    const limite = Array.isArray(threshold) ? threshold[i] : threshold;
    ctx.fillStyle = limite != null && v > limite ? dangerColor : barColor;
    ctx.fillRect(x, y, barWidth, barHeight);

    if (values.length <= 15 || i % Math.ceil(values.length / 15) === 0) {
      ctx.fillStyle = textColor;
      ctx.fillText(String(labels[i] ?? ""), x + barWidth / 2, cssHeight - 6);
    }
  });
}
