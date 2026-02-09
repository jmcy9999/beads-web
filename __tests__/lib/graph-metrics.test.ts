// =============================================================================
// Tests for src/lib/graph-metrics.ts — computeInsightsFromIssues
// =============================================================================

import { computeInsightsFromIssues } from "@/lib/graph-metrics";
import {
  TEST_ISSUES,
  TEST_DEPENDENCIES,
  TEST_LABELS,
} from "../fixtures/create-test-db";
import type { BeadsIssue } from "@/lib/types";

// ---------------------------------------------------------------------------
// Build BeadsIssue[] from test fixture constants
// ---------------------------------------------------------------------------

function buildTestIssues(): BeadsIssue[] {
  return TEST_ISSUES.map((issue) => {
    const deps = TEST_DEPENDENCIES.filter(([id]) => id === issue.id).map(
      ([issueId, dependsOn, type]) => ({
        issue_id: issueId,
        depends_on_id: dependsOn,
        type: type as "blocks",
        created_at: "2026-01-01T00:00:00Z",
        created_by: "test",
      }),
    );
    const labels = TEST_LABELS.filter(([id]) => id === issue.id).map(
      ([, label]) => label as string,
    );
    return {
      ...issue,
      status: issue.status as BeadsIssue["status"],
      priority: issue.priority as BeadsIssue["priority"],
      issue_type: issue.issue_type as BeadsIssue["issue_type"],
      labels: labels.length > 0 ? labels : undefined,
      dependencies: deps.length > 0 ? deps : undefined,
    };
  });
}

