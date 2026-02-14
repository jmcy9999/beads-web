/**
 * Creates a temporary Beads SQLite database with known test data.
 * Used by all test suites that need realistic issue data.
 */

import Database from "better-sqlite3";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface TestFixture {
  /** Path to the temporary project directory */
  projectPath: string;
  /** Path to the .beads directory */
  beadsDir: string;
  /** Path to the SQLite database */
  dbPath: string;
  /** Clean up the temporary directory */
  cleanup: () => void;
}

/** Known test issues for assertion */
export const TEST_ISSUES = [
  {
    id: "TEST-001",
    title: "Implement user authentication",
    description: "Add login/signup flow with JWT tokens",
    status: "open",
    priority: 1,
    issue_type: "feature",
    owner: "alice@example.com",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "TEST-002",
    title: "Fix login redirect loop",
    description: "Users get stuck in a redirect loop after login",
    status: "in_progress",
    priority: 0,
    issue_type: "bug",
    owner: "bob@example.com",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-11T00:00:00Z",
  },
  {
    id: "TEST-003",
    title: "Add password reset flow",
    description: "Email-based password reset with token expiry",
    status: "blocked",
    priority: 2,
    issue_type: "feature",
    owner: "alice@example.com",
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-12T00:00:00Z",
  },
  {
    id: "TEST-004",
    title: "Write auth unit tests",
    description: "Cover login, signup, token refresh",
    status: "open",
    priority: 2,
    issue_type: "task",
    owner: "charlie@example.com",
    created_at: "2026-01-04T00:00:00Z",
    updated_at: "2026-01-13T00:00:00Z",
  },
  {
    id: "TEST-005",
    title: "Set up CI pipeline",
    description: "GitHub Actions for build, lint, test",
    status: "closed",
    priority: 1,
    issue_type: "task",
    owner: "bob@example.com",
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-14T00:00:00Z",
    closed_at: "2026-01-14T00:00:00Z",
  },
  {
    id: "TEST-006",
    title: "Database schema migration",
    description: "Add users and sessions tables",
    status: "open",
    priority: 1,
    issue_type: "task",
    owner: "alice@example.com",
    created_at: "2026-01-06T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "TEST-007",
    title: "Rate limiting middleware",
    description: "Prevent brute force attacks on login",
    status: "open",
    priority: 3,
    issue_type: "feature",
    owner: "charlie@example.com",
    created_at: "2026-01-07T00:00:00Z",
    updated_at: "2026-01-16T00:00:00Z",
  },
  {
    id: "TEST-008",
    title: "OAuth2 Google integration",
    description: "Social login via Google",
    status: "deferred",
    priority: 4,
    issue_type: "feature",
    owner: "",
    created_at: "2026-01-08T00:00:00Z",
    updated_at: "2026-01-17T00:00:00Z",
  },
] as const;

/**
 * Dependency relationships for test data.
 * Format: [issue_id, depends_on_id, type]
 *
 * TEST-003 (password reset) depends on TEST-001 (auth)
 * TEST-004 (auth tests) depends on TEST-001 (auth)
 * TEST-002 (fix redirect) depends on TEST-006 (db migration)
 * TEST-007 (rate limiting) depends on TEST-001 (auth)
 * TEST-007 (rate limiting) depends on TEST-006 (db migration)
 */
export const TEST_DEPENDENCIES = [
  ["TEST-003", "TEST-001", "blocks"],
  ["TEST-004", "TEST-001", "blocks"],
  ["TEST-002", "TEST-006", "blocks"],
  ["TEST-007", "TEST-001", "blocks"],
  ["TEST-007", "TEST-006", "blocks"],
] as const;

/** Labels for test issues */
export const TEST_LABELS = [
  ["TEST-001", "auth"],
  ["TEST-001", "backend"],
  ["TEST-002", "auth"],
  ["TEST-002", "bug-fix"],
  ["TEST-003", "auth"],
  ["TEST-004", "testing"],
  ["TEST-005", "infra"],
  ["TEST-006", "backend"],
  ["TEST-006", "database"],
  ["TEST-007", "security"],
] as const;

/**
 * Create a temporary directory with a .beads/beads.db SQLite database
 * populated with test data.
 */
export function createTestFixture(): TestFixture {
  const projectPath = mkdtempSync(join(tmpdir(), "beads-test-"));
  const beadsDir = join(projectPath, ".beads");
  mkdirSync(beadsDir);

  const dbPath = join(beadsDir, "beads.db");
  const db = new Database(dbPath);

  // Create tables matching the real beads schema
  db.exec(`
    CREATE TABLE issues (
      id TEXT PRIMARY KEY,
      content_hash TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      priority INTEGER NOT NULL DEFAULT 2,
      issue_type TEXT NOT NULL DEFAULT 'task',
      owner TEXT DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT '',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      close_reason TEXT DEFAULT '',
      story_points INTEGER,
      deleted_at DATETIME
    );

    CREATE TABLE dependencies (
      issue_id TEXT NOT NULL,
      depends_on_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'blocks',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      PRIMARY KEY (issue_id, depends_on_id, type),
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    );

    CREATE TABLE labels (
      issue_id TEXT NOT NULL,
      label TEXT NOT NULL,
      PRIMARY KEY (issue_id, label),
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    );
  `);

  // Insert test issues
  const insertIssue = db.prepare(`
    INSERT INTO issues (id, title, description, status, priority, issue_type, owner, created_at, updated_at, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const issue of TEST_ISSUES) {
    insertIssue.run(
      issue.id,
      issue.title,
      issue.description,
      issue.status,
      issue.priority,
      issue.issue_type,
      issue.owner,
      issue.created_at,
      issue.updated_at,
      "closed_at" in issue ? (issue as { closed_at: string }).closed_at : null,
    );
  }

  // Insert dependencies
  const insertDep = db.prepare(`
    INSERT INTO dependencies (issue_id, depends_on_id, type, created_by)
    VALUES (?, ?, ?, 'test')
  `);
  for (const [issueId, dependsOn, type] of TEST_DEPENDENCIES) {
    insertDep.run(issueId, dependsOn, type);
  }

  // Insert labels
  const insertLabel = db.prepare(`
    INSERT INTO labels (issue_id, label) VALUES (?, ?)
  `);
  for (const [issueId, label] of TEST_LABELS) {
    insertLabel.run(issueId, label);
  }

  db.close();

  // Also create a matching JSONL file
  const jsonlLines = TEST_ISSUES.map((issue) => {
    const deps = TEST_DEPENDENCIES.filter(([id]) => id === issue.id).map(
      ([issueId, dependsOn, type]) => ({
        issue_id: issueId,
        depends_on_id: dependsOn,
        type,
        created_at: "2026-01-01T00:00:00Z",
        created_by: "test",
      }),
    );
    const labels = TEST_LABELS.filter(([id]) => id === issue.id).map(
      ([, label]) => label,
    );
    return JSON.stringify({
      ...issue,
      labels: labels.length > 0 ? labels : undefined,
      dependencies: deps.length > 0 ? deps : undefined,
    });
  });
  writeFileSync(join(beadsDir, "issues.jsonl"), jsonlLines.join("\n") + "\n");

  return {
    projectPath,
    beadsDir,
    dbPath,
    cleanup: () => {
      try {
        const { rmSync } = require("fs");
        rmSync(projectPath, { recursive: true, force: true });
      } catch {
        // best effort
      }
    },
  };
}
