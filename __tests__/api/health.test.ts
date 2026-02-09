// =============================================================================
// Tests for src/app/api/health/route.ts — GET /api/health
// =============================================================================

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/bv-client", () => ({
  checkBvAvailable: jest.fn(),
}));

jest.mock("@/lib/repo-config", () => ({
  getActiveProjectPath: jest.fn(),
}));

jest.mock("fs/promises", () => ({
  access: jest.fn(),
  stat: jest.fn(),
}));

import { GET } from "@/app/api/health/route";
import { checkBvAvailable } from "@/lib/bv-client";
import { getActiveProjectPath } from "@/lib/repo-config";
import { access, stat } from "fs/promises";

const mockCheckBvAvailable = checkBvAvailable as jest.MockedFunction<
  typeof checkBvAvailable
>;
const mockGetActiveProjectPath = getActiveProjectPath as jest.MockedFunction<
  typeof getActiveProjectPath
>;
const mockAccess = access as jest.MockedFunction<typeof access>;
const mockStat = stat as jest.MockedFunction<typeof stat>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROJECT_PATH = "/tmp/test-project";

function mockValidProject(): void {
  mockAccess.mockResolvedValue(undefined);
  mockStat.mockResolvedValue({
    isDirectory: () => true,
  } as ReturnType<typeof import("fs").statSync>);
}

function mockInvalidProject(): void {
  mockAccess.mockResolvedValue(undefined);
  mockStat.mockRejectedValue(new Error("ENOENT: no such file or directory"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/health", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 200 with bv_available, project_path, and project_valid", async () => {
    mockCheckBvAvailable.mockResolvedValue(true);
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockValidProject();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      bv_available: true,
      project_path: TEST_PROJECT_PATH,
      project_valid: true,
    });
  });

  it("returns project_valid=false when .beads directory does not exist", async () => {
    mockCheckBvAvailable.mockResolvedValue(true);
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockInvalidProject();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project_path).toBe(TEST_PROJECT_PATH);
    expect(body.project_valid).toBe(false);
  });

  it("returns project_valid=false when stat says it is not a directory", async () => {
    mockCheckBvAvailable.mockResolvedValue(false);
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({
      isDirectory: () => false,
    } as ReturnType<typeof import("fs").statSync>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project_valid).toBe(false);
  });

  it("falls back to BEADS_PROJECT_PATH env when getActiveProjectPath throws", async () => {
    const envPath = "/env/fallback/project";
    process.env.BEADS_PROJECT_PATH = envPath;

    mockCheckBvAvailable.mockResolvedValue(true);
    mockGetActiveProjectPath.mockRejectedValue(
      new Error("No repository configured"),
    );
    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({
      isDirectory: () => true,
    } as ReturnType<typeof import("fs").statSync>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project_path).toBe(envPath);
    expect(body.project_valid).toBe(true);
  });

  it("returns empty project_path when getActiveProjectPath throws and env is unset", async () => {
    delete process.env.BEADS_PROJECT_PATH;

    mockCheckBvAvailable.mockResolvedValue(true);
    mockGetActiveProjectPath.mockRejectedValue(
      new Error("No repository configured"),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.project_path).toBe("");
    expect(body.project_valid).toBe(false);
  });

  it("returns bv_available=false when bv CLI is not installed", async () => {
    mockCheckBvAvailable.mockResolvedValue(false);
    mockGetActiveProjectPath.mockResolvedValue(TEST_PROJECT_PATH);
    mockValidProject();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.bv_available).toBe(false);
    expect(body.project_path).toBe(TEST_PROJECT_PATH);
    expect(body.project_valid).toBe(true);
  });
});
