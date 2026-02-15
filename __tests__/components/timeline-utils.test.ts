// =============================================================================
// Tests for src/components/fleet/timeline-utils.ts
// =============================================================================

import {
  buildTimelineEntries,
  groupByDay,
  formatDuration,
  formatTokens,
  computeBarPosition,
  getEntryColor,
} from "@/components/fleet/timeline-utils";
import type { TimelineEntry, DayGroup } from "@/components/fleet/timeline-utils";
import type { TokenUsageRecord, PlanIssue } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: create a mock TokenUsageRecord with sensible defaults
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<TokenUsageRecord> = {}): TokenUsageRecord {
  return {
    timestamp: "2026-02-15T10:00:00Z",
    session_id: "sess-1",
    issue_id: "app-123",
    project: "TestProject",
    model: "claude-sonnet-4-5-20250929",
    input_tokens: 50000,
    output_tokens: 15000,
    cache_read_tokens: 20000,
    cache_creation_tokens: 5000,
    total_cost_usd: 0.42,
    duration_ms: 3600000, // 1 hour
    num_turns: 12,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: create a mock PlanIssue with sensible defaults
// ---------------------------------------------------------------------------

function makePlanIssue(overrides: Partial<PlanIssue> = {}): PlanIssue {
  return {
    id: overrides.id ?? "ISSUE-1",
    title: overrides.title ?? "Test issue",
    status: overrides.status ?? "open",
    priority: overrides.priority ?? 2,
    issue_type: overrides.issue_type ?? "task",
    blocked_by: overrides.blocked_by ?? [],
    blocks: overrides.blocks ?? [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: create a mock TimelineEntry with sensible defaults
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    sessionId: "sess-1",
    issueId: "app-123",
    issueTitle: "Test issue",
    start: new Date("2026-02-15T09:00:00Z").getTime(),
    end: new Date("2026-02-15T10:00:00Z").getTime(),
    durationMs: 3600000,
    cost: 0.42,
    tokens: 90000,
    turns: 12,
    model: "claude-sonnet-4-5-20250929",
    ...overrides,
  };
}

// =============================================================================
// buildTimelineEntries
// =============================================================================

describe("buildTimelineEntries", () => {
  const MOCK_RECORD = makeRecord();

  // ---------------------------------------------------------------------------
  // Basic conversion
  // ---------------------------------------------------------------------------

  describe("basic conversion", () => {
    it("converts a single record into a timeline entry", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-123": makePlanIssue({ id: "app-123", title: "My App" }),
      };
      const entries = buildTimelineEntries([MOCK_RECORD], issueMap);

      expect(entries).toHaveLength(1);
      const entry = entries[0];
      expect(entry.sessionId).toBe("sess-1");
      expect(entry.issueId).toBe("app-123");
      expect(entry.issueTitle).toBe("My App");
      expect(entry.durationMs).toBe(3600000);
      expect(entry.cost).toBe(0.42);
      expect(entry.tokens).toBe(50000 + 15000 + 20000 + 5000); // 90000
      expect(entry.turns).toBe(12);
      expect(entry.model).toBe("claude-sonnet-4-5-20250929");
    });

    it("computes start = end - duration_ms", () => {
      const issueMap: Record<string, PlanIssue> = {};
      const entries = buildTimelineEntries([MOCK_RECORD], issueMap);

      const expectedEnd = new Date("2026-02-15T10:00:00Z").getTime();
      const expectedStart = expectedEnd - 3600000;
      expect(entries[0].end).toBe(expectedEnd);
      expect(entries[0].start).toBe(expectedStart);
    });

    it("converts multiple records", () => {
      const records = [
        makeRecord({ session_id: "sess-1", timestamp: "2026-02-15T10:00:00Z" }),
        makeRecord({ session_id: "sess-2", timestamp: "2026-02-15T12:00:00Z" }),
        makeRecord({ session_id: "sess-3", timestamp: "2026-02-15T14:00:00Z" }),
      ];
      const entries = buildTimelineEntries(records, {});
      expect(entries).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  describe("filtering", () => {
    it("filters out records with duration_ms of 0", () => {
      const records = [
        makeRecord({ session_id: "sess-1", duration_ms: 3600000 }),
        makeRecord({ session_id: "sess-2", duration_ms: 0 }),
      ];
      const entries = buildTimelineEntries(records, {});
      expect(entries).toHaveLength(1);
      expect(entries[0].sessionId).toBe("sess-1");
    });

    it("filters out records with negative duration_ms", () => {
      const records = [
        makeRecord({ session_id: "sess-1", duration_ms: -1000 }),
      ];
      const entries = buildTimelineEntries(records, {});
      expect(entries).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  describe("sorting", () => {
    it("sorts entries by start time ascending", () => {
      const records = [
        makeRecord({
          session_id: "sess-late",
          timestamp: "2026-02-15T14:00:00Z",
          duration_ms: 1800000,
        }),
        makeRecord({
          session_id: "sess-early",
          timestamp: "2026-02-15T10:00:00Z",
          duration_ms: 1800000,
        }),
        makeRecord({
          session_id: "sess-mid",
          timestamp: "2026-02-15T12:00:00Z",
          duration_ms: 1800000,
        }),
      ];
      const entries = buildTimelineEntries(records, {});
      expect(entries.map((e) => e.sessionId)).toEqual([
        "sess-early",
        "sess-mid",
        "sess-late",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Issue title resolution
  // ---------------------------------------------------------------------------

  describe("issue title resolution", () => {
    it("uses issue title from issueMap when available", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-123": makePlanIssue({ id: "app-123", title: "PatchCycle Build" }),
      };
      const entries = buildTimelineEntries([MOCK_RECORD], issueMap);
      expect(entries[0].issueTitle).toBe("PatchCycle Build");
    });

    it("falls back to issue_id when issue is not in issueMap", () => {
      const entries = buildTimelineEntries([MOCK_RECORD], {});
      expect(entries[0].issueTitle).toBe("app-123");
    });
  });

  // ---------------------------------------------------------------------------
  // Token aggregation
  // ---------------------------------------------------------------------------

  describe("token aggregation", () => {
    it("sums all four token types", () => {
      const record = makeRecord({
        input_tokens: 100,
        output_tokens: 200,
        cache_read_tokens: 300,
        cache_creation_tokens: 400,
      });
      const entries = buildTimelineEntries([record], {});
      expect(entries[0].tokens).toBe(1000);
    });

    it("handles zero tokens", () => {
      const record = makeRecord({
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
      });
      const entries = buildTimelineEntries([record], {});
      expect(entries[0].tokens).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      const entries = buildTimelineEntries([], {});
      expect(entries).toEqual([]);
    });

    it("returns empty array when all records have zero duration", () => {
      const records = [
        makeRecord({ session_id: "sess-1", duration_ms: 0 }),
        makeRecord({ session_id: "sess-2", duration_ms: 0 }),
      ];
      const entries = buildTimelineEntries(records, {});
      expect(entries).toEqual([]);
    });
  });
});

// =============================================================================
// groupByDay
// =============================================================================

describe("groupByDay", () => {
  // ---------------------------------------------------------------------------
  // Basic grouping
  // ---------------------------------------------------------------------------

  describe("basic grouping", () => {
    it("groups entries on the same day into one group", () => {
      const entries = [
        makeEntry({
          sessionId: "sess-1",
          start: new Date("2026-02-15T09:00:00Z").getTime(),
          end: new Date("2026-02-15T10:00:00Z").getTime(),
          durationMs: 3600000,
          cost: 0.50,
        }),
        makeEntry({
          sessionId: "sess-2",
          start: new Date("2026-02-15T14:00:00Z").getTime(),
          end: new Date("2026-02-15T15:00:00Z").getTime(),
          durationMs: 3600000,
          cost: 0.30,
        }),
      ];
      const groups = groupByDay(entries);
      expect(groups).toHaveLength(1);
      expect(groups[0].entries).toHaveLength(2);
    });

    it("separates entries on different days into separate groups", () => {
      const entries = [
        makeEntry({
          sessionId: "sess-1",
          start: new Date("2026-02-15T09:00:00Z").getTime(),
        }),
        makeEntry({
          sessionId: "sess-2",
          start: new Date("2026-02-16T09:00:00Z").getTime(),
        }),
      ];
      const groups = groupByDay(entries);
      expect(groups).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Aggregation
  // ---------------------------------------------------------------------------

  describe("aggregation", () => {
    it("sums totalCost across entries in a group", () => {
      const entries = [
        makeEntry({ cost: 0.50, durationMs: 1000, start: new Date("2026-02-15T09:00:00Z").getTime() }),
        makeEntry({ cost: 1.25, durationMs: 2000, start: new Date("2026-02-15T10:00:00Z").getTime() }),
      ];
      const groups = groupByDay(entries);
      expect(groups[0].totalCost).toBeCloseTo(1.75);
    });

    it("sums totalDuration across entries in a group", () => {
      const entries = [
        makeEntry({ durationMs: 3600000, start: new Date("2026-02-15T09:00:00Z").getTime() }),
        makeEntry({ durationMs: 1800000, start: new Date("2026-02-15T10:00:00Z").getTime() }),
      ];
      const groups = groupByDay(entries);
      expect(groups[0].totalDuration).toBe(5400000);
    });

    it("counts totalSessions correctly", () => {
      const entries = [
        makeEntry({ sessionId: "sess-1", start: new Date("2026-02-15T09:00:00Z").getTime() }),
        makeEntry({ sessionId: "sess-2", start: new Date("2026-02-15T10:00:00Z").getTime() }),
        makeEntry({ sessionId: "sess-3", start: new Date("2026-02-15T11:00:00Z").getTime() }),
      ];
      const groups = groupByDay(entries);
      expect(groups[0].totalSessions).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  describe("sorting", () => {
    it("sorts groups by date ascending", () => {
      const entries = [
        makeEntry({
          sessionId: "sess-late",
          start: new Date("2026-02-17T09:00:00Z").getTime(),
        }),
        makeEntry({
          sessionId: "sess-early",
          start: new Date("2026-02-15T09:00:00Z").getTime(),
        }),
        makeEntry({
          sessionId: "sess-mid",
          start: new Date("2026-02-16T09:00:00Z").getTime(),
        }),
      ];
      const groups = groupByDay(entries);
      expect(groups.map((g) => g.date)).toEqual([
        "2026-02-15",
        "2026-02-16",
        "2026-02-17",
      ]);
    });

    it("sorts entries within a group by start time ascending", () => {
      const entries = [
        makeEntry({
          sessionId: "sess-late",
          start: new Date("2026-02-15T14:00:00Z").getTime(),
        }),
        makeEntry({
          sessionId: "sess-early",
          start: new Date("2026-02-15T08:00:00Z").getTime(),
        }),
        makeEntry({
          sessionId: "sess-mid",
          start: new Date("2026-02-15T11:00:00Z").getTime(),
        }),
      ];
      const groups = groupByDay(entries);
      expect(groups[0].entries.map((e) => e.sessionId)).toEqual([
        "sess-early",
        "sess-mid",
        "sess-late",
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Date key format
  // ---------------------------------------------------------------------------

  describe("date key format", () => {
    it("uses YYYY-MM-DD format for the date key", () => {
      const entries = [
        makeEntry({ start: new Date("2026-02-15T09:00:00Z").getTime() }),
      ];
      const groups = groupByDay(entries);
      // The date key is based on the local time zone date of the start timestamp.
      // We verify the format is YYYY-MM-DD.
      expect(groups[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("generates a human-readable label for the group", () => {
      const entries = [
        makeEntry({ start: new Date("2026-02-15T09:00:00Z").getTime() }),
      ];
      const groups = groupByDay(entries);
      // The label is locale-dependent but should contain the year
      expect(groups[0].label).toBeTruthy();
      expect(typeof groups[0].label).toBe("string");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      const groups = groupByDay([]);
      expect(groups).toEqual([]);
    });

    it("handles a single entry", () => {
      const entries = [makeEntry()];
      const groups = groupByDay(entries);
      expect(groups).toHaveLength(1);
      expect(groups[0].entries).toHaveLength(1);
      expect(groups[0].totalSessions).toBe(1);
    });
  });
});

// =============================================================================
// formatDuration
// =============================================================================

describe("formatDuration", () => {
  // ---------------------------------------------------------------------------
  // Sub-second
  // ---------------------------------------------------------------------------

  describe("sub-second durations", () => {
    it("returns '<1s' for 0ms", () => {
      expect(formatDuration(0)).toBe("<1s");
    });

    it("returns '<1s' for 500ms", () => {
      expect(formatDuration(500)).toBe("<1s");
    });

    it("returns '<1s' for 999ms", () => {
      expect(formatDuration(999)).toBe("<1s");
    });
  });

  // ---------------------------------------------------------------------------
  // Seconds only
  // ---------------------------------------------------------------------------

  describe("seconds only", () => {
    it("returns '1s' for exactly 1000ms", () => {
      expect(formatDuration(1000)).toBe("1s");
    });

    it("returns '30s' for 30000ms", () => {
      expect(formatDuration(30000)).toBe("30s");
    });

    it("returns '59s' for 59999ms", () => {
      expect(formatDuration(59999)).toBe("59s");
    });
  });

  // ---------------------------------------------------------------------------
  // Minutes only
  // ---------------------------------------------------------------------------

  describe("minutes only", () => {
    it("returns '1m' for exactly 60000ms", () => {
      expect(formatDuration(60000)).toBe("1m");
    });

    it("returns '45m' for 45 minutes", () => {
      expect(formatDuration(45 * 60 * 1000)).toBe("45m");
    });

    it("returns '59m' for 59 minutes and some seconds", () => {
      // 59 minutes 30 seconds = 3570000ms
      expect(formatDuration(3570000)).toBe("59m");
    });
  });

  // ---------------------------------------------------------------------------
  // Hours
  // ---------------------------------------------------------------------------

  describe("hours", () => {
    it("returns '1h' for exactly 1 hour", () => {
      expect(formatDuration(3600000)).toBe("1h");
    });

    it("returns '2h 30m' for 2.5 hours", () => {
      expect(formatDuration(2.5 * 3600000)).toBe("2h 30m");
    });

    it("returns '3h 5m' for 3 hours 5 minutes", () => {
      expect(formatDuration(3 * 3600000 + 5 * 60000)).toBe("3h 5m");
    });

    it("returns '24h' for exactly 24 hours", () => {
      expect(formatDuration(24 * 3600000)).toBe("24h");
    });

    it("omits minutes when they are zero", () => {
      expect(formatDuration(2 * 3600000)).toBe("2h");
    });

    it("ignores leftover seconds when hours are present", () => {
      // 1 hour, 0 minutes, 45 seconds -> "1h" (seconds ignored when hours > 0)
      expect(formatDuration(3600000 + 45000)).toBe("1h");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns '<1s' for negative values", () => {
      expect(formatDuration(-100)).toBe("<1s");
    });
  });
});

// =============================================================================
// formatTokens
// =============================================================================

describe("formatTokens", () => {
  // ---------------------------------------------------------------------------
  // Below 1,000
  // ---------------------------------------------------------------------------

  describe("below 1,000", () => {
    it("returns '0' for zero tokens", () => {
      expect(formatTokens(0)).toBe("0");
    });

    it("returns '500' for 500 tokens", () => {
      expect(formatTokens(500)).toBe("500");
    });

    it("returns '999' for 999 tokens", () => {
      expect(formatTokens(999)).toBe("999");
    });
  });

  // ---------------------------------------------------------------------------
  // Thousands (k)
  // ---------------------------------------------------------------------------

  describe("thousands", () => {
    it("returns '1.0k' for exactly 1000 tokens", () => {
      expect(formatTokens(1000)).toBe("1.0k");
    });

    it("returns '1.2k' for 1200 tokens", () => {
      expect(formatTokens(1200)).toBe("1.2k");
    });

    it("returns '9.9k' for 9900 tokens", () => {
      expect(formatTokens(9900)).toBe("9.9k");
    });

    it("returns '10k' for 10000 tokens (no decimal for >= 10k)", () => {
      expect(formatTokens(10000)).toBe("10k");
    });

    it("returns '65k' for 65000 tokens", () => {
      expect(formatTokens(65000)).toBe("65k");
    });

    it("returns '999k' for 999000 tokens", () => {
      expect(formatTokens(999000)).toBe("999k");
    });
  });

  // ---------------------------------------------------------------------------
  // Millions (M)
  // ---------------------------------------------------------------------------

  describe("millions", () => {
    it("returns '1.0M' for exactly 1,000,000 tokens", () => {
      expect(formatTokens(1_000_000)).toBe("1.0M");
    });

    it("returns '1.5M' for 1,500,000 tokens", () => {
      expect(formatTokens(1_500_000)).toBe("1.5M");
    });

    it("returns '10.0M' for 10,000,000 tokens", () => {
      expect(formatTokens(10_000_000)).toBe("10.0M");
    });
  });
});

// =============================================================================
// computeBarPosition
// =============================================================================

describe("computeBarPosition", () => {
  // ---------------------------------------------------------------------------
  // Basic positioning
  // ---------------------------------------------------------------------------

  describe("basic positioning", () => {
    it("returns left=0, width=100 when entry spans the entire day", () => {
      const entry = makeEntry({
        start: 1000,
        durationMs: 1000,
      });
      const result = computeBarPosition(entry, 1000, 2000);
      expect(result.left).toBe(0);
      expect(result.width).toBe(100);
    });

    it("positions entry in the middle of the day range", () => {
      const dayStart = 0;
      const dayEnd = 1000;
      const entry = makeEntry({
        start: 250,
        durationMs: 500,
      });
      const result = computeBarPosition(entry, dayStart, dayEnd);
      expect(result.left).toBe(25);
      expect(result.width).toBe(50);
    });

    it("positions entry at the start of the day range", () => {
      const dayStart = 0;
      const dayEnd = 1000;
      const entry = makeEntry({
        start: 0,
        durationMs: 200,
      });
      const result = computeBarPosition(entry, dayStart, dayEnd);
      expect(result.left).toBe(0);
      expect(result.width).toBe(20);
    });

    it("positions entry at the end of the day range", () => {
      const dayStart = 0;
      const dayEnd = 1000;
      const entry = makeEntry({
        start: 800,
        durationMs: 200,
      });
      const result = computeBarPosition(entry, dayStart, dayEnd);
      expect(result.left).toBe(80);
      expect(result.width).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // Minimum width enforcement
  // ---------------------------------------------------------------------------

  describe("minimum width enforcement", () => {
    it("enforces minimum 2% width for very short entries", () => {
      const dayStart = 0;
      const dayEnd = 100000;
      const entry = makeEntry({
        start: 50000,
        durationMs: 1, // tiny duration
      });
      const result = computeBarPosition(entry, dayStart, dayEnd);
      expect(result.width).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Clamping
  // ---------------------------------------------------------------------------

  describe("clamping", () => {
    it("clamps left to 0 when entry starts before dayStart", () => {
      const entry = makeEntry({
        start: -100,
        durationMs: 500,
      });
      const result = computeBarPosition(entry, 0, 1000);
      expect(result.left).toBe(0);
    });

    it("clamps width so left + width does not exceed 100", () => {
      const entry = makeEntry({
        start: 900,
        durationMs: 500, // extends beyond dayEnd
      });
      const result = computeBarPosition(entry, 0, 1000);
      expect(result.left).toBe(90);
      expect(result.left + result.width).toBeLessThanOrEqual(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("returns left=0, width=100 when dayStart equals dayEnd (zero range)", () => {
      const entry = makeEntry({ start: 1000, durationMs: 500 });
      const result = computeBarPosition(entry, 1000, 1000);
      expect(result.left).toBe(0);
      expect(result.width).toBe(100);
    });

    it("returns left=0, width=100 when range is negative", () => {
      const entry = makeEntry({ start: 1000, durationMs: 500 });
      const result = computeBarPosition(entry, 2000, 1000);
      expect(result.left).toBe(0);
      expect(result.width).toBe(100);
    });
  });
});

// =============================================================================
// getEntryColor
// =============================================================================

describe("getEntryColor", () => {
  // ---------------------------------------------------------------------------
  // Color by label
  // ---------------------------------------------------------------------------

  describe("color by label", () => {
    it("returns bg-purple-500 for submission:* labels", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: ["submission:ready"] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-purple-500");
    });

    it("returns bg-purple-500 for any submission: prefix variant", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: ["submission:in-review"] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-purple-500");
    });

    it("returns bg-amber-500 for development label", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: ["development"] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-amber-500");
    });

    it("returns bg-blue-500 for research label", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: ["research"] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-blue-500");
    });
  });

  // ---------------------------------------------------------------------------
  // Color by issue type
  // ---------------------------------------------------------------------------

  describe("color by issue type", () => {
    it("returns bg-green-500 for epic issue type", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", issue_type: "epic" }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-green-500");
    });
  });

  // ---------------------------------------------------------------------------
  // Default color
  // ---------------------------------------------------------------------------

  describe("default color", () => {
    it("returns bg-cyan-500 when no matching labels and not an epic", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: ["backend", "infra"] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-cyan-500");
    });

    it("returns bg-cyan-500 when labels are undefined", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: undefined }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-cyan-500");
    });

    it("returns bg-cyan-500 when labels array is empty", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({ id: "app-1", labels: [] }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-cyan-500");
    });
  });

  // ---------------------------------------------------------------------------
  // Unknown issue
  // ---------------------------------------------------------------------------

  describe("unknown issue", () => {
    it("returns bg-gray-500 when issue is not in the map", () => {
      expect(getEntryColor("unknown-issue", {})).toBe("bg-gray-500");
    });
  });

  // ---------------------------------------------------------------------------
  // Priority order
  // ---------------------------------------------------------------------------

  describe("priority order", () => {
    it("submission takes priority over development", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({
          id: "app-1",
          labels: ["development", "submission:ready"],
        }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-purple-500");
    });

    it("submission takes priority over research", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({
          id: "app-1",
          labels: ["research", "submission:pending"],
        }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-purple-500");
    });

    it("development takes priority over research", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({
          id: "app-1",
          labels: ["research", "development"],
        }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-amber-500");
    });

    it("labels take priority over epic issue type", () => {
      const issueMap: Record<string, PlanIssue> = {
        "app-1": makePlanIssue({
          id: "app-1",
          issue_type: "epic",
          labels: ["development"],
        }),
      };
      expect(getEntryColor("app-1", issueMap)).toBe("bg-amber-500");
    });
  });
});
