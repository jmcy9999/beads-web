// =============================================================================
// Tests for src/app/api/issues/[id]/route.ts — GET /api/issues/:id
// =============================================================================

import { NextRequest } from "next/server";
import type { PlanIssue, BeadsIssue } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/repo-config", () => ({
  getActiveProjectPath: jest.fn(),
}));

jest.mock("@/lib/bv-client", () => ({
  getIssueById: jest.fn(),
}));

import { GET } from "@/app/api/issues/[id]/route";
import { getActiveProjectPath } from "@/lib/repo-config";
import { getIssueById } from "@/lib/bv-client";

const mockGetActiveProjectPath = getActiveProjectPath as jest.MockedFunction<
  typeof getActiveProjectPath
>;
const mockGetIssueById = getIssueById as jest.MockedFunction<
  typeof getIssueById
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROJECT_PATH = "/tmp/test-project";

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/issues/${id}`);
}

function makeParams(id: string): { params: { id: string } } {
  return { params: { id } };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_PLAN_ISSUE: PlanIssue = {
  id: "TEST-001",
  title: "Implement user authentication",
  status: "open",
  priority: 1,
  issue_type: "feature",
  owner: "alice@example.com",
  labels: ["auth", "backend"],
  blocked_by: [],
  blocks: ["TEST-003", "TEST-004", "TEST-007"],
  impact_score: 3.5,
};

const MOCK_RAW_ISSUE: BeadsIssue = {
  id: "TEST-001",
  title: "Implement user authentication",
  description: "Add login/signup flow with JWT tokens",
  status: "open",
  priority: 1,
  issue_type: "feature",
  owner: "alice@example.com",
  labels: ["auth", "backend"],
  dependencies: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-10T00:00:00Z",
};

const MOCK_ISSUE_RESPONSE = {
  plan_issue: MOCK_PLAN_ISSUE,
  raw_issue: MOCK_RAW_ISSUE,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/issues/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with issue data", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetIssueById.mockResolvedValue(MOCK_ISSUE_RESPONSE);

    const response = await GET(makeRequest("TEST-001"), makeParams("TEST-001"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_ISSUE_RESPONSE);
    expect(mockGetActiveProjectPath).toHaveBeenCalledTimes(1);
    expect(mockGetIssueById).toHaveBeenCalledWith(
      "TEST-001",
      TEST_PROJECT_PATH,
    );
  });

  it("returns 404 when issue is not found", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetIssueById.mockRejectedValue(
      new Error("Issue not found: NONEXISTENT-999"),
    );

    const response = await GET(
      makeRequest("NONEXISTENT-999"),
      makeParams("NONEXISTENT-999"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain("not found");
  });

  it("returns 500 on generic errors", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetIssueById.mockRejectedValue(new Error("Database connection lost"));

    const response = await GET(makeRequest("TEST-001"), makeParams("TEST-001"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Database connection lost");
  });

  it("passes the correct ID from params to getIssueById", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetIssueById.mockResolvedValue({
      plan_issue: { ...MOCK_PLAN_ISSUE, id: "PROJ-042" },
      raw_issue: null,
    });

    await GET(makeRequest("PROJ-042"), makeParams("PROJ-042"));

    expect(mockGetIssueById).toHaveBeenCalledWith(
      "PROJ-042",
      TEST_PROJECT_PATH,
    );
  });

  it("returns issue data even when raw_issue is null", async () => {
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockGetIssueById.mockResolvedValue({
      plan_issue: MOCK_PLAN_ISSUE,
      raw_issue: null,
    });

    const response = await GET(makeRequest("TEST-001"), makeParams("TEST-001"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan_issue).toEqual(MOCK_PLAN_ISSUE);
    expect(body.raw_issue).toBeNull();
  });
});
