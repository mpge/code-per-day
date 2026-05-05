const assert = require("assert");
const { processData } = require("./aggregator");
const { parseImageTypes, getOutputFileName } = require("./index");

function makeDate(date) {
  return new Date(`${date}T12:00:00Z`);
}

function testProcessDataTracksCommitCounts() {
  const commits = [
    { date: "2026-05-01T12:00:00Z", additions: 10, deletions: 3, commits: 1 },
    { date: "2026-05-01T15:00:00Z", additions: 4, deletions: 1, commits: 1 },
    { date: "2026-05-03T09:00:00Z", additions: 2, deletions: 2, commits: 1 },
  ];

  const calendar = new Map([
    ["2026-05-01", 2],
    ["2026-05-02", 0],
    ["2026-05-03", 1],
  ]);

  const { chartData, stats } = processData(
    commits,
    makeDate("2026-05-01"),
    makeDate("2026-05-03"),
    makeDate("2025-05-03"),
    calendar
  );

  assert.strictEqual(chartData.length, 3);
  assert.strictEqual(chartData[0].commits, 2);
  assert.strictEqual(chartData[1].commits, 0);
  assert.strictEqual(chartData[2].commits, 1);
  assert.strictEqual(stats.today.commits, 1);
  assert.strictEqual(stats.periodTotal.commits, 3);
  assert.strictEqual(stats.periodAvg.commits, 1);
  assert.strictEqual(stats.mostCommitsDay.date, "2026-05-01");
  assert.strictEqual(stats.mostCommitsDay.commits, 2);
}

function testImageTypeParsing() {
  assert.deepStrictEqual(parseImageTypes("code, commits"), ["code", "commits"]);
  assert.deepStrictEqual(parseImageTypes("all"), ["code", "commits"]);
  assert.strictEqual(getOutputFileName("code", "dark"), "code-per-day-dark.svg");
  assert.strictEqual(getOutputFileName("commits", "dark"), "commits-per-day-dark.svg");
}

function run() {
  testProcessDataTracksCommitCounts();
  testImageTypeParsing();
  console.log("All tests passed");
}

run();
