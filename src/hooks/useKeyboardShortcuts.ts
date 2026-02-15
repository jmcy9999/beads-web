"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts matching bv's key bindings:
 * - / : Focus search (if FilterBar is present)
 * - d : Navigate to Dashboard
 * - b : Navigate to Board
 * - f : Navigate to Fleet
 * - i : Navigate to Insights
 * - t : Navigate to Time Travel (Diff)
 * - s : Navigate to Settings
 * - ? : Show keyboard shortcuts help
 *
 * Shortcuts are disabled when focus is on an input/textarea/select.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't intercept modifier key combos
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "d":
          e.preventDefault();
          router.push("/");
          break;
        case "b":
          e.preventDefault();
          router.push("/board");
          break;
        case "f":
          e.preventDefault();
          router.push("/fleet");
          break;
        case "i":
          e.preventDefault();
          router.push("/insights");
          break;
        case "t":
          e.preventDefault();
          router.push("/diff");
          break;
        case "s":
          e.preventDefault();
          router.push("/settings");
          break;
        case "/": {
          e.preventDefault();
          // Focus the search input if one exists
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-search-input]',
          );
          if (searchInput) searchInput.focus();
          break;
        }
        case "?":
          e.preventDefault();
          // Toggle shortcuts help overlay
          document.dispatchEvent(new CustomEvent("toggle-shortcuts-help"));
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}
