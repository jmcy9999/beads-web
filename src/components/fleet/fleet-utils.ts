import type { PlanIssue } from "@/lib/types";

/** Pipeline stages for the factory fleet view. */
export type FleetStage =
  | "idea"
  | "research"
  | "development"
  | "submission"
  | "completed";

export const FLEET_STAGES: FleetStage[] = [
  "idea",
  "research",
  "development",
  "submission",
  "completed",
];

export const FLEET_STAGE_CONFIG: Record<
  FleetStage,
  { label: string; color: string; dotColor: string }
> = {
  idea: { label: "Idea", color: "text-gray-400", dotColor: "bg-gray-400" },
  research: {
    label: "Research",
    color: "text-blue-400",
    dotColor: "bg-blue-400",
  },
  development: {
    label: "Development",
    color: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  submission: {
    label: "Submission",
    color: "text-purple-400",
    dotColor: "bg-purple-400",
  },
  completed: {
    label: "Completed",
    color: "text-green-400",
    dotColor: "bg-green-400",
  },
};

export interface FleetApp {
  epic: PlanIssue;
  children: PlanIssue[];
  stage: FleetStage;
  progress: { closed: number; total: number };
}

/**
 * Determine which pipeline stage an epic is in based on its children's labels and statuses.
 *
 * Priority (highest active stage wins):
 * 1. Completed — epic is closed
 * 2. Submission — any child has a submission:* label and is not closed
 * 3. Development — any non-closed child has "development" label
 * 4. Research — any non-closed child has "research" label
 * 5. Idea — default (new epic, no matching children)
 */
export function detectStage(
  epic: PlanIssue,
  children: PlanIssue[],
): FleetStage {
  if (epic.status === "closed") return "completed";

  const activeChildren = children.filter((c) => c.status !== "closed");

  const hasSubmission = activeChildren.some(
    (c) => c.labels?.some((l) => l.startsWith("submission:")) ?? false,
  );
  if (hasSubmission) return "submission";

  const hasDevelopment = activeChildren.some(
    (c) => c.labels?.includes("development") ?? false,
  );
  if (hasDevelopment) return "development";

  const hasResearch = activeChildren.some(
    (c) => c.labels?.includes("research") ?? false,
  );
  if (hasResearch) return "research";

  return "idea";
}

/**
 * Extract fleet apps from the full issue list.
 * An "app" is any epic-type issue.
 */
export function buildFleetApps(allIssues: PlanIssue[]): FleetApp[] {
  const epics = allIssues.filter((i) => i.issue_type === "epic");

  return epics.map((epic) => {
    const children = allIssues.filter((i) => i.epic === epic.id);
    const stage = detectStage(epic, children);
    const closed = children.filter((c) => c.status === "closed").length;
    return {
      epic,
      children,
      stage,
      progress: { closed, total: children.length },
    };
  });
}
