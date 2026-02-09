// =============================================================================
// Tests for src/app/api/priority/route.ts — GET /api/priority
// =============================================================================

import type { RobotPriority } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/repo-config", () => ({
  getActiveProjectPath: jest.fn(),
}));

jest.mock("@/lib/bv-client", () => ({
  getPriority: jest.fn(),
}));

import { GET } from "@/app/api/priority/route";
import { getActiveProjectPath } from "@/lib/repo-config";
import { getPriority } from "@/lib/bv-client";

const mockGetActiveProjectPath = getActiveProjectPath as jest.MockedFunction<
  typeof getActiveProjectPath
>;
const mockGetPriority = getPriority as jest.MockedFunction<typeof getPriority>;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const TEST_PROJECT_PATH = "/tmp/test-project";

const MOCK_PRIORITY: RobotPriority = {
  timestamp: "2026-01-15T00:00:00Z",
  project_path: TEST_PROJECT_PATH,
  recommendations: [
    {
      issue_id: "TEST-001",
      title: "Implement user authentication",
      current_priority: 2,
      recommended_priority: 1,
      confidence: 0.85,
      reason: "High impact bottleneck with 3 downstream dependents",
    },
  ],
  aligned_count: 6,
  misaligned_count: 1,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/priority", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with priority data", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetPriority.mockResolvedValue(MOCK_PRIORITY);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_PRIORITY);
    expect(mockGetActiveProjectPath).toHaveBeenCalledTimes(1);
    expect(mockGetPriority).toHaveBeenCalledWith(TEST_PROJECT_PATH);
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
    mockGetPriority.mockRejectedValue(new Error("bv crashed unexpectedly"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch priority");
    expect(body.detail).toBe("bv crashed unexpectedly");
  });
});
