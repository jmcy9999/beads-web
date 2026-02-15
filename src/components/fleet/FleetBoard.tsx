import { FleetColumn } from "./FleetColumn";
import {
  FLEET_STAGES,
  buildFleetApps,
  type FleetStage,
  type EpicCost,
} from "./fleet-utils";
import type { PlanIssue } from "@/lib/types";

interface FleetBoardProps {
  issues: PlanIssue[];
  epicCosts?: Map<string, EpicCost>;
  onLaunchAgent?: (epicId: string, epicTitle: string) => void;
  agentRunning?: boolean;
}

export function FleetBoard({ issues, epicCosts, onLaunchAgent, agentRunning }: FleetBoardProps) {
  const apps = buildFleetApps(issues);

  const grouped = new Map<FleetStage, typeof apps>();
  for (const stage of FLEET_STAGES) {
    grouped.set(stage, []);
  }
  for (const app of apps) {
    grouped.get(app.stage)!.push(app);
  }

  // Sort each column by priority (P0 first)
  for (const [, bucket] of Array.from(grouped)) {
    bucket.sort((a, b) => a.epic.priority - b.epic.priority);
  }

  return (
    <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
      {FLEET_STAGES.map((stage) => (
        <FleetColumn
          key={stage}
          stage={stage}
          apps={grouped.get(stage) ?? []}
          epicCosts={epicCosts}
          onLaunchAgent={onLaunchAgent}
          agentRunning={agentRunning}
        />
      ))}
    </div>
  );
}