describe("computeInsightsFromIssues", () => {
  const testIssues = buildTestIssues();
  const PROJECT_PATH = "/test/project";

  // ---------------------------------------------------------------------------
  // Basic structure
  // ---------------------------------------------------------------------------

  describe("return structure", () => {
    it("returns a valid RobotInsights structure", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      expect(insights).toHaveProperty("timestamp");
      expect(insights).toHaveProperty("project_path", PROJECT_PATH);
      expect(insights).toHaveProperty("total_issues");
      expect(insights).toHaveProperty("graph_density");
      expect(insights).toHaveProperty("bottlenecks");
      expect(insights).toHaveProperty("keystones");
      expect(insights).toHaveProperty("influencers");
      expect(insights).toHaveProperty("hubs");
      expect(insights).toHaveProperty("authorities");
      expect(insights).toHaveProperty("cycles");
    });

    it("includes a valid ISO timestamp", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      expect(new Date(insights.timestamp).toISOString()).toBe(insights.timestamp);
    });
  });

  // ---------------------------------------------------------------------------
  // total_issues
  // ---------------------------------------------------------------------------

  describe("total_issues", () => {
    it("matches the input count", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      expect(insights.total_issues).toBe(8);
    });

    it("is 0 for empty input", () => {
      const insights = computeInsightsFromIssues([], PROJECT_PATH);
      expect(insights.total_issues).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // graph_density
  // ---------------------------------------------------------------------------

  describe("graph_density", () => {
    it("is > 0 for issues with dependencies", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      expect(insights.graph_density).toBeGreaterThan(0);
    });

    it("is 0 for issues without dependencies", () => {
      const noDepsIssues: BeadsIssue[] = [
        {
          id: "A",
          title: "Issue A",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "B",
          title: "Issue B",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      const insights = computeInsightsFromIssues(noDepsIssues, PROJECT_PATH);
      expect(insights.graph_density).toBe(0);
    });

    it("is 0 for empty issues", () => {
      const insights = computeInsightsFromIssues([], PROJECT_PATH);
      expect(insights.graph_density).toBe(0);
    });

    it("is 0 for a single issue", () => {
      const single: BeadsIssue[] = [
        {
          id: "ONLY",
          title: "Only issue",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ];
      const insights = computeInsightsFromIssues(single, PROJECT_PATH);
      expect(insights.graph_density).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // bottlenecks (betweenness centrality)
  // ---------------------------------------------------------------------------

  describe("bottlenecks", () => {
    it("contains issues that bridge dependency paths", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const bottleneckIds = insights.bottlenecks.map((b) => b.issue_id);
      // TEST-001 and TEST-006 are central hubs connecting many issues
      // At least one of them should appear as a bottleneck
      const hasKeyNode =
        bottleneckIds.includes("TEST-001") ||
        bottleneckIds.includes("TEST-006");
      expect(hasKeyNode).toBe(true);
    });

    it("each entry has issue_id, title, and score", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (const entry of insights.bottlenecks) {
        expect(entry).toHaveProperty("issue_id");
        expect(entry).toHaveProperty("title");
        expect(entry).toHaveProperty("score");
        expect(typeof entry.score).toBe("number");
        expect(entry.score).toBeGreaterThan(0);
      }
    });

    it("is sorted by score descending", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (let i = 1; i < insights.bottlenecks.length; i++) {
        expect(insights.bottlenecks[i - 1].score).toBeGreaterThanOrEqual(
          insights.bottlenecks[i].score,
        );
      }
    });

    it("is empty for issues without dependencies", () => {
      const noDeps: BeadsIssue[] = [
        {
          id: "A",
          title: "A",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "B",
          title: "B",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "C",
          title: "C",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ];
      const insights = computeInsightsFromIssues(noDeps, PROJECT_PATH);
      expect(insights.bottlenecks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // keystones (transitive unblock count)
  // ---------------------------------------------------------------------------

  describe("keystones", () => {
    it("ranks TEST-001 high (blocks TEST-003, TEST-004, TEST-007 transitively)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const keystoneIds = insights.keystones.map((k) => k.issue_id);
      expect(keystoneIds).toContain("TEST-001");

      // TEST-001 should be in the top entries
      const test001 = insights.keystones.find(
        (k) => k.issue_id === "TEST-001",
      );
      expect(test001).toBeDefined();
      // TEST-001 blocks at least 3 issues (TEST-003, TEST-004, TEST-007)
      expect(test001!.score).toBeGreaterThanOrEqual(3);
    });

    it("ranks TEST-006 high (blocks TEST-002, TEST-007 and transitively)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test006 = insights.keystones.find(
        (k) => k.issue_id === "TEST-006",
      );
      expect(test006).toBeDefined();
      // TEST-006 blocks TEST-002 and TEST-007 directly = at least 2
      expect(test006!.score).toBeGreaterThanOrEqual(2);
    });

    it("is sorted by score descending", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (let i = 1; i < insights.keystones.length; i++) {
        expect(insights.keystones[i - 1].score).toBeGreaterThanOrEqual(
          insights.keystones[i].score,
        );
      }
    });

    it("excludes issues that block nothing (score = 0)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (const k of insights.keystones) {
        expect(k.score).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // authorities (high in-degree — depended upon by many)
  // ---------------------------------------------------------------------------

  describe("authorities", () => {
    it("includes TEST-001 (depended on by 3 issues: TEST-003, TEST-004, TEST-007)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test001 = insights.authorities.find(
        (a) => a.issue_id === "TEST-001",
      );
      expect(test001).toBeDefined();
      expect(test001!.score).toBe(3);
    });

    it("includes TEST-006 (depended on by 2 issues: TEST-002, TEST-007)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test006 = insights.authorities.find(
        (a) => a.issue_id === "TEST-006",
      );
      expect(test006).toBeDefined();
      expect(test006!.score).toBe(2);
    });

    it("does not include issues with 0 in-degree", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (const a of insights.authorities) {
        expect(a.score).toBeGreaterThan(0);
      }
    });

    it("is sorted by score descending", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (let i = 1; i < insights.authorities.length; i++) {
        expect(insights.authorities[i - 1].score).toBeGreaterThanOrEqual(
          insights.authorities[i].score,
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // hubs (high out-degree — depends on many things)
  // ---------------------------------------------------------------------------

  describe("hubs", () => {
    it("includes TEST-007 (depends on 2 issues: TEST-001, TEST-006)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test007 = insights.hubs.find((h) => h.issue_id === "TEST-007");
      expect(test007).toBeDefined();
      expect(test007!.score).toBe(2);
    });

    it("does not include issues with 0 out-degree", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (const h of insights.hubs) {
        expect(h.score).toBeGreaterThan(0);
      }
    });

    it("is sorted by score descending", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (let i = 1; i < insights.hubs.length; i++) {
        expect(insights.hubs[i - 1].score).toBeGreaterThanOrEqual(
          insights.hubs[i].score,
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // influencers (total degree centrality)
  // ---------------------------------------------------------------------------

  describe("influencers", () => {
    it("includes TEST-001 with high degree (3 incoming + 0 outgoing = 3)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test001 = insights.influencers.find(
        (inf) => inf.issue_id === "TEST-001",
      );
      expect(test001).toBeDefined();
      expect(test001!.score).toBeGreaterThanOrEqual(3);
    });

    it("includes TEST-007 with degree 2 (0 incoming + 2 outgoing)", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const test007 = insights.influencers.find(
        (inf) => inf.issue_id === "TEST-007",
      );
      expect(test007).toBeDefined();
      expect(test007!.score).toBeGreaterThanOrEqual(2);
    });

    it("does not include issues with 0 total degree", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      for (const inf of insights.influencers) {
        expect(inf.score).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // cycles
  // ---------------------------------------------------------------------------

  describe("cycles", () => {
    it("is empty for the acyclic test data", () => {
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      expect(insights.cycles).toEqual([]);
    });

    it("detects a cycle when one exists", () => {
      // Create a simple cycle: A -> B -> C -> A
      const cyclicIssues: BeadsIssue[] = [
        {
          id: "CYC-A",
          title: "Cycle A",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          dependencies: [
            {
              issue_id: "CYC-A",
              depends_on_id: "CYC-B",
              type: "blocks",
              created_at: "2026-01-01",
              created_by: "test",
            },
          ],
        },
        {
          id: "CYC-B",
          title: "Cycle B",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          dependencies: [
            {
              issue_id: "CYC-B",
              depends_on_id: "CYC-C",
              type: "blocks",
              created_at: "2026-01-01",
              created_by: "test",
            },
          ],
        },
        {
          id: "CYC-C",
          title: "Cycle C",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          dependencies: [
            {
              issue_id: "CYC-C",
              depends_on_id: "CYC-A",
              type: "blocks",
              created_at: "2026-01-01",
              created_by: "test",
            },
          ],
        },
      ];

      const insights = computeInsightsFromIssues(cyclicIssues, PROJECT_PATH);
      expect(insights.cycles.length).toBeGreaterThanOrEqual(1);
      // The cycle should contain all 3 nodes
      const cycle = insights.cycles[0];
      expect(cycle.length).toBe(3);
      expect(cycle.issues.sort()).toEqual(["CYC-A", "CYC-B", "CYC-C"]);
      expect(cycle.cycle_id).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("empty issues array returns zero metrics", () => {
      const insights = computeInsightsFromIssues([], PROJECT_PATH);
      expect(insights.total_issues).toBe(0);
      expect(insights.graph_density).toBe(0);
      expect(insights.bottlenecks).toEqual([]);
      expect(insights.keystones).toEqual([]);
      expect(insights.influencers).toEqual([]);
      expect(insights.hubs).toEqual([]);
      expect(insights.authorities).toEqual([]);
      expect(insights.cycles).toEqual([]);
    });

    it("issues with no dependencies have empty metrics but correct total_issues", () => {
      const noDeps: BeadsIssue[] = [
        {
          id: "ND-1",
          title: "No deps 1",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "ND-2",
          title: "No deps 2",
          status: "in_progress",
          priority: 2,
          issue_type: "bug",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "ND-3",
          title: "No deps 3",
          status: "open",
          priority: 3,
          issue_type: "feature",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ];
      const insights = computeInsightsFromIssues(noDeps, PROJECT_PATH);
      expect(insights.total_issues).toBe(3);
      expect(insights.graph_density).toBe(0);
      expect(insights.bottlenecks).toEqual([]);
      expect(insights.keystones).toEqual([]);
      expect(insights.hubs).toEqual([]);
      expect(insights.authorities).toEqual([]);
    });

    it("closed issues are excluded from live graph computations", () => {
      // TEST-005 is closed — it should not appear in any metric
      const insights = computeInsightsFromIssues(testIssues, PROJECT_PATH);
      const allMetricIds = [
        ...insights.bottlenecks.map((b) => b.issue_id),
        ...insights.keystones.map((k) => k.issue_id),
        ...insights.influencers.map((i) => i.issue_id),
        ...insights.hubs.map((h) => h.issue_id),
        ...insights.authorities.map((a) => a.issue_id),
      ];
      expect(allMetricIds).not.toContain("TEST-005");
    });

    it("dependencies referencing non-existent issues are ignored", () => {
      const issuesWithBadDep: BeadsIssue[] = [
        {
          id: "GOOD-1",
          title: "Good issue",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          dependencies: [
            {
              issue_id: "GOOD-1",
              depends_on_id: "NONEXISTENT",
              type: "blocks",
              created_at: "2026-01-01",
              created_by: "test",
            },
          ],
        },
      ];
      const insights = computeInsightsFromIssues(
        issuesWithBadDep,
        PROJECT_PATH,
      );
      // Should not crash and density should be 0
      expect(insights.total_issues).toBe(1);
      expect(insights.graph_density).toBe(0);
    });

    it("parent-child dependencies are ignored", () => {
      const parentChildIssues: BeadsIssue[] = [
        {
          id: "P-1",
          title: "Parent",
          status: "open",
          priority: 1,
          issue_type: "epic",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        {
          id: "C-1",
          title: "Child",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          dependencies: [
            {
              issue_id: "C-1",
              depends_on_id: "P-1",
              type: "parent-child",
              created_at: "2026-01-01",
              created_by: "test",
            },
          ],
        },
      ];
      const insights = computeInsightsFromIssues(
        parentChildIssues,
        PROJECT_PATH,
      );
      // parent-child deps are skipped, so density should be 0
      expect(insights.graph_density).toBe(0);
      expect(insights.authorities).toEqual([]);
      expect(insights.hubs).toEqual([]);
    });
  });
});
