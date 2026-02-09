// =============================================================================
// Tests for src/app/api/insights/route.ts — GET /api/insights
// =============================================================================

import type { RobotInsights } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/repo-config", () => ({
  getActiveProjectPath: jest.fn(),
}));

jest.mock("@/lib/bv-client", () => ({
  getInsights: jest.fn(),
}));

import { GET } from "@/app/api/insights/route";
import { getActiveProjectPath } from "@/lib/repo-config";
import { getInsights } from "@/lib/bv-client";

const mockGetActiveProjectPath = getActiveProjectPath as jest.MockedFunction<
  typeof getActiveProjectPath
>;
const mockGetInsights = getInsights as jest.MockedFunction<typeof getInsights>;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_PROJECT_PATH = "/tmp/test-project";

const MOCK_INSIGHTS: RobotInsights = {
  timestamp: "2026-01-15T00:00:00Z",
  project_path: TEST_PROJECT_PATH,
  total_issues: 8,
  graph_density: 0.15,
  bottlenecks: [{ issue_id: "TEST-001", title: "Auth", score: 3.5 }],
  keystones: [],
  influencers: [],
  hubs: [],
  authorities: [],
  cycles: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/insights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with insights data", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetInsights.mockResolvedValue(MOCK_INSIGHTS);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_INSIGHTS);
    expect(mockGetActiveProjectPath).toHaveBeenCalledTimes(1);
    expect(mockGetInsights).toHaveBeenCalledWith(TEST_PROJECT_PATH);
  });

  it("returns 503 when project path is not configured", async () => {
    mockGetActiveProjectPath.mockRejectedValue(
      new Error(
        "No repository configured. Set BEADS_PROJECT_PATH or add a repo via Settings.",
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("BEADS_PROJECT_PATH not configured");
    expect(body.detail).toContain("BEADS_PROJECT_PATH");
  });

  it("returns 500 on generic errors", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetInsights.mockRejectedValue(new Error("Subprocess timed out"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch insights");
    expect(body.detail).toBe("Subprocess timed out");
  });
});
