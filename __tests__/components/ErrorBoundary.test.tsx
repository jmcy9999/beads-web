// =============================================================================
// Tests for src/components/ui/ErrorBoundary.tsx
// =============================================================================

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A component that throws on demand, controlled via props
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Child content is fine</div>;
}

// Suppress React's noisy error boundary logging during tests
const originalConsoleError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React error boundary warnings and our own [ErrorBoundary] logs
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("Error: Uncaught") ||
      msg.includes("The above error occurred") ||
      msg.includes("[ErrorBoundary]")
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ErrorBoundary", () => {
  // -------------------------------------------------------------------------
  // Normal rendering
  // -------------------------------------------------------------------------

  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("does not show error UI when children render fine", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Child content is fine")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error catching
  // -------------------------------------------------------------------------

  it("catches errors and shows the default error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("displays the error message in the error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
  });

  it("shows the warning icon in the error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    // The component renders &#x26A0; which is the warning sign character
    expect(screen.getByText("\u26A0")).toBeInTheDocument();
  });

  it("does not render children when an error has been caught", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Child content is fine")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Custom fallback
  // -------------------------------------------------------------------------

  it("renders custom fallback when provided and an error occurs", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom error fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Retry / Try again button
  // -------------------------------------------------------------------------

  it("shows a Try again button in the error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("resets error state and re-renders children when Try again is clicked", () => {
    // We use a stateful wrapper to control whether the child throws.
    // On first render it throws; after clicking "Try again", it should not throw.
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error("Boom");
      }
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Should be showing error UI
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Recovered successfully")).not.toBeInTheDocument();

    // Fix the "error" condition
    shouldThrow = false;

    // Click Try again
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Should now show recovered content
    expect(screen.getByText("Recovered successfully")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("shows error UI again if retry also throws", () => {
    function AlwaysThrows() {
      throw new Error("Persistent failure");
      return null; // eslint-disable-line no-unreachable
    }

    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click Try again - it will throw again
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Error UI should still be shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Persistent failure")).toBeInTheDocument();
  });
});
