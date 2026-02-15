"use client";

import { useState, useEffect } from "react";

const SHORTCUTS = [
  { key: "d", description: "Go to Dashboard" },
  { key: "b", description: "Go to Board" },
  { key: "f", description: "Go to Fleet" },
  { key: "i", description: "Go to Insights" },
  { key: "t", description: "Go to Time Travel" },
  { key: "s", description: "Go to Settings" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Toggle this help" },
  { key: "Esc", description: "Close panels" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleToggle() {
      setOpen((prev) => !prev);
    }
    document.addEventListener("toggle-shortcuts-help", handleToggle);
    return () =>
      document.removeEventListener("toggle-shortcuts-help", handleToggle);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="card p-6 max-w-sm w-full mx-4 pointer-events-auto shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-surface-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 4l8 8M12 4L4 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm text-gray-300">{s.description}</span>
                <kbd className="px-2 py-0.5 rounded bg-surface-2 border border-border-default text-xs font-mono text-gray-400">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
