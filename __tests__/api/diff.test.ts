// =============================================================================
// Tests for src/app/api/diff/route.ts — GET /api/diff
// =============================================================================

import { NextRequest } from "next/server";
import type { RobotDiff } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/repo-config", () => ({
  getActiveProjectPath: jest.fn(),
}));

jest.mock("@/lib/bv-client", () => ({
  getDiff: jest.fn(),
}));

import { GET } from "@/app/api/diff/route";
import { getActiveProjectPath } from "@/lib/repo-config";
import { getDiff } from "@/lib/bv-client";

const mockGetActiveProjectPath = getActiveProjectPath as jest.MockedFunction<
  typeof getActiveProjectPath
>;
const mockGetDiff = getDiff as jest.MockedFunction<typeof getDiff>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROJECT_PATH = "/tmp/test-project";

function makeRequest(since?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/diff");
  if (since) url.searchParams.set("since", since);
  return new NextRequest(url);
}

const MOCK_DIFF: RobotDiff = {
  timestamp: "2026-01-15T00:00:00Z",
  project_path: TEST_PROJECT_PATH,
  since_ref: "HEAD~5",
  new_count: 2,
  closed_count: 1,
  modified_count: 3,
  reopened_count: 0,
  changes: [
    {
      issue_id: "TEST-009",
      title: "New feature",
      change_type: "new",
    },
    {
      issue_id: "TEST-005",
      title: "Set up CI pipeline",
      change_type: "closed",
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/diff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Successful requests
  // -------------------------------------------------------------------------

  it("returns 200 with diff data for a valid ref", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetDiff.mockResolvedValue(MOCK_DIFF);

    const response = await GET(makeRequest("HEAD~5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_DIFF);
    expect(mockGetDiff).toHaveBeenCalledWith("HEAD~5", TEST_PROJECT_PATH);
  });

  it("defaults to HEAD~5 when no since param is provided", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetDiff.mockResolvedValue(MOCK_DIFF);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_DIFF);
    expect(mockGetDiff).toHaveBeenCalledWith("HEAD~5", TEST_PROJECT_PATH);
  });

  // -------------------------------------------------------------------------
  // Valid git ref formats
  // -------------------------------------------------------------------------

  it.each([
    ["HEAD~5", "tilde notation"],
    ["main", "branch name"],
    ["v1.0.0", "semver tag"],
    ["feature/branch-name", "branch with slash"],
    ["abc123", "short SHA"],
    ["HEAD^2", "caret notation"],
    ["refs/heads/main", "full ref path"],
    ["v2.0.0-rc.1", "pre-release tag"],
  ])("allows valid ref: %s (%s)", async (ref) => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetDiff.mockResolvedValue(MOCK_DIFF);

    const response = await GET(makeRequest(ref));

    expect(response.status).toBe(200);
    expect(mockGetDiff).toHaveBeenCalledWith(ref, TEST_PROJECT_PATH);
  });

  // -------------------------------------------------------------------------
  // Invalid git ref formats (injection attempts)
  // -------------------------------------------------------------------------

  it('returns 400 for shell injection attempt: "; rm -rf /', async () => {
    const response = await GET(makeRequest('"; rm -rf /'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid git ref format");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  it("returns 400 for refs with spaces", async () => {
    const response = await GET(makeRequest("HEAD ~5"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid git ref format");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  it.each([
    ["$(whoami)", "command substitution"],
    ["`id`", "backtick injection"],
    ["main;echo pwned", "semicolon injection"],
    ["HEAD && cat /etc/passwd", "ampersand injection"],
    ["ref|tee /tmp/out", "pipe injection"],
  ])("returns 400 for dangerous ref: %s (%s)", async (ref) => {
    const response = await GET(makeRequest(ref));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid git ref format");
    expect(mockGetDiff).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it("returns 503 when project path is not configured", async () => {
    mockGetActiveProjectPath.mockRejectedValue(
      new Error(
        "No repository configured. Set BEADS_PROJECT_PATH or add a repo via Settings.",
      ),
    );

    const response = await GET(makeRequest("HEAD~5"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("BEADS_PROJECT_PATH not configured");
    expect(body.detail).toContain("BEADS_PROJECT_PATH");
  });

  it("returns 500 on generic errors", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetDiff.mockRejectedValue(new Error("git process failed"));

    const response = await GET(makeRequest("HEAD~5"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch diff");
    expect(body.detail).toBe("git process failed");
  });
});
