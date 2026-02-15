"use client";

import { useMemo } from "react";
import { FleetBoard } from "@/components/fleet/FleetBoard";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useIssues } from "@/hooks/useIssues";

export default function FleetPage() {
  const { data, isLoading, error, refetch } = useIssues();

  const allIssues = useMemo(() => data?.all_issues ?? [], [data]);
  const epicCount = useMemo(
    () => allIssues.filter((i) => i.issue_type === "epic").length,
    [allIssues],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">App Fleet</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Factory pipeline — apps tracked as epics through build stages
          </p>
        </div>
        {data && (
          <span className="text-sm text-gray-400">
            {epicCount} app{epicCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <ErrorState
          message="Failed to load issues"
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => refetch()}
        />
      )}

      {isLoading && (
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {Array.from({ length: 5 }).map((_, col) => (
            <div
              key={col}
              className="min-w-[280px] max-w-[320px] flex-shrink-0 space-y-2"
            >
              <div className="h-8 w-32 animate-pulse bg-surface-2 rounded mb-3" />
              {Array.from({ length: 2 }).map((_, row) => (
                <CardSkeleton key={row} />
              ))}
            </div>
          ))}
        </div>
      )}

      {data && <FleetBoard issues={allIssues} />}

      {data && epicCount === 0 && (
        <div className="flex-1 flex items-center justify-center">
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
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">
              No apps in the fleet
            </h3>
            <p className="text-xs text-gray-500">
              Create an epic to track an app through the factory pipeline.
              Children with &quot;research&quot;, &quot;development&quot;, or
              &quot;submission:*&quot; labels will advance the app through
              stages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
