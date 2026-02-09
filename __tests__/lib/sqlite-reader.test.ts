// =============================================================================
// Tests for src/lib/sqlite-reader.ts — readIssuesFromDB
// =============================================================================

import { readIssuesFromDB } from "@/lib/sqlite-reader";
import {
  createTestFixture,
  TestFixture,
  TEST_ISSUES,
  TEST_DEPENDENCIES,
  TEST_LABELS,
} from "../fixtures/create-test-db";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("readIssuesFromDB", () => {
  let fixture: TestFixture;

  beforeAll(() => {
    fixture = createTestFixture();
  });

  afterAll(() => {
    fixture.cleanup();
  });

  // ---------------------------------------------------------------------------
  // Successful reads
  // ---------------------------------------------------------------------------

  describe("reading from a valid database", () => {
    it("returns all 8 issues", () => {
      const issues = readIssuesFromDB(fixture.projectPath);
      expect(issues).not.toBeNull();
      expect(issues).toHaveLength(8);
    });

    it("returns correct ids for all issues", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const ids = issues.map((i) => i.id).sort();
      const expectedIds = TEST_ISSUES.map((i) => i.id).sort();
      expect(ids).toEqual(expectedIds);
    });

    it("returns correct title for each issue", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      for (const testIssue of TEST_ISSUES) {
        const found = issues.find((i) => i.id === testIssue.id);
        expect(found).toBeDefined();
        expect(found!.title).toBe(testIssue.title);
      }
    });

    it("returns correct status for each issue", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      for (const testIssue of TEST_ISSUES) {
        const found = issues.find((i) => i.id === testIssue.id);
        expect(found!.status).toBe(testIssue.status);
      }
    });

    it("returns correct priority for each issue", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      for (const testIssue of TEST_ISSUES) {
        const found = issues.find((i) => i.id === testIssue.id);
        expect(found!.priority).toBe(testIssue.priority);
      }
    });

    it("returns correct issue_type for each issue", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      for (const testIssue of TEST_ISSUES) {
        const found = issues.find((i) => i.id === testIssue.id);
        expect(found!.issue_type).toBe(testIssue.issue_type);
      }
    });

    it("returns correct owner for each issue", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      // TEST-001 has owner alice@example.com
      const issue1 = issues.find((i) => i.id === "TEST-001");
      expect(issue1!.owner).toBe("alice@example.com");

      // TEST-002 has owner bob@example.com
      const issue2 = issues.find((i) => i.id === "TEST-002");
      expect(issue2!.owner).toBe("bob@example.com");

      // TEST-008 has empty owner string -> undefined
      const issue8 = issues.find((i) => i.id === "TEST-008");
      expect(issue8!.owner).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------

  describe("labels parsing", () => {
    it("parses labels correctly for TEST-001 (auth, backend)", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue1 = issues.find((i) => i.id === "TEST-001");
      expect(issue1!.labels).toBeDefined();
      expect(issue1!.labels!.sort()).toEqual(["auth", "backend"]);
    });

    it("parses labels correctly for TEST-006 (backend, database)", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue6 = issues.find((i) => i.id === "TEST-006");
      expect(issue6!.labels).toBeDefined();
      expect(issue6!.labels!.sort()).toEqual(["backend", "database"]);
    });

    it("returns undefined labels for issues with no labels (TEST-008)", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue8 = issues.find((i) => i.id === "TEST-008");
      expect(issue8!.labels).toBeUndefined();
    });

    it("returns single-element label arrays correctly", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      // TEST-004 has only "testing"
      const issue4 = issues.find((i) => i.id === "TEST-004");
      expect(issue4!.labels).toEqual(["testing"]);
      // TEST-007 has only "security"
      const issue7 = issues.find((i) => i.id === "TEST-007");
      expect(issue7!.labels).toEqual(["security"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Dependencies
  // ---------------------------------------------------------------------------

  describe("dependencies parsing", () => {
    it("parses TEST-003 dependency on TEST-001", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue3 = issues.find((i) => i.id === "TEST-003");
      expect(issue3!.dependencies).toBeDefined();
      expect(issue3!.dependencies!.length).toBe(1);
      expect(issue3!.dependencies![0].issue_id).toBe("TEST-003");
      expect(issue3!.dependencies![0].depends_on_id).toBe("TEST-001");
      expect(issue3!.dependencies![0].type).toBe("blocks");
    });

    it("parses TEST-007 dependencies on TEST-001 and TEST-006", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue7 = issues.find((i) => i.id === "TEST-007");
      expect(issue7!.dependencies).toBeDefined();
      expect(issue7!.dependencies!.length).toBe(2);
      const depIds = issue7!.dependencies!.map((d) => d.depends_on_id).sort();
      expect(depIds).toEqual(["TEST-001", "TEST-006"]);
    });

    it("returns undefined dependencies for issues with no deps", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue1 = issues.find((i) => i.id === "TEST-001");
      expect(issue1!.dependencies).toBeUndefined();
    });

    it("includes created_by field in dependencies", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue3 = issues.find((i) => i.id === "TEST-003");
      expect(issue3!.dependencies![0].created_by).toBe("test");
    });
  });

  // ---------------------------------------------------------------------------
  // Closed issues
  // ---------------------------------------------------------------------------

  describe("closed issues", () => {
    it("includes closed_at for TEST-005", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue5 = issues.find((i) => i.id === "TEST-005");
      expect(issue5!.status).toBe("closed");
      expect(issue5!.closed_at).toBe("2026-01-14T00:00:00Z");
    });

    it("returns undefined closed_at for open issues", () => {
      const issues = readIssuesFromDB(fixture.projectPath)!;
      const issue1 = issues.find((i) => i.id === "TEST-001");
      expect(issue1!.closed_at).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Read-only mode
  // ---------------------------------------------------------------------------

  describe("read-only behavior", () => {
    it("opens the database in read-only mode (data reads do not mutate)", () => {
      // Read twice and verify identical results
      const first = readIssuesFromDB(fixture.projectPath);
      const second = readIssuesFromDB(fixture.projectPath);
      expect(first).toEqual(second);
    });

    it("returns a new array each call (no shared references)", () => {
      const first = readIssuesFromDB(fixture.projectPath);
      const second = readIssuesFromDB(fixture.projectPath);
      expect(first).not.toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe("missing or invalid database", () => {
    it("returns null when no beads.db exists", () => {
      const tmpPath = mkdtempSync(join(tmpdir(), "beads-no-db-"));
      try {
        const result = readIssuesFromDB(tmpPath);
        expect(result).toBeNull();
      } finally {
        const { rmSync } = require("fs");
        rmSync(tmpPath, { recursive: true, force: true });
      }
    });

    it("returns null when .beads dir exists but no db file", () => {
      const tmpPath = mkdtempSync(join(tmpdir(), "beads-empty-dir-"));
      mkdirSync(join(tmpPath, ".beads"));
      try {
        const result = readIssuesFromDB(tmpPath);
        expect(result).toBeNull();
      } finally {
        const { rmSync } = require("fs");
        rmSync(tmpPath, { recursive: true, force: true });
      }
    });

    it("returns null on invalid/corrupt database file", () => {
      const tmpPath = mkdtempSync(join(tmpdir(), "beads-corrupt-"));
      const beadsDir = join(tmpPath, ".beads");
      mkdirSync(beadsDir);
      writeFileSync(join(beadsDir, "beads.db"), "this is not a valid sqlite database");
      try {
        const result = readIssuesFromDB(tmpPath);
        expect(result).toBeNull();
      } finally {
        const { rmSync } = require("fs");
        rmSync(tmpPath, { recursive: true, force: true });
      }
    });

    it("returns null for an empty file masquerading as a database", () => {
      const tmpPath = mkdtempSync(join(tmpdir(), "beads-empty-file-"));
      const beadsDir = join(tmpPath, ".beads");
      mkdirSync(beadsDir);
      writeFileSync(join(beadsDir, "beads.db"), "");
      try {
        const result = readIssuesFromDB(tmpPath);
        expect(result).toBeNull();
      } finally {
        const { rmSync } = require("fs");
        rmSync(tmpPath, { recursive: true, force: true });
      }
    });
  });
});
