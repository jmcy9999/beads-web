// =============================================================================
// Tests for src/components/fleet/fleet-utils.ts — detectStage & buildFleetApps
// =============================================================================

import { detectStage, buildFleetApps } from "@/components/fleet/fleet-utils";
import type { PlanIssue } from "@/lib/types";

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

// =============================================================================
// detectStage
// =============================================================================

describe("detectStage", () => {
  // ---------------------------------------------------------------------------
  // Completed — epic is closed
  // ---------------------------------------------------------------------------

  describe("completed stage", () => {
    it("returns 'completed' when the epic is closed", () => {
      const epic = makePlanIssue({ id: "E-1", status: "closed", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
      ];
      expect(detectStage(epic, children)).toBe("completed");
    });

    it("returns 'completed' when the epic is closed even with no children", () => {
      const epic = makePlanIssue({ id: "E-1", status: "closed", issue_type: "epic" });
      expect(detectStage(epic, [])).toBe("completed");
    });

    it("returns 'completed' regardless of children labels when epic is closed", () => {
      const epic = makePlanIssue({ id: "E-1", status: "closed", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["submission:ready"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("completed");
    });
  });

  // ---------------------------------------------------------------------------
  // Submission — any active child has submission:* label
  // ---------------------------------------------------------------------------

  describe("submission stage", () => {
    it("returns 'submission' when a child has a submission: label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["submission:ready"] }),
      ];
      expect(detectStage(epic, children)).toBe("submission");
    });

    it("returns 'submission' for any submission: prefix variant", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["submission:in-review"] }),
      ];
      expect(detectStage(epic, children)).toBe("submission");
    });

    it("returns 'submission' when mixed with development and research labels", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["development"] }),
        makePlanIssue({ id: "C-3", epic: "E-1", labels: ["submission:pending"] }),
      ];
      expect(detectStage(epic, children)).toBe("submission");
    });
  });

  // ---------------------------------------------------------------------------
  // Development — any non-closed child has "development" label
  // ---------------------------------------------------------------------------

  describe("development stage", () => {
    it("returns 'development' when a child has the development label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("development");
    });

    it("returns 'development' when mixed with research (development wins)", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("development");
    });
  });

  // ---------------------------------------------------------------------------
  // Research — any non-closed child has "research" label
  // ---------------------------------------------------------------------------

  describe("research stage", () => {
    it("returns 'research' when a child has the research label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
      ];
      expect(detectStage(epic, children)).toBe("research");
    });

    it("returns 'research' when children have research and unrelated labels", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research", "backend"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["infra"] }),
      ];
      expect(detectStage(epic, children)).toBe("research");
    });
  });

  // ---------------------------------------------------------------------------
  // Idea — default fallback
  // ---------------------------------------------------------------------------

  describe("idea stage (default)", () => {
    it("returns 'idea' when epic has no children", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      expect(detectStage(epic, [])).toBe("idea");
    });

    it("returns 'idea' when children have no matching labels", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["backend"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["infra"] }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });

    it("returns 'idea' when children have no labels at all", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1" }),
        makePlanIssue({ id: "C-2", epic: "E-1" }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });

    it("returns 'idea' when children have null labels", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: undefined }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });
  });

  // ---------------------------------------------------------------------------
  // Priority order: submission > development > research
  // ---------------------------------------------------------------------------

  describe("priority order", () => {
    it("submission takes priority over development", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["development"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["submission:beta"] }),
      ];
      expect(detectStage(epic, children)).toBe("submission");
    });

    it("submission takes priority over research", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["submission:review"] }),
      ];
      expect(detectStage(epic, children)).toBe("submission");
    });

    it("development takes priority over research", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", epic: "E-1", labels: ["research"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("development");
    });
  });

  // ---------------------------------------------------------------------------
  // Ignores closed children when detecting stage
  // ---------------------------------------------------------------------------

  describe("ignores closed children", () => {
    it("ignores a closed child with submission label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", status: "closed", epic: "E-1", labels: ["submission:done"] }),
        makePlanIssue({ id: "C-2", epic: "E-1", labels: ["research"] }),
      ];
      expect(detectStage(epic, children)).toBe("research");
    });

    it("ignores a closed child with development label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", status: "closed", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });

    it("ignores a closed child with research label", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", status: "closed", epic: "E-1", labels: ["research"] }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });

    it("falls back to idea when all labeled children are closed", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", status: "closed", epic: "E-1", labels: ["submission:done"] }),
        makePlanIssue({ id: "C-2", status: "closed", epic: "E-1", labels: ["development"] }),
        makePlanIssue({ id: "C-3", status: "closed", epic: "E-1", labels: ["research"] }),
      ];
      expect(detectStage(epic, children)).toBe("idea");
    });

    it("considers only open children for stage detection", () => {
      const epic = makePlanIssue({ id: "E-1", issue_type: "epic" });
      const children = [
        makePlanIssue({ id: "C-1", status: "closed", epic: "E-1", labels: ["submission:done"] }),
        makePlanIssue({ id: "C-2", status: "in_progress", epic: "E-1", labels: ["development"] }),
      ];
      expect(detectStage(epic, children)).toBe("development");
    });
  });
});

// =============================================================================
// buildFleetApps
// =============================================================================

