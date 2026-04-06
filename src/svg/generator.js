// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

const { renderBarChart, renderAreaChart, formatNum } = require("./chart");

const WIDTH = 840;
const HEIGHT = 440;
const PADDING = 24;

/**
 * Render a stat card (the small summary boxes at the top).
 */
function renderStatCard(x, y, w, h, label, addVal, delVal, theme) {
  const rx = 8;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${theme.statCardBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + 18}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle" font-weight="500">${label}</text>
    <text x="${x + w / 2}" y="${y + 40}" fill="${theme.additions}" font-size="16" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="700">${formatNum(addVal)}</text>
    <text x="${x + w / 2}" y="${y + 58}" fill="${theme.deletions}" font-size="14" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="600">${formatNum(-delVal)}</text>`;
}

/**
 * Generate CSS animations.
 */
function renderAnimations(animate) {
  if (!animate) return "";
  return `
    <style>
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes growBar {
        from { transform: scaleY(0); }
        to   { transform: scaleY(1); }
      }
      .cpd-header  { animation: fadeInUp 0.5s ease both; }
      .cpd-stats   { animation: fadeInUp 0.5s ease 0.15s both; }
      .cpd-chart   { animation: fadeInUp 0.5s ease 0.3s both; }
      .cpd-legend  { animation: fadeInUp 0.5s ease 0.45s both; }
    </style>`;
}

/**
 * Generate the full SVG string.
 */
function generateSVG(chartData, stats, login, theme, options = {}) {
  const { chartType = "bars", animate = true, periodDays = 30 } = options;

  const periodLabel = periodDays <= 30 ? "30d Avg" : periodDays <= 90 ? "90d Avg" : "Year Avg";

  // Layout
  const headerY = PADDING;
  const statsY = headerY + 36;
  const statsH = 68;
  const chartTopY = statsY + statsH + 20;
  const chartH = HEIGHT - chartTopY - 50;
  const chartX = PADDING + 48;
  const chartW = WIDTH - PADDING * 2 - 56;

  // Stat cards
  const cardW = (chartW + 48 - 24) / 4;
  const cardGap = 8;
  const statCards = [
    { label: "Today", add: stats.today.additions, del: stats.today.deletions },
    { label: periodLabel, add: stats.periodAvg.additions, del: stats.periodAvg.deletions },
    { label: "Year Avg", add: stats.yearAvg.additions, del: stats.yearAvg.deletions },
    { label: `Streak`, add: stats.streak, del: 0, isStreak: true },
  ];

  let statsSvg = "";
  for (let i = 0; i < statCards.length; i++) {
    const card = statCards[i];
    const x = PADDING + i * (cardW + cardGap);

    if (card.isStreak) {
      // Special streak card
      statsSvg += `
        <rect x="${x}" y="${statsY}" width="${cardW}" height="${statsH}" rx="8" fill="${theme.statCardBg}" stroke="${theme.border}" stroke-width="1"/>
        <text x="${x + cardW / 2}" y="${statsY + 18}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle" font-weight="500">Streak</text>
        <text x="${x + cardW / 2}" y="${statsY + 44}" fill="${theme.accent}" font-size="20" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="700">${card.add}</text>
        <text x="${x + cardW / 2}" y="${statsY + 60}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle">days</text>`;
    } else {
      statsSvg += renderStatCard(x, statsY, cardW, statsH, card.label, card.add, card.del, theme);
    }
  }

  // Chart
  const chartOpts = { chartX, chartY: chartTopY, chartW, chartH };
  const chartContent =
    chartType === "area"
      ? renderAreaChart(chartData, theme, chartOpts)
      : renderBarChart(chartData, theme, chartOpts);

  // Legend
  const legendY = HEIGHT - 18;

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${renderAnimations(animate)}

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${theme.bg}" ${theme.bg === "transparent" ? "" : `stroke="${theme.border}" stroke-width="1"`}/>

  <!-- Header -->
  <g class="cpd-header">
    <text x="${PADDING}" y="${headerY + 20}" fill="${theme.title}" font-size="18" font-family="'Segoe UI', sans-serif" font-weight="700">Code Per Day</text>
    <text x="${WIDTH - PADDING}" y="${headerY + 20}" fill="${theme.textSecondary}" font-size="13" font-family="'Segoe UI', sans-serif" text-anchor="end" font-weight="500">@${escapeXml(login)}</text>
  </g>

  <!-- Stats Cards -->
  <g class="cpd-stats">
    ${statsSvg}
  </g>

  <!-- Chart -->
  <g class="cpd-chart">
    ${chartContent}
  </g>

  <!-- Legend -->
  <g class="cpd-legend">
    <circle cx="${PADDING + 6}" cy="${legendY}" r="5" fill="${theme.additions}"/>
    <text x="${PADDING + 16}" y="${legendY + 4}" fill="${theme.text}" font-size="11" font-family="'Segoe UI', sans-serif">Additions</text>
    <circle cx="${PADDING + 100}" cy="${legendY}" r="5" fill="${theme.deletions}"/>
    <text x="${PADDING + 110}" y="${legendY + 4}" fill="${theme.text}" font-size="11" font-family="'Segoe UI', sans-serif">Deletions</text>
    <text x="${WIDTH - PADDING}" y="${legendY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">Last ${chartData.length} days · ${formatNum(stats.periodTotal.additions)} / ${formatNum(-stats.periodTotal.deletions)} lines</text>
  </g>
</svg>`;

  return svg;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { generateSVG };
