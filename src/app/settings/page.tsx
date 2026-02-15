"use client";

import { useState } from "react";
import { useRepos, useRepoMutation } from "@/hooks/useRepos";

function RepoListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-64 animate-pulse rounded bg-surface-2" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useRepos();
  const mutation = useRepoMutation();

  const [addPath, setAddPath] = useState("");
  const [addName, setAddName] = useState("");
  const [watchDirInput, setWatchDirInput] = useState("");
  const [scanResult, setScanResult] = useState<string[] | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addPath.trim()) return;
    mutation.mutate(
      { action: "add", path: addPath.trim(), name: addName.trim() || undefined },
      {
        onSuccess: () => {
          setAddPath("");
          setAddName("");
        },
      },
    );
  }

  function handleRemove(repoPath: string) {
    mutation.mutate({ action: "remove", path: repoPath });
  }

  function handleSetActive(repoPath: string) {
    mutation.mutate({ action: "set-active", path: repoPath });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Repositories Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Repositories</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage Beads-enabled repositories. The active repository is used for
            all dashboard data.
          </p>
        </div>

        {/* Error display */}
        {mutation.isError && (
          <div className="rounded-lg border border-status-blocked/30 bg-status-blocked/10 px-4 py-3">
            <p className="text-sm text-red-400">{mutation.error?.message}</p>
          </div>
        )}

        {/* Repo list */}
        {isLoading ? (
          <RepoListSkeleton />
        ) : data && data.repos.length > 0 ? (
          <div className="space-y-2">
            {data.repos.map((repo) => {
              const isActive = repo.path === data.activeRepo;
              return (
                <div
                  key={repo.path}
                  className={`card p-4 flex items-center gap-4 ${
                    isActive ? "border-status-open/40" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">
                        {repo.name}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-open/15 text-status-open border border-status-open/30">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5 font-mono">
                      {repo.path}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(repo.path)}
                        disabled={mutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-md
                          text-gray-400 hover:text-white
                          bg-surface-2 hover:bg-surface-3
                          border border-border-default
                          transition-colors disabled:opacity-50"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(repo.path)}
                      disabled={mutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-md
                        text-gray-500 hover:text-red-400
                        bg-surface-2 hover:bg-red-500/10
                        border border-border-default hover:border-red-500/30
                        transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-sm text-gray-400">No repositories configured.</p>
            <p className="text-xs text-gray-500 mt-1">
              Add a repository below to get started.
            </p>
          </div>
        )}

        {/* Add Repository Form */}
        <form onSubmit={handleAdd} className="card p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-100">
            Add Repository
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label
                htmlFor="repo-path"
                className="block text-xs font-medium text-gray-400"
              >
                Path <span className="text-gray-600">(required)</span>
              </label>
              <input
                id="repo-path"
                type="text"
                value={addPath}
                onChange={(e) => setAddPath(e.target.value)}
                placeholder="/path/to/your/project"
                className="w-full px-3 py-2 text-sm rounded-md font-mono
                  bg-surface-0 border border-border-default
                  text-gray-100 placeholder-gray-600
                  focus:outline-none focus:border-status-open/50 focus:ring-1 focus:ring-status-open/30
                  transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="repo-name"
                className="block text-xs font-medium text-gray-400"
              >
                Name <span className="text-gray-600">(optional)</span>
              </label>
              <input
                id="repo-name"
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="my-project"
                className="w-full px-3 py-2 text-sm rounded-md
                  bg-surface-0 border border-border-default
                  text-gray-100 placeholder-gray-600
                  focus:outline-none focus:border-status-open/50 focus:ring-1 focus:ring-status-open/30
                  transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!addPath.trim() || mutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-md
                bg-status-open/15 text-status-open
                border border-status-open/30
                hover:bg-status-open/25
                transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </section>

      {/* Watch Directories Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Watch Directories</h2>
          <p className="text-sm text-gray-500 mt-1">
            Directories to scan for new Beads-enabled projects. The dashboard
            auto-discovers projects containing a <code className="text-gray-400">.beads/</code> directory.
          </p>
        </div>

        {/* Current watch dirs */}
        {(() => {
          const watchDirs: string[] = ((data as unknown as { watchDirs?: string[] })?.watchDirs) ?? [];
          return watchDirs.length > 0 ? (
            <div className="space-y-2">
              {watchDirs.map((dir) => (
                <div
                  key={dir}
                  className="card p-3 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="flex-1 text-sm font-mono text-gray-300 truncate">{dir}</span>
                  <button
                    onClick={() => {
                      mutation.mutate({ action: "set-watch-dirs", dirs: watchDirs.filter((d) => d !== dir) });
                    }}
                    disabled={mutation.isPending}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 bg-surface-2 hover:bg-red-500/10 border border-border-default hover:border-red-500/30 rounded-md transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-gray-400">No watch directories configured.</p>
              <p className="text-xs text-gray-500 mt-1">
                Add a parent directory below. Any subdirectory with <code className="text-gray-400">.beads/</code> will be auto-registered.
              </p>
            </div>
          );
        })()}

        {/* Add watch dir */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!watchDirInput.trim()) return;
            const watchDirs: string[] = ((data as unknown as { watchDirs?: string[] })?.watchDirs) ?? [];
            mutation.mutate(
              { action: "set-watch-dirs", dirs: [...watchDirs, watchDirInput.trim()] },
              { onSuccess: () => setWatchDirInput("") },
            );
          }}
          className="flex gap-3 items-end"
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="watch-dir" className="block text-xs font-medium text-gray-400">
              Watch Directory
            </label>
            <input
              id="watch-dir"
              type="text"
              value={watchDirInput}
              onChange={(e) => setWatchDirInput(e.target.value)}
              placeholder="/path/to/parent/directory"
              className="w-full px-3 py-2 text-sm rounded-md font-mono bg-surface-0 border border-border-default text-gray-100 placeholder-gray-600 focus:outline-none focus:border-status-open/50 focus:ring-1 focus:ring-status-open/30 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!watchDirInput.trim() || mutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-md bg-status-open/15 text-status-open border border-status-open/30 hover:bg-status-open/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </form>

        {/* Manual scan button */}
        <button
          onClick={() => {
            mutation.mutate(
              { action: "scan" },
              {
                onSuccess: (resp) => {
                  const result = resp as unknown as { newlyRegistered?: string[] };
                  setScanResult(result.newlyRegistered ?? []);
                  setTimeout(() => setScanResult(null), 5000);
                },
              },
            );
          }}
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-md text-gray-400 hover:text-white bg-surface-2 hover:bg-surface-3 border border-border-default transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Scanning..." : "Scan Now"}
        </button>

        {scanResult !== null && (
          <div className="rounded-lg border border-status-open/30 bg-status-open/5 px-4 py-3">
            <p className="text-sm text-gray-300">
              {scanResult.length === 0
                ? "No new projects found."
                : `Found ${scanResult.length} new project${scanResult.length > 1 ? "s" : ""}: ${scanResult.map((p) => p.split("/").pop()).join(", ")}`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
