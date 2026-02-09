// =============================================================================
// Tests for src/components/filters/FilterBar.tsx
// =============================================================================

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterCriteria } from "@/lib/recipes";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

// Mock the recipes module to avoid localStorage issues in tests
jest.mock("@/lib/recipes", () => {
  const actual = jest.requireActual("@/lib/recipes");
  return {
    ...actual,
    getAllViews: () => actual.BUILT_IN_VIEWS,
    loadCustomViews: () => [],
    saveCustomViews: jest.fn(),
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FilterBar", () => {
  const defaultFilter: FilterCriteria = {};
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  // -------------------------------------------------------------------------
  // Search input
  // -------------------------------------------------------------------------

  describe("search input", () => {
    it("renders a search input with placeholder", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toBeInTheDocument();
    });

    it("displays the current search value from filter prop", () => {
      const filterWithSearch: FilterCriteria = { search: "auth bug" };
      render(
        <FilterBar
          filter={filterWithSearch}
          onFilterChange={mockOnFilterChange}
        />,
      );
      const searchInput = screen.getByPlaceholderText("Search...");
      expect(searchInput).toHaveValue("auth bug");
    });

    it("calls onFilterChange with search value when typed into", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "login" } });
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: "login" }),
      );
    });

    it("calls onFilterChange with undefined search when input is cleared", () => {
      const filterWithSearch: FilterCriteria = { search: "test" };
      render(
        <FilterBar
          filter={filterWithSearch}
          onFilterChange={mockOnFilterChange}
        />,
      );
      const searchInput = screen.getByPlaceholderText("Search...");
      fireEvent.change(searchInput, { target: { value: "" } });
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Dropdown buttons
  // -------------------------------------------------------------------------

  describe("dropdown buttons", () => {
    it("renders a Status dropdown button", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders a Priority dropdown button", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      expect(screen.getByText("Priority")).toBeInTheDocument();
    });

    it("renders a Type dropdown button", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("opens the Status dropdown when clicked", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      const statusButton = screen.getByText("Status");
      fireEvent.click(statusButton);

      // After clicking, the dropdown should show status options
      // STATUS_CONFIG labels: Open, In Progress, Blocked, Deferred, Closed, Pinned
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Blocked")).toBeInTheDocument();
      expect(screen.getByText("Deferred")).toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();
      expect(screen.getByText("Pinned")).toBeInTheDocument();
    });

    it("opens the Priority dropdown when clicked", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      const priorityButton = screen.getByText("Priority");
      fireEvent.click(priorityButton);

      // PRIORITY_CONFIG labels: Critical, High, Medium, Low, Minimal
      expect(screen.getByText("Critical")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("Minimal")).toBeInTheDocument();
    });

    it("opens the Type dropdown when clicked", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      const typeButton = screen.getByText("Type");
      fireEvent.click(typeButton);

      // TYPE_LABELS: Bug, Feature, Task, Epic, Chore
      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Feature")).toBeInTheDocument();
      expect(screen.getByText("Task")).toBeInTheDocument();
      expect(screen.getByText("Epic")).toBeInTheDocument();
      expect(screen.getByText("Chore")).toBeInTheDocument();
    });

    it("calls onFilterChange when a status option is selected", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      // Open the Status dropdown
      fireEvent.click(screen.getByText("Status"));
      // Click the "Blocked" option
      fireEvent.click(screen.getByText("Blocked"));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: ["blocked"] }),
      );
    });

    it("calls onFilterChange when a type option is selected", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      // Open the Type dropdown
      fireEvent.click(screen.getByText("Type"));
      // Click the "Bug" option
      fireEvent.click(screen.getByText("Bug"));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ types: ["bug"] }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Clear filters
  // -------------------------------------------------------------------------

  describe("clear filters", () => {
    it("does not show Clear button when filter is default (empty)", () => {
      render(
        <FilterBar filter={defaultFilter} onFilterChange={mockOnFilterChange} />,
      );
      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("shows Clear button when filters are active", () => {
      const activeFilter: FilterCriteria = { statuses: ["open"] };
      render(
        <FilterBar
          filter={activeFilter}
          onFilterChange={mockOnFilterChange}
        />,
      );
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("resets filters when Clear is clicked", () => {
      const activeFilter: FilterCriteria = { statuses: ["open"] };
      render(
        <FilterBar
          filter={activeFilter}
          onFilterChange={mockOnFilterChange}
        />,
      );
      fireEvent.click(screen.getByText("Clear"));
      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });
});
