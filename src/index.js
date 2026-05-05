// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

const core = require("@actions/core");
const fs = require("fs");
const path = require("path");
const { fetchAllCommitData } = require("./github");
const { processData } = require("./aggregator");
const { generateSVG } = require("./svg/generator");
const { getTheme, getAllThemeNames } = require("./svg/themes");

function parseImageTypes(value) {
  const requested = String(value || "code")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const normalized = [];
  for (const type of requested) {
    if (type === "all") {
      normalized.push("code", "commits");
    } else if (type === "code" || type === "commits") {
      normalized.push(type);
    } else {
      throw new Error(`Unsupported image type: ${type}`);
    }
  }

  return [...new Set(normalized.length > 0 ? normalized : ["code"])];
}

function getOutputFileName(imageType, themeName) {
  return imageType === "commits"
    ? `commits-per-day-${themeName}.svg`
    : `code-per-day-${themeName}.svg`;
}

async function run() {
  try {
    // Read inputs
    const token = core.getInput("github_token", { required: true });
    const username = core.getInput("username") || "";
    const themeName = core.getInput("theme") || "dark";
    const period = parseInt(core.getInput("period") || "30", 10);
    const outputPath = core.getInput("output_path") || "./code-per-day";
    const allThemes = core.getInput("all_themes") === "true";
    const chartType = core.getInput("chart_type") || "bars";
    const animate = core.getInput("animations") !== "false";
    const imageTypes = parseImageTypes(core.getInput("image_types") || "code");

    // Fetch data from GitHub
    const { login, commits, since, now, yearAgo, calendar } = await fetchAllCommitData(
      token,
      username || undefined,
      period
    );

    // Process into chart data
    const { chartData, stats } = processData(commits, since, now, yearAgo, calendar);

    console.log(`\nStats for @${login}:`);
    console.log(`  Today:    +${stats.today.additions} / -${stats.today.deletions}`);
    console.log(`  Commits:  ${stats.today.commits} today`);
    console.log(`  ${period}d Avg: +${stats.periodAvg.additions} / -${stats.periodAvg.deletions}`);
    console.log(`  ${period}d Commit Avg: ${stats.periodAvg.commits}`);
    console.log(`  Year Avg: +${stats.yearAvg.additions} / -${stats.yearAvg.deletions}`);
    console.log(`  Year Commit Avg: ${stats.yearAvg.commits}`);
    console.log(`  Streak:   ${stats.streak} days`);

    // Debug: show last 14 days of data
    console.log(`\nDaily breakdown (last 14 days):`);
    const tail = chartData.slice(-14);
    for (const d of tail) {
      const marker = (d.additions > 0 || d.deletions > 0) ? "  *" : "";
      console.log(`  ${d.date}: +${d.additions} / -${d.deletions}${marker}`);
    }

    // Ensure output directory
    fs.mkdirSync(outputPath, { recursive: true });

    const options = { chartType, animate, periodDays: period };

    if (allThemes) {
      // Generate one SVG per theme
      for (const name of getAllThemeNames()) {
        const theme = getTheme(name);
        for (const imageType of imageTypes) {
          const svg = generateSVG(chartData, stats, login, theme, { ...options, imageType });
          const filePath = path.join(outputPath, getOutputFileName(imageType, name));
          fs.writeFileSync(filePath, svg, "utf8");
          console.log(`Generated: ${filePath}`);
        }
      }
      core.setOutput("svg_path", outputPath);
    } else {
      // Generate single SVG
      const theme = getTheme(themeName);
      let lastFilePath = null;
      for (const imageType of imageTypes) {
        const svg = generateSVG(chartData, stats, login, theme, { ...options, imageType });
        const filePath = path.join(outputPath, getOutputFileName(imageType, themeName));
        fs.writeFileSync(filePath, svg, "utf8");
        console.log(`Generated: ${filePath}`);
        lastFilePath = filePath;
      }
      core.setOutput("svg_path", imageTypes.length === 1 ? lastFilePath : outputPath);
    }

    console.log("Done!");
  } catch (err) {
    core.setFailed(err.message);
  }
}

module.exports = { parseImageTypes, getOutputFileName, run };

if (require.main === module) {
  run();
}
