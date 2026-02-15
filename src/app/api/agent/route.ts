import { NextRequest, NextResponse } from "next/server";
import { launchAgent, getAgentStatus, stopAgent } from "@/lib/agent-launcher";
import { getAllRepoPaths, getRepos } from "@/lib/repo-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/agent — Get current agent status
 */
export async function GET() {
  try {
    const status = await getAgentStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/agent — Launch or stop an agent
 *
 * Body for launch:
 *   { action: "launch", repoPath: string, prompt: string, model?: string, maxTurns?: number, allowedTools?: string }
 *
 * Body for stop:
 *   { action: "stop" }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action === "stop") {
    try {
      const result = await stopAgent();
      return NextResponse.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (action === "launch") {
    const { repoPath, prompt, model, maxTurns, allowedTools } = body;

    if (!repoPath || typeof repoPath !== "string") {
      return NextResponse.json({ error: "Missing repoPath" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Verify the repo is in our configured list
    const repoPaths = await getAllRepoPaths();
    if (!repoPaths.includes(repoPath)) {
      return NextResponse.json(
        { error: `Repository not configured: ${repoPath}` },
        { status: 400 },
      );
    }

    // Look up repo name
    const store = await getRepos();
    const repo = store.repos.find((r) => r.path === repoPath);

    try {
      const session = await launchAgent({
        repoPath,
        repoName: repo?.name,
        prompt: prompt as string,
        model: typeof model === "string" ? model : undefined,
        maxTurns: typeof maxTurns === "number" ? maxTurns : undefined,
        allowedTools: typeof allowedTools === "string" ? allowedTools : undefined,
      });
      return NextResponse.json({ launched: true, session });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}. Must be "launch" or "stop"` },
    { status: 400 },
  );
}
