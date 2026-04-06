// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

/**
 * Format a number with commas and +/- prefix.
 */
function formatNum(n, prefix = true) {
  const abs = Math.abs(n).toLocaleString("en-US");
  if (!prefix) return abs;
  return n >= 0 ? `+${abs}` : `-${abs}`;
}

/**
 * Format a short date label from YYYY-MM-DD.
 */
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Generate the bar chart SVG content.
 */
function renderBarChart(data, theme, opts) {
  const { chartX, chartY, chartW, chartH } = opts;

  if (data.length === 0) return "";

  const maxAdd = Math.max(...data.map((d) => d.additions), 1);
  const maxDel = Math.max(...data.map((d) => d.deletions), 1);
  const maxVal = Math.max(maxAdd, maxDel);

  const barGap = 2;
  const barWidth = Math.max(2, (chartW - barGap * data.length) / data.length);
  const midY = chartY + chartH / 2;
  const halfH = chartH / 2 - 10;

  let bars = "";
  let labels = "";

  // Grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = chartY + (chartH / gridLines) * i;
    bars += `<line x1="${chartX}" y1="${y}" x2="${chartX + chartW}" y2="${y}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="4,4"/>`;
  }

  // Baseline
  bars += `<line x1="${chartX}" y1="${midY}" x2="${chartX + chartW}" y2="${midY}" stroke="${theme.border}" stroke-width="1.5"/>`;

  // Y-axis labels
  const topLabel = formatNum(maxVal, false);
  const botLabel = formatNum(maxVal, false);
  bars += `<text x="${chartX - 8}" y="${chartY + 14}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">+${topLabel}</text>`;
  bars += `<text x="${chartX - 8}" y="${chartY + chartH - 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">-${botLabel}</text>`;
  bars += `<text x="${chartX - 8}" y="${midY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">0</text>`;

  // Bars
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x = chartX + i * (barWidth + barGap);

    // Addition bar (goes up from middle)
    if (d.additions > 0) {
      const h = (d.additions / maxVal) * halfH;
      const r = Math.min(barWidth / 2, 3);
      bars += `<rect x="${x}" y="${midY - h}" width="${barWidth}" height="${h}" fill="${theme.additions}" rx="${r}" opacity="0.9">`;
      bars += `<title>${d.date}: +${d.additions} additions</title>`;
      bars += `</rect>`;
    }

    // Deletion bar (goes down from middle)
    if (d.deletions > 0) {
      const h = (d.deletions / maxVal) * halfH;
      const r = Math.min(barWidth / 2, 3);
      bars += `<rect x="${x}" y="${midY}" width="${barWidth}" height="${h}" fill="${theme.deletions}" rx="${r}" opacity="0.9">`;
      bars += `<title>${d.date}: -${d.deletions} deletions</title>`;
      bars += `</rect>`;
    }

    // Date labels (every ~7 days or so)
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    if (i % labelInterval === 0 || i === data.length - 1) {
      labels += `<text x="${x + barWidth / 2}" y="${chartY + chartH + 16}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="middle">${formatDateLabel(d.date)}</text>`;
    }
  }

  return bars + labels;
}

/**
 * Generate the area chart SVG content.
 */
function renderAreaChart(data, theme, opts) {
  const { chartX, chartY, chartW, chartH } = opts;

  if (data.length === 0) return "";

  const maxAdd = Math.max(...data.map((d) => d.additions), 1);
  const maxDel = Math.max(...data.map((d) => d.deletions), 1);
  const maxVal = Math.max(maxAdd, maxDel);

  const midY = chartY + chartH / 2;
  const halfH = chartH / 2 - 10;
  const step = chartW / Math.max(data.length - 1, 1);

  let svg = "";

  // Grid lines
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = chartY + (chartH / gridLines) * i;
    svg += `<line x1="${chartX}" y1="${y}" x2="${chartX + chartW}" y2="${y}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="4,4"/>`;
  }

  // Baseline
  svg += `<line x1="${chartX}" y1="${midY}" x2="${chartX + chartW}" y2="${midY}" stroke="${theme.border}" stroke-width="1.5"/>`;

  // Y-axis labels
  svg += `<text x="${chartX - 8}" y="${chartY + 14}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">+${formatNum(maxVal, false)}</text>`;
  svg += `<text x="${chartX - 8}" y="${chartY + chartH - 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">-${formatNum(maxVal, false)}</text>`;
  svg += `<text x="${chartX - 8}" y="${midY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">0</text>`;

  // Build area paths for additions (above baseline)
  let addPath = `M ${chartX} ${midY}`;
  let addLine = `M ${chartX} ${midY}`;
  for (let i = 0; i < data.length; i++) {
    const x = chartX + i * step;
    const y = midY - (data[i].additions / maxVal) * halfH;
    addPath += ` L ${x} ${y}`;
    addLine += ` L ${x} ${y}`;
  }
  addPath += ` L ${chartX + (data.length - 1) * step} ${midY} Z`;

  // Build area paths for deletions (below baseline)
  let delPath = `M ${chartX} ${midY}`;
  let delLine = `M ${chartX} ${midY}`;
  for (let i = 0; i < data.length; i++) {
    const x = chartX + i * step;
    const y = midY + (data[i].deletions / maxVal) * halfH;
    delPath += ` L ${x} ${y}`;
    delLine += ` L ${x} ${y}`;
  }
  delPath += ` L ${chartX + (data.length - 1) * step} ${midY} Z`;

  svg += `<path d="${addPath}" fill="${theme.additions}" opacity="0.15"/>`;
  svg += `<path d="${addLine}" fill="none" stroke="${theme.additions}" stroke-width="2"/>`;
  svg += `<path d="${delPath}" fill="${theme.deletions}" opacity="0.15"/>`;
  svg += `<path d="${delLine}" fill="none" stroke="${theme.deletions}" stroke-width="2"/>`;

  // Date labels
  const labelInterval = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i++) {
    if (i % labelInterval === 0 || i === data.length - 1) {
      const x = chartX + i * step;
      svg += `<text x="${x}" y="${chartY + chartH + 16}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="middle">${formatDateLabel(data[i].date)}</text>`;
    }
  }

  return svg;
}

module.exports = { renderBarChart, renderAreaChart, formatNum, formatDateLabel };
