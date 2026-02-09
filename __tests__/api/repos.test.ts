// =============================================================================
// Tests for src/app/api/repos/route.ts — GET and POST /api/repos
// =============================================================================

import { NextRequest } from "next/server";
import type { RepoStore } from "@/lib/repo-config";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/repo-config", () => ({
  getRepos: jest.fn(),
  addRepo: jest.fn(),
  removeRepo: jest.fn(),
  setActiveRepo: jest.fn(),
}));

import { GET, POST } from "@/app/api/repos/route";
import { getRepos, addRepo, removeRepo, setActiveRepo } from "@/lib/repo-config";

const mockGetRepos = getRepos as jest.MockedFunction<typeof getRepos>;
const mockAddRepo = addRepo as jest.MockedFunction<typeof addRepo>;
const mockRemoveRepo = removeRepo as jest.MockedFunction<typeof removeRepo>;
const mockSetActiveRepo = setActiveRepo as jest.MockedFunction<
  typeof setActiveRepo
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/repos", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const MOCK_STORE: RepoStore = {
  repos: [
    { name: "project-alpha", path: "/home/user/project-alpha" },
    { name: "project-beta", path: "/home/user/project-beta" },
  ],
  activeRepo: "/home/user/project-alpha",
};

const MOCK_STORE_AFTER_ADD: RepoStore = {
  repos: [
    ...MOCK_STORE.repos,
    { name: "project-gamma", path: "/home/user/project-gamma" },
  ],
  activeRepo: "/home/user/project-alpha",
};

const MOCK_STORE_AFTER_REMOVE: RepoStore = {
  repos: [{ name: "project-alpha", path: "/home/user/project-alpha" }],
  activeRepo: "/home/user/project-alpha",
};

const MOCK_STORE_AFTER_SET_ACTIVE: RepoStore = {
  repos: MOCK_STORE.repos,
  activeRepo: "/home/user/project-beta",
};

// ---------------------------------------------------------------------------
// Tests — GET
// ---------------------------------------------------------------------------

describe("GET /api/repos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with repo list", async () => {
    mockGetRepos.mockResolvedValue(MOCK_STORE);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_STORE);
    expect(mockGetRepos).toHaveBeenCalledTimes(1);
  });

  it("returns 500 on error", async () => {
    mockGetRepos.mockRejectedValue(new Error("Failed to read config file"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to read config file");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST
// ---------------------------------------------------------------------------

describe("POST /api/repos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Successful actions
  // -------------------------------------------------------------------------

  it("add: calls addRepo with correct args and returns updated store", async () => {
    mockAddRepo.mockResolvedValue(MOCK_STORE_AFTER_ADD);

    const response = await POST(
      makePostRequest({
        action: "add",
        path: "/home/user/project-gamma",
        name: "project-gamma",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_STORE_AFTER_ADD);
    expect(mockAddRepo).toHaveBeenCalledWith(
      "/home/user/project-gamma",
      "project-gamma",
    );
  });

  it("add: passes undefined name when name is not provided", async () => {
    mockAddRepo.mockResolvedValue(MOCK_STORE_AFTER_ADD);

    await POST(
      makePostRequest({
        action: "add",
        path: "/home/user/project-gamma",
      }),
    );

    expect(mockAddRepo).toHaveBeenCalledWith(
      "/home/user/project-gamma",
      undefined,
    );
  });

  it("remove: calls removeRepo with correct args", async () => {
    mockRemoveRepo.mockResolvedValue(MOCK_STORE_AFTER_REMOVE);

    const response = await POST(
      makePostRequest({
        action: "remove",
        path: "/home/user/project-beta",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_STORE_AFTER_REMOVE);
    expect(mockRemoveRepo).toHaveBeenCalledWith("/home/user/project-beta");
  });

  it("set-active: calls setActiveRepo with correct args", async () => {
    mockSetActiveRepo.mockResolvedValue(MOCK_STORE_AFTER_SET_ACTIVE);

    const response = await POST(
      makePostRequest({
        action: "set-active",
        path: "/home/user/project-beta",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(MOCK_STORE_AFTER_SET_ACTIVE);
    expect(mockSetActiveRepo).toHaveBeenCalledWith("/home/user/project-beta");
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------

  it("returns 400 when action is missing", async () => {
    const response = await POST(
      makePostRequest({ path: "/home/user/project" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing action or path");
  });

  it("returns 400 when path is missing", async () => {
    const response = await POST(makePostRequest({ action: "add" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing action or path");
  });

  it("returns 400 for unknown action", async () => {
    const response = await POST(
      makePostRequest({
        action: "destroy",
        path: "/home/user/project",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Unknown action");
  });

  it("returns 400 when addRepo throws (e.g., no .beads directory)", async () => {
    mockAddRepo.mockRejectedValue(
      new Error("No .beads directory found at /home/user/no-beads"),
    );

    const response = await POST(
      makePostRequest({
        action: "add",
        path: "/home/user/no-beads",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("No .beads directory found");
  });

  it("returns 400 when setActiveRepo throws (repo not found)", async () => {
    mockSetActiveRepo.mockRejectedValue(
      new Error("Repository not found: /nonexistent"),
    );

    const response = await POST(
      makePostRequest({
        action: "set-active",
        path: "/nonexistent",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Repository not found");
  });
});
