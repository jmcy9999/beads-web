import { FleetCard } from "./FleetCard";
import {
  FLEET_STAGE_CONFIG,
  type FleetApp,
  type FleetStage,
  type EpicCost,
} from "./fleet-utils";

interface FleetColumnProps {
  stage: FleetStage;
  apps: FleetApp[];
  epicCosts?: Map<string, EpicCost>;
  onLaunchAgent?: (epicId: string, epicTitle: string) => void;
  agentRunning?: boolean;
}

export function FleetColumn({ stage, apps, epicCosts, onLaunchAgent, agentRunning }: FleetColumnProps) {
  const config = FLEET_STAGE_CONFIG[stage];

  return (
    <div className="min-w-[280px] max-w-[320px] flex-shrink-0 flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2 mb-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${config.dotColor}`}
          aria-hidden="true"
        />
        <h2 className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </h2>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-gray-400">
          {apps.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1">
        {apps.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">No apps</p>
        ) : (
          apps.map((app) => (
            <FleetCard
              key={app.epic.id}
              app={app}
              cost={epicCosts?.get(app.epic.id)}
              onLaunchAgent={onLaunchAgent}
              agentRunning={agentRunning}
            />
          ))
        )}
      </div>
    </div>
  );
}
