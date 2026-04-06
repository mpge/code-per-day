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

    // Fetch data from GitHub
    const { login, commits, since, now, yearAgo } = await fetchAllCommitData(
      token,
      username || undefined,
      period
    );

    // Process into chart data
    const { chartData, stats } = processData(commits, since, now, yearAgo);

    console.log(`\nStats for @${login}:`);
    console.log(`  Today:    +${stats.today.additions} / -${stats.today.deletions}`);
    console.log(`  ${period}d Avg: +${stats.periodAvg.additions} / -${stats.periodAvg.deletions}`);
    console.log(`  Year Avg: +${stats.yearAvg.additions} / -${stats.yearAvg.deletions}`);
    console.log(`  Streak:   ${stats.streak} days`);

    // Ensure output directory
    fs.mkdirSync(outputPath, { recursive: true });

    const options = { chartType, animate, periodDays: period };

    if (allThemes) {
      // Generate one SVG per theme
      for (const name of getAllThemeNames()) {
        const theme = getTheme(name);
        const svg = generateSVG(chartData, stats, login, theme, options);
        const filePath = path.join(outputPath, `code-per-day-${name}.svg`);
        fs.writeFileSync(filePath, svg, "utf8");
        console.log(`Generated: ${filePath}`);
      }
      core.setOutput("svg_path", outputPath);
    } else {
      // Generate single SVG
      const theme = getTheme(themeName);
      const svg = generateSVG(chartData, stats, login, theme, options);
      const filePath = path.join(outputPath, `code-per-day-${themeName}.svg`);
      fs.writeFileSync(filePath, svg, "utf8");
      console.log(`Generated: ${filePath}`);
      core.setOutput("svg_path", filePath);
    }

    console.log("Done!");
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
