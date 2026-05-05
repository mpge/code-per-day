// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

const { formatDateLabel } = require("./chart");

function formatCount(n) {
  return Math.max(0, n).toLocaleString("en-US");
}

function computeCommitScaleCeiling(data) {
  const values = data
    .map((d) => d.commits || 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return 1;
  if (values.length <= 3) return Math.max(...values, 1);

  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const fence = q3 + 1.5 * iqr;
  const median = values[Math.floor(values.length * 0.5)];
  const p95 = values[Math.floor(values.length * 0.95)];
  const ceiling = Math.min(Math.max(fence, median * 4), p95 * 1.5);

  return Math.max(Math.ceil(ceiling), 1);
}

function renderCommitChart(data, theme, opts) {
  const { chartX, chartY, chartW, chartH } = opts;

  if (data.length === 0) return "";

  const maxVal = computeCommitScaleCeiling(data);
  const barGap = 2;
  const barWidth = Math.max(2, (chartW - barGap * data.length) / data.length);
  const usableH = chartH - 20;
  const baselineY = chartY + usableH;

  let svg = "";
  let labels = "";

  for (let i = 0; i <= 4; i++) {
    const y = chartY + (usableH / 4) * i;
    svg += `<line x1="${chartX}" y1="${y}" x2="${chartX + chartW}" y2="${y}" stroke="${theme.gridLine}" stroke-width="1" stroke-dasharray="4,4"/>`;
  }

  svg += `<line x1="${chartX}" y1="${baselineY}" x2="${chartX + chartW}" y2="${baselineY}" stroke="${theme.border}" stroke-width="1.5"/>`;
  svg += `<text x="${chartX - 8}" y="${chartY + 14}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">${formatCount(maxVal)}</text>`;
  svg += `<text x="${chartX - 8}" y="${baselineY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">0</text>`;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x = chartX + i * (barWidth + barGap);

    if (d.commits > 0) {
      const capped = Math.min(d.commits, maxVal);
      const h = (capped / maxVal) * usableH;
      const y = baselineY - h;
      const r = Math.min(barWidth / 2, 3);
      const isOutlier = d.commits > maxVal;

      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${theme.accent}" rx="${r}" opacity="${isOutlier ? 1 : 0.9}">`;
      svg += `<title>${d.date}: ${formatCount(d.commits)} commits</title>`;
      svg += `</rect>`;

      if (isOutlier) {
        const cx = x + barWidth / 2;
        svg += `<polygon points="${cx - 4},${y + 1} ${cx + 4},${y + 1} ${cx},${y - 5}" fill="${theme.accent}" opacity="0.7"/>`;
      }
    }

    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    if (i % labelInterval === 0 || i === data.length - 1) {
      labels += `<text x="${x + barWidth / 2}" y="${chartY + chartH + 16}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="middle">${formatDateLabel(d.date)}</text>`;
    }
  }

  return svg + labels;
}

module.exports = { renderCommitChart };
