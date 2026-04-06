// Code Per Day - GitHub Action
// Author: MPGE (https://github.com/mpge)
// Licensed under MIT

/**
 * Convert a Date to YYYY-MM-DD string.
 */
function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Aggregate raw commit data into per-day totals.
 * Returns a Map<string, { additions, deletions }> keyed by YYYY-MM-DD.
 */
function aggregateByDay(commits) {
  const map = new Map();
  for (const c of commits) {
    const key = toDateKey(new Date(c.date));
    const entry = map.get(key) || { additions: 0, deletions: 0 };
    entry.additions += c.additions;
    entry.deletions += c.deletions;
    map.set(key, entry);
  }
  return map;
}

/**
 * Fill missing days with zeros and return a sorted array.
 */
function fillDays(dayMap, from, to) {
  const result = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const key = toDateKey(current);
    const entry = dayMap.get(key) || { additions: 0, deletions: 0 };
    result.push({ date: key, ...entry });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Calculate summary statistics.
 */
function calculateStats(dailyData, allDailyData) {
  const today = dailyData.length > 0 ? dailyData[dailyData.length - 1] : { additions: 0, deletions: 0 };

  const sum = (arr, key) => arr.reduce((s, d) => s + d[key], 0);
  const avg = (arr, key) => arr.length > 0 ? Math.round(sum(arr, key) / arr.length) : 0;

  // Period average (the charted days)
  const periodAvgAdd = avg(dailyData, "additions");
  const periodAvgDel = avg(dailyData, "deletions");

  // Yearly average (all data)
  const yearAvgAdd = avg(allDailyData, "additions");
  const yearAvgDel = avg(allDailyData, "deletions");

  // Period totals
  const periodTotalAdd = sum(dailyData, "additions");
  const periodTotalDel = sum(dailyData, "deletions");

  // Yearly totals
  const yearTotalAdd = sum(allDailyData, "additions");
  const yearTotalDel = sum(allDailyData, "deletions");

  // Busiest day
  let busiestDay = dailyData[0] || { date: "N/A", additions: 0, deletions: 0 };
  for (const d of dailyData) {
    if (d.additions + d.deletions > busiestDay.additions + busiestDay.deletions) {
      busiestDay = d;
    }
  }

  // Current streak (consecutive days with commits from the end)
  let streak = 0;
  for (let i = dailyData.length - 1; i >= 0; i--) {
    if (dailyData[i].additions > 0 || dailyData[i].deletions > 0) {
      streak++;
    } else {
      break;
    }
  }

  return {
    today: { additions: today.additions, deletions: today.deletions },
    periodAvg: { additions: periodAvgAdd, deletions: periodAvgDel },
    yearAvg: { additions: yearAvgAdd, deletions: yearAvgDel },
    periodTotal: { additions: periodTotalAdd, deletions: periodTotalDel },
    yearTotal: { additions: yearTotalAdd, deletions: yearTotalDel },
    busiestDay,
    streak,
    periodDays: dailyData.length,
  };
}

/**
 * Process raw commit data into chart-ready data.
 */
function processData(commits, since, now, yearAgo) {
  const dayMap = aggregateByDay(commits);
  const chartData = fillDays(dayMap, since, now);
  const allData = fillDays(dayMap, yearAgo, now);
  const stats = calculateStats(chartData, allData);
  return { chartData, stats };
}

module.exports = { processData, toDateKey };
