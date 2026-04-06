// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT
//
// Generates example SVGs with realistic sample data for README screenshots.

const fs = require("fs");
const path = require("path");
const { processData } = require("../src/aggregator");
const { generateSVG } = require("../src/svg/generator");
const { getTheme, getAllThemeNames } = require("../src/svg/themes");

// Seed-based pseudo-random for reproducible output
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSampleCommits(days) {
  const rand = seededRandom(42);
  const commits = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - d - 1));

    // Simulate realistic coding patterns
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseActivity = isWeekend ? 0.4 : 1.0;

    // Some days have bursts, some are quiet
    const burst = rand() > 0.7 ? 2.5 : 1.0;
    const quiet = rand() > 0.85 ? 0 : 1.0; // ~15% chance of zero-commit day

    const numCommits = Math.floor(rand() * 6 * baseActivity * burst * quiet) + (quiet > 0 ? 1 : 0);

    for (let c = 0; c < numCommits; c++) {
      // Additions tend to be higher than deletions (net growth)
      const additions = Math.floor(rand() * 200 * burst + 5);
      const deletions = Math.floor(rand() * 80 * burst + 2);

      commits.push({
        additions,
        deletions,
        date: date.toISOString(),
      });
    }
  }

  return commits;
}

// Generate sample data
const days = 30;
const now = new Date();
const since = new Date(now);
since.setDate(since.getDate() - days);
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);

// Generate commits for the full year for yearly averages
const yearCommits = generateSampleCommits(365);
const { chartData, stats } = processData(yearCommits, since, now, yearAgo);

console.log("Sample stats:");
console.log(`  Today:    +${stats.today.additions} / -${stats.today.deletions}`);
console.log(`  30d Avg:  +${stats.periodAvg.additions} / -${stats.periodAvg.deletions}`);
console.log(`  Year Avg: +${stats.yearAvg.additions} / -${stats.yearAvg.deletions}`);
console.log(`  Streak:   ${stats.streak} days`);
console.log(`  Chart data points: ${chartData.length}`);

// Ensure output dirs
const examplesDir = path.join(__dirname, "..", "examples");
fs.mkdirSync(examplesDir, { recursive: true });

// Generate SVGs for all themes, both chart types
for (const themeName of getAllThemeNames()) {
  const theme = getTheme(themeName);

  // Bar chart
  const barSvg = generateSVG(chartData, stats, "mpge", theme, {
    chartType: "bars",
    animate: true,
    periodDays: 30,
  });
  const barPath = path.join(examplesDir, `code-per-day-${themeName}.svg`);
  fs.writeFileSync(barPath, barSvg, "utf8");
  console.log(`Generated: ${barPath}`);

  // Area chart
  const areaSvg = generateSVG(chartData, stats, "mpge", theme, {
    chartType: "area",
    animate: true,
    periodDays: 30,
  });
  const areaPath = path.join(examplesDir, `code-per-day-${themeName}-area.svg`);
  fs.writeFileSync(areaPath, areaSvg, "utf8");
  console.log(`Generated: ${areaPath}`);
}

console.log("\nDone! All example SVGs generated in /examples");
