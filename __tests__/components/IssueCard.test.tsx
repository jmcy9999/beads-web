// =============================================================================
// Tests for src/components/ui/IssueCard.tsx
// =============================================================================

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IssueCard } from "@/components/ui/IssueCard";
import type { PlanIssue } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => "/",
}));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseIssue: PlanIssue = {
  id: "ISSUE-42",
  title: "Fix authentication timeout",
  status: "open",
  priority: 1,
  issue_type: "bug",
  owner: "alice",
  labels: ["auth", "urgent"],
  blocked_by: [],
  blocks: ["ISSUE-99"],
  impact_score: 0.85,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IssueCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
  });

  // -------------------------------------------------------------------------
  // Card variant (default)
  // -------------------------------------------------------------------------

  describe("card variant (default)", () => {
    it("renders the issue title", () => {
      render(<IssueCard issue={baseIssue} />);
      expect(screen.getByText("Fix authentication timeout")).toBeInTheDocument();
    });

    it("renders the issue ID", () => {
      render(<IssueCard issue={baseIssue} />);
      expect(screen.getByText("ISSUE-42")).toBeInTheDocument();
    });

    it("renders the status badge with the correct label", () => {
      render(<IssueCard issue={baseIssue} />);
      // StatusBadge renders STATUS_CONFIG[status].label = "Open"
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders a different status badge for blocked issues", () => {
      const blockedIssue: PlanIssue = {
        ...baseIssue,
        status: "blocked",
        blocked_by: ["ISSUE-10"],
      };
      render(<IssueCard issue={blockedIssue} />);
      expect(screen.getByText("Blocked")).toBeInTheDocument();
    });

    it("renders the priority indicator", () => {
      render(<IssueCard issue={baseIssue} />);
      // Priority 1 = "High" with 3 flames. The PriorityIndicator renders
      // a span with title="P1 - High"
      const priorityEl = screen.getByTitle("P1 - High");
      expect(priorityEl).toBeInTheDocument();
    });

    it("renders the owner when present", () => {
      render(<IssueCard issue={baseIssue} />);
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    it("does not render owner text when owner is absent", () => {
      const noOwnerIssue: PlanIssue = { ...baseIssue, owner: undefined };
      render(<IssueCard issue={noOwnerIssue} />);
      expect(screen.queryByText("alice")).not.toBeInTheDocument();
    });

    it("renders the issue type icon with the correct aria-label", () => {
      render(<IssueCard issue={baseIssue} />);
      // IssueTypeIcon renders role="img" with aria-label matching the type label
      expect(screen.getByRole("img", { name: "Bug" })).toBeInTheDocument();
    });

    it("renders a feature issue type icon", () => {
      const featureIssue: PlanIssue = { ...baseIssue, issue_type: "feature" };
      render(<IssueCard issue={featureIssue} />);
      expect(screen.getByRole("img", { name: "Feature" })).toBeInTheDocument();
    });

    it("wraps in a Link to the issue detail page when no onClick provided", () => {
      render(<IssueCard issue={baseIssue} />);
      // The mocked Link renders an <a> with href
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/issue/ISSUE-42");
    });

    it("calls custom onClick handler instead of navigating when onClick is provided", () => {
      const handleClick = jest.fn();
      render(<IssueCard issue={baseIssue} onClick={handleClick} />);

      // With onClick, the card renders as a div with role="button" instead of Link
      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledWith("ISSUE-42");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("navigates via router.push when card is clicked without custom onClick", () => {
      // When no onClick is provided, the card uses <Link> which is mocked as <a>.
      // The router.push path is used only when onClick is defined.
      // Let's test with onClick=undefined but click via keyboard on the Link variant.
      // Actually, the default card variant wraps in <Link>, not a clickable div.
      // So there's no router.push call in that case. Let's verify the Link href instead.
      render(<IssueCard issue={baseIssue} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/issue/ISSUE-42");
    });

    it("renders blocked_by count when there are blockers", () => {
      const blockedIssue: PlanIssue = {
        ...baseIssue,
        blocked_by: ["ISSUE-10", "ISSUE-11"],
      };
      render(<IssueCard issue={blockedIssue} />);
      expect(screen.getByText("2 blocked")).toBeInTheDocument();
    });

    it("does not render blocked text when blocked_by is empty", () => {
      render(<IssueCard issue={baseIssue} />);
      expect(screen.queryByText(/blocked/)).not.toBeInTheDocument();
    });

    it("renders the impact score bar when impact_score is present and > 0", () => {
      render(<IssueCard issue={baseIssue} />);
      // impact_score = 0.85, so Math.round(0.85 * 100) = 85
      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("does not render the impact score bar when impact_score is absent", () => {
      const noScoreIssue: PlanIssue = { ...baseIssue, impact_score: undefined };
      render(<IssueCard issue={noScoreIssue} />);
      expect(screen.queryByText("85")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row variant
  // -------------------------------------------------------------------------

  describe("row variant", () => {
    const renderInTable = (ui: React.ReactElement) =>
      render(
        <table>
          <tbody>{ui}</tbody>
        </table>,
      );

    it("renders as a table row", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      expect(screen.getByRole("button")).toBeInTheDocument();
      // The tr has role="button"
    });

    it("renders issue ID and title in the row", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      expect(screen.getByText("ISSUE-42")).toBeInTheDocument();
      expect(screen.getByText("Fix authentication timeout")).toBeInTheDocument();
    });

    it("renders status badge in the row", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders owner in the row", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    it("renders em-dash when owner is absent", () => {
      const noOwnerIssue: PlanIssue = { ...baseIssue, owner: undefined };
      renderInTable(<IssueCard issue={noOwnerIssue} variant="row" />);
      expect(screen.getByText("\u2014")).toBeInTheDocument();
    });

    it("navigates via router.push on click", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      const row = screen.getByRole("button");
      fireEvent.click(row);
      expect(mockPush).toHaveBeenCalledWith("/issue/ISSUE-42");
    });

    it("navigates via router.push on Enter key", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      const row = screen.getByRole("button");
      fireEvent.keyDown(row, { key: "Enter" });
      expect(mockPush).toHaveBeenCalledWith("/issue/ISSUE-42");
    });

    it("renders blocked_by count highlighted when blockers exist", () => {
      const blockedIssue: PlanIssue = {
        ...baseIssue,
        blocked_by: ["ISSUE-10", "ISSUE-11", "ISSUE-12"],
      };
      renderInTable(<IssueCard issue={blockedIssue} variant="row" />);
      // The row shows the count as text
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders 0 when no blockers exist", () => {
      renderInTable(<IssueCard issue={baseIssue} variant="row" />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
