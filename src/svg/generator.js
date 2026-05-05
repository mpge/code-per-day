// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

const { renderBarChart, renderAreaChart, formatNum } = require("./chart");
const { renderCommitChart } = require("./commits-chart");

const WIDTH = 840;
const HEIGHT = 460;
const PADDING = 24;

function renderStatCard(x, y, w, h, label, addVal, delVal, theme) {
  const rx = 8;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${theme.statCardBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + 18}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle" font-weight="500">${label}</text>
    <text x="${x + w / 2}" y="${y + 40}" fill="${theme.additions}" font-size="16" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="700">${formatNum(addVal)}</text>
    <text x="${x + w / 2}" y="${y + 58}" fill="${theme.deletions}" font-size="14" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="600">${formatNum(-delVal)}</text>`;
}

function renderSingleValueStatCard(x, y, w, h, label, value, suffix, theme) {
  const rx = 8;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${theme.statCardBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + 18}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle" font-weight="500">${label}</text>
    <text x="${x + w / 2}" y="${y + 44}" fill="${theme.accent}" font-size="20" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="700">${value.toLocaleString("en-US")}</text>
    <text x="${x + w / 2}" y="${y + 60}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle">${suffix}</text>`;
}

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

function renderStreakCard(x, y, w, h, streak, theme) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${theme.statCardBg}" stroke="${theme.border}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + 18}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle" font-weight="500">Streak</text>
    <text x="${x + w / 2}" y="${y + 44}" fill="${theme.accent}" font-size="20" font-family="'Segoe UI Mono', 'Cascadia Code', monospace" text-anchor="middle" font-weight="700">${streak}</text>
    <text x="${x + w / 2}" y="${y + 60}" fill="${theme.textSecondary}" font-size="11" font-family="'Segoe UI', sans-serif" text-anchor="middle">days</text>`;
}

function generateSVG(chartData, stats, login, theme, options = {}) {
  const { chartType = "bars", animate = true, periodDays = 30, imageType = "code" } = options;
  const isCommitChart = imageType === "commits";
  const periodLabel = periodDays <= 30 ? "30d Avg" : periodDays <= 90 ? "90d Avg" : "Year Avg";

  const headerY = PADDING;
  const statsY = headerY + 36;
  const statsH = 68;
  const chartTopY = statsY + statsH + 20;
  const chartH = HEIGHT - chartTopY - 50;
  const chartX = PADDING + 48;
  const chartW = WIDTH - PADDING * 2 - 56;

  const cardW = (chartW + 48 - 24) / 4;
  const cardGap = 8;

  let statsSvg = "";
  for (let i = 0; i < 4; i++) {
    const x = PADDING + i * (cardW + cardGap);
    if (isCommitChart) {
      const commitCards = [
        { label: "Today", value: stats.today.commits, suffix: "commits" },
        { label: periodLabel, value: stats.periodAvg.commits, suffix: "avg/day" },
        { label: "Year Avg", value: stats.yearAvg.commits, suffix: "avg/day" },
        { label: "Best Day", value: stats.mostCommitsDay.commits, suffix: "commits" },
      ];
      const card = commitCards[i];
      statsSvg += renderSingleValueStatCard(x, statsY, cardW, statsH, card.label, card.value, card.suffix, theme);
    } else if (i === 3) {
      statsSvg += renderStreakCard(x, statsY, cardW, statsH, stats.streak, theme);
    } else {
      const codeCards = [
        { label: "Today", add: stats.today.additions, del: stats.today.deletions },
        { label: periodLabel, add: stats.periodAvg.additions, del: stats.periodAvg.deletions },
        { label: "Year Avg", add: stats.yearAvg.additions, del: stats.yearAvg.deletions },
      ];
      const card = codeCards[i];
      statsSvg += renderStatCard(x, statsY, cardW, statsH, card.label, card.add, card.del, theme);
    }
  }

  const chartOpts = { chartX, chartY: chartTopY, chartW, chartH };
  const chartContent = isCommitChart
    ? renderCommitChart(chartData, theme, chartOpts)
    : chartType === "area"
      ? renderAreaChart(chartData, theme, chartOpts)
      : renderBarChart(chartData, theme, chartOpts);

  const legendY = HEIGHT - 18;
  const legendContent = isCommitChart
    ? `
    <circle cx="${PADDING + 6}" cy="${legendY}" r="5" fill="${theme.accent}"/>
    <text x="${PADDING + 16}" y="${legendY + 4}" fill="${theme.text}" font-size="11" font-family="'Segoe UI', sans-serif">Commits</text>
    <text x="${WIDTH - PADDING}" y="${legendY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">Last ${chartData.length} days · ${stats.periodTotal.commits.toLocaleString("en-US")} commits</text>`
    : `
    <circle cx="${PADDING + 6}" cy="${legendY}" r="5" fill="${theme.additions}"/>
    <text x="${PADDING + 16}" y="${legendY + 4}" fill="${theme.text}" font-size="11" font-family="'Segoe UI', sans-serif">Additions</text>
    <circle cx="${PADDING + 100}" cy="${legendY}" r="5" fill="${theme.deletions}"/>
    <text x="${PADDING + 110}" y="${legendY + 4}" fill="${theme.text}" font-size="11" font-family="'Segoe UI', sans-serif">Deletions</text>
    <text x="${WIDTH - PADDING}" y="${legendY + 4}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="end">Last ${chartData.length} days · ${formatNum(stats.periodTotal.additions)} / ${formatNum(-stats.periodTotal.deletions)} lines</text>`;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${renderAnimations(animate)}

  <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${theme.bg}" ${theme.bg === "transparent" ? "" : `stroke="${theme.border}" stroke-width="1"`}/>

  <g class="cpd-header">
    <a href="https://github.com/mpge/code-per-day" target="_blank">
      <text x="${PADDING}" y="${headerY + 20}" fill="${theme.title}" font-size="18" font-family="'Segoe UI', sans-serif" font-weight="700">${isCommitChart ? "Commits Per Day" : "Code Per Day"}</text>
    </a>
    <text x="${WIDTH - PADDING}" y="${headerY + 20}" fill="${theme.textSecondary}" font-size="13" font-family="'Segoe UI', sans-serif" text-anchor="end" font-weight="500">@${escapeXml(login)}</text>
  </g>

  <g class="cpd-stats">
    ${statsSvg}
  </g>

  <g class="cpd-chart">
    ${chartContent}
  </g>

  <g class="cpd-legend">
    ${legendContent}
  </g>

  <a href="https://github.com/mpge/code-per-day" target="_blank">
    <text x="${WIDTH / 2}" y="${HEIGHT - 8}" fill="${theme.textSecondary}" font-size="10" font-family="'Segoe UI', sans-serif" text-anchor="middle" opacity="0.6">Get your own - github.com/mpge/code-per-day</text>
  </a>
</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { generateSVG };
