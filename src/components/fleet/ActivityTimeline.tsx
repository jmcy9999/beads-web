"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TokenUsageRecord, PlanIssue } from "@/lib/types";
import {
  buildTimelineEntries,
  groupByDay,
  formatDuration,
  formatTokens,
  computeBarPosition,
  getEntryColor,
  type TimelineEntry,
  type DayGroup,
} from "./timeline-utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActivityTimelineProps {
  records: TokenUsageRecord[];
  issueMap: Record<string, PlanIssue>;
  /** Max number of days to show initially. Default 7. */
  initialDays?: number;
  /** If true, shows issue links. Default true. */
  showIssueLinks?: boolean;
}

// ---------------------------------------------------------------------------
// Tooltip for timeline bar
// ---------------------------------------------------------------------------

function EntryTooltip({ entry }: { entry: TimelineEntry }) {
  const startTime = new Date(entry.start).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(entry.end).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none">
      <div className="bg-surface-3 border border-border-default rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium text-white truncate mb-1">{entry.issueTitle}</p>
        <p className="text-gray-400 font-mono mb-2">{entry.issueId}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-300">
          <span className="text-gray-500">Time</span>
          <span>{startTime} - {endTime}</span>
          <span className="text-gray-500">Duration</span>
          <span>{formatDuration(entry.durationMs)}</span>
          <span className="text-gray-500">Tokens</span>
          <span>{formatTokens(entry.tokens)}</span>
          <span className="text-gray-500">Cost</span>
          <span className="text-amber-400">${entry.cost.toFixed(2)}</span>
          <span className="text-gray-500">Turns</span>
          <span>{entry.turns}</span>
          <span className="text-gray-500">Model</span>
          <span className="truncate">{entry.model.replace(/^claude-/, "")}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single day row
// ---------------------------------------------------------------------------

function DayRow({
  group,
  issueMap,
  showIssueLinks,
}: {
  group: DayGroup;
  issueMap: Record<string, PlanIssue>;
  showIssueLinks: boolean;
}) {
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);

  // Compute day time range (earliest start to latest end)
  const dayStart = Math.min(...group.entries.map((e) => e.start));
  const dayEnd = Math.max(...group.entries.map((e) => e.end));

  // Time axis labels
  const startLabel = new Date(dayStart).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = new Date(dayEnd).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-1.5">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-300">{group.label}</span>
          <span className="text-[10px] text-gray-500">
            {group.totalSessions} session{group.totalSessions !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>{formatDuration(group.totalDuration)}</span>
          <span className="font-mono text-amber-400/70">${group.totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Timeline bar area */}
      <div className="relative h-8 bg-surface-1 rounded-md border border-border-default overflow-visible">
        {group.entries.map((entry) => {
          const pos = computeBarPosition(entry, dayStart, dayEnd);
          const colorClass = getEntryColor(entry.issueId, issueMap);
          const isHovered = hoveredEntry === entry.sessionId;

          return (
            <div
              key={entry.sessionId}
              className="absolute top-1 bottom-1 group"
              style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
              onMouseEnter={() => setHoveredEntry(entry.sessionId)}
              onMouseLeave={() => setHoveredEntry(null)}
            >
              <div
                className={`h-full rounded-sm ${colorClass} opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
              />
              {isHovered && <EntryTooltip entry={entry} />}
            </div>
          );
        })}
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-[10px] text-gray-600 font-mono px-0.5">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>

      {/* Session list (compact) */}
      <div className="space-y-0.5">
        {group.entries.map((entry) => (
          <div
            key={entry.sessionId}
            className="flex items-center gap-2 text-xs py-0.5 px-1 rounded hover:bg-surface-1 transition-colors"
            onMouseEnter={() => setHoveredEntry(entry.sessionId)}
            onMouseLeave={() => setHoveredEntry(null)}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${getEntryColor(entry.issueId, issueMap)}`}
            />
            {showIssueLinks ? (
              <Link
                href={`/issue/${entry.issueId}`}
                className="text-blue-400 hover:text-blue-300 hover:underline font-mono shrink-0"
              >
                {entry.issueId}
              </Link>
            ) : (
              <span className="text-gray-400 font-mono shrink-0">{entry.issueId}</span>
            )}
            <span className="text-gray-300 truncate flex-1">{entry.issueTitle}</span>
            <span className="text-gray-500 shrink-0">{formatDuration(entry.durationMs)}</span>
            <span className="text-gray-500 shrink-0">{formatTokens(entry.tokens)} tok</span>
            <span className="text-amber-400/70 font-mono shrink-0">${entry.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityTimeline({
  records,
  issueMap,
  initialDays = 7,
  showIssueLinks = true,
}: ActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  const entries = useMemo(
    () => buildTimelineEntries(records, issueMap),
    [records, issueMap],
  );

  const dayGroups = useMemo(() => groupByDay(entries), [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500">No agent activity recorded yet.</p>
      </div>
    );
  }

  // Show most recent days first
  const reversed = [...dayGroups].reverse();
  const visible = showAll ? reversed : reversed.slice(0, initialDays);
  const hasMore = reversed.length > initialDays;

  // Summary stats
  const totalSessions = entries.length;
  const totalDuration = entries.reduce((s, e) => s + e.durationMs, 0);
  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  const totalTokens = entries.reduce((s, e) => s + e.tokens, 0);
  const uniqueIssues = new Set(entries.map((e) => e.issueId)).size;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
        <span>
          <span className="text-white font-medium">{totalSessions}</span> session{totalSessions !== 1 ? "s" : ""}
        </span>
        <span>
          <span className="text-white font-medium">{formatDuration(totalDuration)}</span> total
        </span>
        <span>
          <span className="text-white font-medium">{formatTokens(totalTokens)}</span> tokens
        </span>
        <span className="font-mono">
          <span className="text-amber-400 font-medium">${totalCost.toFixed(2)}</span> cost
        </span>
        <span>
          <span className="text-white font-medium">{uniqueIssues}</span> issue{uniqueIssues !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Day groups */}
      <div className="space-y-6">
        {visible.map((group) => (
          <DayRow
            key={group.date}
            group={group}
            issueMap={issueMap}
            showIssueLinks={showIssueLinks}
          />
        ))}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAll
            ? "Show less"
            : `Show ${reversed.length - initialDays} more day${reversed.length - initialDays !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
