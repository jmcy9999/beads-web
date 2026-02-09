// =============================================================================
// Tests for src/components/insights/MetricPanel.tsx
// =============================================================================

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MetricPanel } from "@/components/insights/MetricPanel";
import type { GraphMetricEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleEntries: GraphMetricEntry[] = [
  { issue_id: "ISSUE-1", title: "Authentication service refactor", score: 0.95 },
  { issue_id: "ISSUE-2", title: "Database migration scripts", score: 0.78 },
  { issue_id: "ISSUE-3", title: "API rate limiting", score: 0.62 },
];

const fiveEntries: GraphMetricEntry[] = [
  { issue_id: "ISSUE-1", title: "First issue", score: 1.0 },
  { issue_id: "ISSUE-2", title: "Second issue", score: 0.8 },
  { issue_id: "ISSUE-3", title: "Third issue", score: 0.6 },
  { issue_id: "ISSUE-4", title: "Fourth issue", score: 0.4 },
  { issue_id: "ISSUE-5", title: "Fifth issue", score: 0.2 },
];

const sevenEntries: GraphMetricEntry[] = [
  ...fiveEntries,
  { issue_id: "ISSUE-6", title: "Sixth issue", score: 0.15 },
  { issue_id: "ISSUE-7", title: "Seventh issue", score: 0.1 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MetricPanel", () => {
  // -------------------------------------------------------------------------
  // Title and description
  // -------------------------------------------------------------------------

  it("renders the title", () => {
    render(
      <MetricPanel
        title="Bottlenecks"
        description="Issues blocking the most work"
        entries={sampleEntries}
        colorScheme="blue"
      />,
    );
    expect(screen.getByText("Bottlenecks")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <MetricPanel
        title="Bottlenecks"
        description="Issues blocking the most work"
        entries={sampleEntries}
        colorScheme="blue"
      />,
    );
    expect(
      screen.getByText("Issues blocking the most work"),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Entries rendering
  // -------------------------------------------------------------------------

  it("renders entries with issue IDs", () => {
    render(
      <MetricPanel
        title="Keystones"
        description="Critical path issues"
        entries={sampleEntries}
        colorScheme="purple"
      />,
    );
    expect(screen.getByText("ISSUE-1")).toBeInTheDocument();
    expect(screen.getByText("ISSUE-2")).toBeInTheDocument();
    expect(screen.getByText("ISSUE-3")).toBeInTheDocument();
  });

  it("renders entries with titles", () => {
    render(
      <MetricPanel
        title="Keystones"
        description="Critical path issues"
        entries={sampleEntries}
        colorScheme="purple"
      />,
    );
    expect(
      screen.getByText("Authentication service refactor"),
    ).toBeInTheDocument();
    expect(screen.getByText("Database migration scripts")).toBeInTheDocument();
    expect(screen.getByText("API rate limiting")).toBeInTheDocument();
  });

  it("renders entries with formatted scores", () => {
    render(
      <MetricPanel
        title="Hubs"
        description="Most connected issues"
        entries={sampleEntries}
        colorScheme="pink"
      />,
    );
    // Scores are rendered with .toFixed(3)
    expect(screen.getByText("0.950")).toBeInTheDocument();
    expect(screen.getByText("0.780")).toBeInTheDocument();
    expect(screen.getByText("0.620")).toBeInTheDocument();
  });

  it("renders the correct number of rows for 3 entries", () => {
    render(
      <MetricPanel
        title="Test"
        description="Test panel"
        entries={sampleEntries}
        colorScheme="blue"
      />,
    );
    const list = screen.getByRole("list");
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("renders the correct number of rows for 5 entries", () => {
    render(
      <MetricPanel
        title="Test"
        description="Test panel"
        entries={fiveEntries}
        colorScheme="green"
      />,
    );
    const list = screen.getByRole("list");
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(5);
  });

  it("renders at most 5 rows even when given more entries (top5 slice)", () => {
    render(
      <MetricPanel
        title="Test"
        description="Test panel"
        entries={sevenEntries}
        colorScheme="amber"
      />,
    );
    const list = screen.getByRole("list");
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(5);
    // The 6th and 7th entries should not appear
    expect(screen.queryByText("ISSUE-6")).not.toBeInTheDocument();
    expect(screen.queryByText("ISSUE-7")).not.toBeInTheDocument();
  });

  it("renders numbered ranks for each entry", () => {
    render(
      <MetricPanel
        title="Test"
        description="Test panel"
        entries={sampleEntries}
        colorScheme="blue"
      />,
    );
    // Rank numbers: 1, 2, 3
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it("shows 'No data available' when entries array is empty", () => {
    render(
      <MetricPanel
        title="Bottlenecks"
        description="Issues blocking the most work"
        entries={[]}
        colorScheme="red"
      />,
    );
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("does not render a list when entries are empty", () => {
    render(
      <MetricPanel
        title="Bottlenecks"
        description="Issues blocking the most work"
        entries={[]}
        colorScheme="red"
      />,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("still renders title and description when entries are empty", () => {
    render(
      <MetricPanel
        title="Bottlenecks"
        description="Issues blocking the most work"
        entries={[]}
        colorScheme="red"
      />,
    );
    expect(screen.getByText("Bottlenecks")).toBeInTheDocument();
    expect(
      screen.getByText("Issues blocking the most work"),
    ).toBeInTheDocument();
  });
});
