"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHealth } from "@/hooks/useHealth";
import { useRepos, useRepoMutation } from "@/hooks/useRepos";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
        />
      </svg>
    ),
  },
  {
    label: "Board",
    href: "/board",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m8 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
        />
      </svg>
    ),
  },
  {
    label: "Fleet",
    href: "/fleet",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    label: "Activity",
    href: "/activity",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/insights",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    label: "Diff",
    href: "/diff",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

function RepoSelector() {
  const { data } = useRepos();
  const mutation = useRepoMutation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (!data || data.repos.length < 2) return null;

  const isAllProjects = data.activeRepo === "__all__";
  const activeRepo = data.repos.find((r) => r.path === data.activeRepo);
  const activeLabel = isAllProjects ? "All Projects" : activeRepo?.name ?? "Select repo";

  return (
    <div className="px-3 py-3 border-b border-border-default" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm
          bg-surface-0 border border-border-default
          text-gray-100 hover:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-4 h-4 text-gray-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span className="truncate">{activeLabel}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 py-1 rounded-md bg-surface-0 border border-border-default shadow-lg">
          {/* All Projects aggregation option */}
          <button
            onClick={() => {
              if (!isAllProjects) {
                mutation.mutate({ action: "set-active", path: "__all__" });
              }
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
              ${
                isAllProjects
                  ? "text-status-open bg-status-open/5"
                  : "text-gray-300 hover:text-white hover:bg-surface-2"
              }`}
          >
            <span className="truncate flex-1">All Projects</span>
            {isAllProjects && (
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="border-b border-border-default my-1" />
          {data.repos.map((repo) => {
            const isActive = repo.path === data.activeRepo;
            return (
              <button
                key={repo.path}
                onClick={() => {
                  if (!isActive) {
                    mutation.mutate({ action: "set-active", path: repo.path });
                  }
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                  ${
                    isActive
                      ? "text-status-open bg-status-open/5"
                      : "text-gray-300 hover:text-white hover:bg-surface-2"
                  }`}
              >
                <span className="truncate flex-1">{repo.name}</span>
                {isActive && (
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: health } = useHealth();
  const bvAvailable = health?.bv_available ?? false;

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-surface-1 border-r border-border-default z-30">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border-default">
        <div className="w-8 h-8 rounded-lg bg-status-open/20 flex items-center justify-center">
          <span className="text-status-open font-bold text-sm">B</span>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">
          Beads Web
        </span>
      </div>

      {/* Repo Selector */}
      <RepoSelector />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-surface-2 text-white border-l-2 border-status-open"
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface-2/50 border-l-2 border-transparent"
                }
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Graph Health */}
      <div className="px-4 py-2 border-t border-border-default">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={bvAvailable ? "text-status-open" : "text-status-progress"}>●</span>
          <span>{bvAvailable ? "bv connected" : "JSONL fallback"}</span>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-6 py-4 border-t border-border-default">
        <p className="text-xs text-gray-500">Beads Web v0.1</p>
      </div>
    </aside>
  );
}
