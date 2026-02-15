"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RepoStore } from "@/lib/repo-config";

export function useRepos() {
  return useQuery<RepoStore>({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return res.json();
    },
    // Repo config rarely changes — no polling, only refetch on focus.
    refetchInterval: false,
    staleTime: 60_000,
  });
}

export function useRepoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      action: "add" | "remove" | "set-active" | "scan" | "set-watch-dirs";
      path?: string;
      name?: string;
      dirs?: string[];
    }) => {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json() as Promise<RepoStore>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] });
      // Invalidate all data queries since the active repo may have changed
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["priority"] });
      queryClient.invalidateQueries({ queryKey: ["diff"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["token-usage"] });
    },
  });
}
