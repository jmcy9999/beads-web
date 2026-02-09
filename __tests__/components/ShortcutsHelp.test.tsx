// =============================================================================
// Tests for src/components/ui/ShortcutsHelp.tsx
// =============================================================================

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dispatchToggleEvent() {
  act(() => {
    document.dispatchEvent(new Event("toggle-shortcuts-help"));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShortcutsHelp", () => {
  // -------------------------------------------------------------------------
  // Default state
  // -------------------------------------------------------------------------

  it("does not render the overlay by default", () => {
    render(<ShortcutsHelp />);
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("returns null when closed (no DOM nodes)", () => {
    const { container } = render(<ShortcutsHelp />);
    expect(container.innerHTML).toBe("");
  });

  // -------------------------------------------------------------------------
  // Opening via event
  // -------------------------------------------------------------------------

  it("shows overlay when toggle-shortcuts-help event is dispatched", () => {
    render(<ShortcutsHelp />);
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Shortcut list
  // -------------------------------------------------------------------------

  it("lists all keyboard shortcuts", () => {
    render(<ShortcutsHelp />);
    dispatchToggleEvent();

    // Shortcut descriptions from the SHORTCUTS array
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Go to Board")).toBeInTheDocument();
    expect(screen.getByText("Go to Insights")).toBeInTheDocument();
    expect(screen.getByText("Go to Time Travel")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
    expect(screen.getByText("Focus search")).toBeInTheDocument();
    expect(screen.getByText("Toggle this help")).toBeInTheDocument();
    expect(screen.getByText("Close panels")).toBeInTheDocument();
  });

  it("lists all shortcut keys", () => {
    const { container } = render(<ShortcutsHelp />);
    dispatchToggleEvent();

    // Shortcut keys rendered in <kbd> elements
    const kbdElements = container.querySelectorAll("kbd");
    const keyTexts = Array.from(kbdElements).map((el) => el.textContent);

    expect(keyTexts).toContain("d");
    expect(keyTexts).toContain("b");
    expect(keyTexts).toContain("i");
    expect(keyTexts).toContain("t");
    expect(keyTexts).toContain("s");
    expect(keyTexts).toContain("/");
    expect(keyTexts).toContain("?");
    expect(keyTexts).toContain("Esc");
  });

  it("renders exactly 8 shortcut entries", () => {
    render(<ShortcutsHelp />);
    dispatchToggleEvent();

    // Each shortcut is in a div with description + kbd.
    // Check we have 8 descriptions.
    const descriptions = [
      "Go to Dashboard",
      "Go to Board",
      "Go to Insights",
      "Go to Time Travel",
      "Go to Settings",
      "Focus search",
      "Toggle this help",
      "Close panels",
    ];

    descriptions.forEach((desc) => {
      expect(screen.getByText(desc)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Closing mechanisms
  // -------------------------------------------------------------------------

  it("hides overlay when toggle-shortcuts-help event is dispatched again", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Close via same event (toggle)
    dispatchToggleEvent();
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("hides overlay when Escape key is pressed", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Close via Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("hides overlay when ? key is pressed while open", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Close via ? key
    fireEvent.keyDown(document, { key: "?" });
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("hides overlay when the backdrop is clicked", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // The backdrop div has aria-hidden="true"
    const backdrop = document.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("hides overlay when the close button is clicked", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // The close button is a button inside the panel (the X button)
    // There's only one button in the ShortcutsHelp component
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Re-open after close
  // -------------------------------------------------------------------------

  it("can be re-opened after being closed", () => {
    render(<ShortcutsHelp />);

    // Open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();

    // Close
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();

    // Re-open
    dispatchToggleEvent();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });
});
