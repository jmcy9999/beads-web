import { NextRequest, NextResponse } from "next/server";
import { getActiveProjectPath, getAllRepoPaths, ALL_PROJECTS_SENTINEL } from "@/lib/repo-config";
import { getTokenUsageRecords, getTokenUsageSummary } from "@/lib/token-usage";
import type { TokenUsageSummary } from "@/lib/token-usage";
import type { TokenUsageRecord, IssueTokenSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Merge multiple TokenUsageSummary objects into one.
 */
function mergeSummaries(summaries: TokenUsageSummary[]): TokenUsageSummary {
  const byIssue: Record<string, IssueTokenSummary> = {};
  const totals: IssueTokenSummary = {
    issue_id: "_totals",
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_read_tokens: 0,
    total_cache_creation_tokens: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    session_count: 0,
    total_duration_ms: 0,
    total_turns: 0,
    first_session: "",
    last_session: "",
  };

  for (const s of summaries) {
    // Merge per-issue summaries
    for (const [issueId, issueSummary] of Object.entries(s.byIssue)) {
      if (!byIssue[issueId]) {
        byIssue[issueId] = { ...issueSummary };
      } else {
        const existing = byIssue[issueId];
        existing.total_input_tokens += issueSummary.total_input_tokens;
        existing.total_output_tokens += issueSummary.total_output_tokens;
        existing.total_cache_read_tokens += issueSummary.total_cache_read_tokens;
        existing.total_cache_creation_tokens += issueSummary.total_cache_creation_tokens;
        existing.total_tokens += issueSummary.total_tokens;
        existing.total_cost_usd += issueSummary.total_cost_usd;
        existing.session_count += issueSummary.session_count;
        existing.total_duration_ms += issueSummary.total_duration_ms;
        existing.total_turns += issueSummary.total_turns;
        if (!existing.first_session || issueSummary.first_session < existing.first_session) {
          existing.first_session = issueSummary.first_session;
        }
        if (!existing.last_session || issueSummary.last_session > existing.last_session) {
          existing.last_session = issueSummary.last_session;
        }
      }
    }

    // Merge totals
    totals.total_input_tokens += s.totals.total_input_tokens;
    totals.total_output_tokens += s.totals.total_output_tokens;
    totals.total_cache_read_tokens += s.totals.total_cache_read_tokens;
    totals.total_cache_creation_tokens += s.totals.total_cache_creation_tokens;
    totals.total_tokens += s.totals.total_tokens;
    totals.total_cost_usd += s.totals.total_cost_usd;
    totals.session_count += s.totals.session_count;
    totals.total_duration_ms += s.totals.total_duration_ms;
    totals.total_turns += s.totals.total_turns;
    if (!totals.first_session || (s.totals.first_session && s.totals.first_session < totals.first_session)) {
      totals.first_session = s.totals.first_session;
    }
    if (!totals.last_session || (s.totals.last_session && s.totals.last_session > totals.last_session)) {
      totals.last_session = s.totals.last_session;
    }
  }

  return { byIssue, totals };
}

export async function GET(request: NextRequest) {
  try {
    const projectPath = await getActiveProjectPath();
    const { searchParams } = request.nextUrl;
    const summary = searchParams.get("summary");
    const issueId = searchParams.get("issue_id");

    if (projectPath === ALL_PROJECTS_SENTINEL) {
      const paths = await getAllRepoPaths();

      if (summary === "true") {
        const summaries = await Promise.all(paths.map((p) => getTokenUsageSummary(p)));
        return NextResponse.json(mergeSummaries(summaries));
      }

      // Aggregate raw records across all projects
      const recordArrays = await Promise.all(paths.map((p) => getTokenUsageRecords(p)));
      let records: TokenUsageRecord[] = recordArrays.flat();
      if (issueId) {
        records = records.filter((r) => r.issue_id === issueId);
      }
      return NextResponse.json(records);
    }

    // Single project mode
    if (summary === "true") {
      const data = await getTokenUsageSummary(projectPath);
      return NextResponse.json(data);
    }

    let records = await getTokenUsageRecords(projectPath);
    if (issueId) {
      records = records.filter((r) => r.issue_id === issueId);
    }
    return NextResponse.json(records);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /api/token-usage]", message);
    if (message.includes("BEADS_PROJECT_PATH")) {
      return NextResponse.json(
        { error: "BEADS_PROJECT_PATH not configured", detail: message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch token usage", detail: message },
      { status: 500 },
    );
  }
}