describe("buildFleetApps", () => {
  // ---------------------------------------------------------------------------
  // Extracts only epic-type issues
  // ---------------------------------------------------------------------------

  describe("epic extraction", () => {
    it("extracts only epic-type issues", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", title: "App Alpha" }),
        makePlanIssue({ id: "T-1", issue_type: "task", title: "Task 1" }),
        makePlanIssue({ id: "B-1", issue_type: "bug", title: "Bug 1" }),
        makePlanIssue({ id: "F-1", issue_type: "feature", title: "Feature 1" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps).toHaveLength(1);
      expect(apps[0].epic.id).toBe("E-1");
    });

    it("extracts multiple epics", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", title: "App Alpha" }),
        makePlanIssue({ id: "E-2", issue_type: "epic", title: "App Beta" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps).toHaveLength(2);
      expect(apps.map((a) => a.epic.id).sort()).toEqual(["E-1", "E-2"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Returns empty array when no epics
  // ---------------------------------------------------------------------------

  describe("no epics", () => {
    it("returns empty array when no epics exist", () => {
      const issues = [
        makePlanIssue({ id: "T-1", issue_type: "task" }),
        makePlanIssue({ id: "B-1", issue_type: "bug" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      const apps = buildFleetApps([]);
      expect(apps).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Groups children correctly by epic
  // ---------------------------------------------------------------------------

  describe("children grouping", () => {
    it("groups children by their epic field", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", title: "Alpha" }),
        makePlanIssue({ id: "E-2", issue_type: "epic", title: "Beta" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1" }),
        makePlanIssue({ id: "T-2", issue_type: "task", epic: "E-1" }),
        makePlanIssue({ id: "T-3", issue_type: "task", epic: "E-2" }),
      ];
      const apps = buildFleetApps(issues);

      const alphaApp = apps.find((a) => a.epic.id === "E-1")!;
      const betaApp = apps.find((a) => a.epic.id === "E-2")!;

      expect(alphaApp.children).toHaveLength(2);
      expect(alphaApp.children.map((c) => c.id).sort()).toEqual(["T-1", "T-2"]);
      expect(betaApp.children).toHaveLength(1);
      expect(betaApp.children[0].id).toBe("T-3");
    });

    it("returns empty children for an epic with no child issues", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", title: "Lonely Epic" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].children).toEqual([]);
    });

    it("does not include issues without an epic field as children", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
        makePlanIssue({ id: "T-1", issue_type: "task" }), // no epic field
        makePlanIssue({ id: "T-2", issue_type: "task", epic: "E-1" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].children).toHaveLength(1);
      expect(apps[0].children[0].id).toBe("T-2");
    });
  });

  // ---------------------------------------------------------------------------
  // Computes progress (closed / total children)
  // ---------------------------------------------------------------------------

  describe("progress computation", () => {
    it("computes progress with some closed children", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", status: "closed" }),
        makePlanIssue({ id: "T-2", issue_type: "task", epic: "E-1", status: "open" }),
        makePlanIssue({ id: "T-3", issue_type: "task", epic: "E-1", status: "closed" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].progress).toEqual({ closed: 2, total: 3 });
    });

    it("computes progress with all children closed", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", status: "closed" }),
        makePlanIssue({ id: "T-2", issue_type: "task", epic: "E-1", status: "closed" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].progress).toEqual({ closed: 2, total: 2 });
    });

    it("computes progress with no children closed", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", status: "open" }),
        makePlanIssue({ id: "T-2", issue_type: "task", epic: "E-1", status: "in_progress" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].progress).toEqual({ closed: 0, total: 2 });
    });

    it("computes progress as 0/0 for an epic with no children", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].progress).toEqual({ closed: 0, total: 0 });
    });
  });

  // ---------------------------------------------------------------------------
  // Stage detection is wired correctly
  // ---------------------------------------------------------------------------

  describe("stage detection integration", () => {
    it("assigns the correct stage based on children labels", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", labels: ["development"] }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].stage).toBe("development");
    });

    it("assigns 'completed' for a closed epic", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", status: "closed" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", status: "closed" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].stage).toBe("completed");
    });

    it("assigns 'idea' for an epic with no children", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic" }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps[0].stage).toBe("idea");
    });
  });

  // ---------------------------------------------------------------------------
  // Full FleetApp structure
  // ---------------------------------------------------------------------------

  describe("FleetApp structure", () => {
    it("returns objects with epic, children, stage, and progress fields", () => {
      const issues = [
        makePlanIssue({ id: "E-1", issue_type: "epic", title: "My App" }),
        makePlanIssue({ id: "T-1", issue_type: "task", epic: "E-1", labels: ["research"] }),
      ];
      const apps = buildFleetApps(issues);
      expect(apps).toHaveLength(1);

      const app = apps[0];
      expect(app).toHaveProperty("epic");
      expect(app).toHaveProperty("children");
      expect(app).toHaveProperty("stage");
      expect(app).toHaveProperty("progress");
      expect(app.epic.id).toBe("E-1");
      expect(app.children).toHaveLength(1);
      expect(app.stage).toBe("research");
      expect(app.progress).toEqual({ closed: 0, total: 1 });
    });
  });
});
