import type { TokenUsageRecord, PlanIssue } from "@/lib/types";

// =============================================================================
// Agent Activity Timeline — pure utility functions
// =============================================================================

/** A single timeline entry representing one agent session. */
export interface TimelineEntry {
  sessionId: string;
  issueId: string;
  issueTitle: string;
  start: number;    // epoch ms
  end: number;      // epoch ms
  durationMs: number;
  cost: number;
  tokens: number;
  turns: number;
  model: string;
}

/** A group of entries that occurred on the same day. */
export interface DayGroup {
  date: string;     // "YYYY-MM-DD"
  label: string;    // "Feb 15, 2026"
  entries: TimelineEntry[];
  totalCost: number;
  totalDuration: number;
  totalSessions: number;
}

/**
 * Convert raw token usage records into timeline entries.
 * Each record's `timestamp` is when the session ended; we compute start from duration_ms.
 */
export function buildTimelineEntries(
  records: TokenUsageRecord[],
  issueMap: Record<string, PlanIssue>,
): TimelineEntry[] {
  return records
    .filter((r) => r.duration_ms > 0)
    .map((r) => {
      const end = new Date(r.timestamp).getTime();
      const start = end - r.duration_ms;
      const issue = issueMap[r.issue_id];
      return {
        sessionId: r.session_id,
        issueId: r.issue_id,
        issueTitle: issue?.title ?? r.issue_id,
        start,
        end,
        durationMs: r.duration_ms,
        cost: r.total_cost_usd,
        tokens:
          r.input_tokens +
          r.output_tokens +
          r.cache_read_tokens +
          r.cache_creation_tokens,
        turns: r.num_turns,
        model: r.model,
      };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Group timeline entries by calendar day.
 */
export function groupByDay(entries: TimelineEntry[]): DayGroup[] {
  const map = new Map<string, TimelineEntry[]>();

  for (const entry of entries) {
    const d = new Date(entry.start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const arr = map.get(key);
    if (arr) {
      arr.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }

  const groups: DayGroup[] = [];
  for (const [date, dayEntries] of map) {
    const d = new Date(date + "T00:00:00");
    const label = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    groups.push({
      date,
      label,
      entries: dayEntries.sort((a, b) => a.start - b.start),
      totalCost: dayEntries.reduce((s, e) => s + e.cost, 0),
      totalDuration: dayEntries.reduce((s, e) => s + e.durationMs, 0),
      totalSessions: dayEntries.length,
    });
  }

  return groups.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Format milliseconds as a human-readable duration.
 * Examples: "2h 30m", "45m", "12s", "3h 5m"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return "<1s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format a token count as a readable string.
 * Examples: "1.2k", "65k", "1.2M"
 */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}k`;
  }
  return String(count);
}

/**
 * Compute the width percentage of a timeline bar relative to the day's time range.
 * Returns { left%, width% } for positioning within a day row.
 */
export function computeBarPosition(
  entry: TimelineEntry,
  dayStart: number,
  dayEnd: number,
): { left: number; width: number } {
  const range = dayEnd - dayStart;
  if (range <= 0) return { left: 0, width: 100 };

  const left = ((entry.start - dayStart) / range) * 100;
  const width = Math.max((entry.durationMs / range) * 100, 2); // min 2% width for visibility
  return { left: Math.max(0, left), width: Math.min(width, 100 - left) };
}

/**
 * Get color class for a timeline bar based on issue labels/type.
 */
export function getEntryColor(
  issueId: string,
  issueMap: Record<string, PlanIssue>,
): string {
  const issue = issueMap[issueId];
  if (!issue) return "bg-gray-500";

  if (issue.labels?.some((l) => l.startsWith("submission:"))) return "bg-purple-500";
  if (issue.labels?.includes("development")) return "bg-amber-500";
  if (issue.labels?.includes("research")) return "bg-blue-500";
  if (issue.issue_type === "epic") return "bg-green-500";
  return "bg-cyan-500";
}
