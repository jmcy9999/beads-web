"use client";

import Link from "next/link";
import { PriorityIndicator } from "@/components/ui/PriorityIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { FleetApp } from "./fleet-utils";

interface FleetCardProps {
  app: FleetApp;
}

export function FleetCard({ app }: FleetCardProps) {
  const { epic, children, progress } = app;
  const pct =
    progress.total > 0
      ? Math.round((progress.closed / progress.total) * 100)
      : 0;

  const inProgress = children.filter(
    (c) => c.status === "in_progress",
  ).length;
  const blocked = children.filter((c) => c.status === "blocked").length;

  // Extract app name from epic title (strip prefix like "LensCycle: " if present)
  const appName = epic.title;

  // Check for submission labels on children
  const submissionLabels = children.flatMap(
    (c) => c.labels?.filter((l) => l.startsWith("submission:")) ?? [],
  );
  const uniqueSubmissionStates = [...new Set(submissionLabels.map((l) => l.slice(11)))];

  const submissionStyles: Record<string, string> = {
    ready: "bg-blue-500/20 text-blue-300",
    "in-review": "bg-amber-500/20 text-amber-300",
    approved: "bg-green-500/20 text-green-300",
    rejected: "bg-red-500/20 text-red-300",
  };

  return (
    <Link
      href={`/issue/${epic.id}`}
      className="card-hover p-3 cursor-pointer block"
    >
      {/* Header: ID + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-gray-400">{epic.id}</span>
        <PriorityIndicator priority={epic.priority} />
      </div>

      {/* App name */}
      <h3 className="text-sm font-medium mb-2 line-clamp-2">{appName}</h3>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="mb-2 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">
            {progress.closed}/{progress.total}
          </span>
        </div>
      )}

      {/* Submission badges */}
      {uniqueSubmissionStates.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {uniqueSubmissionStates.map((state) => (
            <span
              key={state}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${submissionStyles[state] ?? "bg-surface-2 text-gray-300"}`}
            >
              {state}
            </span>
          ))}
        </div>
      )}

      {/* Footer: status + stats */}
      <div className="flex items-center justify-between">
        <StatusBadge status={epic.status} />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {blocked > 0 && (
            <span className="text-status-blocked font-medium">
              {blocked} blocked
            </span>
          )}
          {inProgress > 0 && (
            <span className="text-status-progress">
              {inProgress} active
            </span>
          )}
          {epic.owner && <span>{epic.owner}</span>}
        </div>
      </div>
    </Link>
  );
}
