"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BeadsComment } from "@/lib/types";

export function useComments(issueId: string | null) {
  return useQuery<BeadsComment[]>({
    queryKey: ["comments", issueId],
    queryFn: async () => {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(issueId!)}/comments`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!issueId,
    refetchInterval: 30_000,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { issueId: string; text: string }>({
    mutationFn: async ({ issueId, text }) => {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.issueId],
      });
    },
  });
}
