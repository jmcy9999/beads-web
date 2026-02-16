"use client";

import { useMemo } from "react";
import { ActivityTimeline } from "@/components/fleet/ActivityTimeline";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useIssues } from "@/hooks/useIssues";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import type { PlanIssue } from "@/lib/types";

export default function ActivityPage() {
  const { data: issuesData, isLoading: issuesLoading, error: issuesError, refetch: refetchIssues } = useIssues();
  const { data: tokenRecords, isLoading: tokensLoading, error: tokensError, refetch: refetchTokens } = useTokenUsage();

  const isLoading = issuesLoading || tokensLoading;
  const error = issuesError || tokensError;

  const allIssues = useMemo(() => issuesData?.all_issues ?? [], [issuesData]);

  const issueMap = useMemo(() => {
    const map: Record<string, PlanIssue> = {};
    for (const issue of allIssues) {
      map[issue.id] = issue;
    }
    return map;
  }, [allIssues]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Activity</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Timeline of agent sessions across all tracked issues
        </p>
      </div>

      {error && (
        <ErrorState
          message="Failed to load activity data"
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => {
            refetchIssues();
            refetchTokens();
          }}
        />
      )}

      {isLoading && (
        <div className="card p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !error && tokenRecords && tokenRecords.length > 0 && (
        <section className="card p-5">
          <ActivityTimeline
            records={tokenRecords}
            issueMap={issueMap}
            initialDays={14}
          />
        </section>
      )}

      {!isLoading && !error && (!tokenRecords || tokenRecords.length === 0) && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">
              No activity recorded yet
            </h3>
            <p className="text-xs text-gray-500">
              Agent session data will appear here as agents work on issues.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
