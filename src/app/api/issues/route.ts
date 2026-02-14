import { NextResponse } from "next/server";
import { getPlan, getAllProjectsPlan } from "@/lib/bv-client";
import { getActiveProjectPath, getAllRepoPaths, ALL_PROJECTS_SENTINEL } from "@/lib/repo-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const projectPath = await getActiveProjectPath();

    if (projectPath === ALL_PROJECTS_SENTINEL) {
      const paths = await getAllRepoPaths();
      const data = await getAllProjectsPlan(paths);
      return NextResponse.json(data);
    }

    const data = await getPlan(projectPath);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /api/issues]", message);
    if (message.includes("BEADS_PROJECT_PATH")) {
      return NextResponse.json(
        { error: "BEADS_PROJECT_PATH not configured", detail: message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch issues", detail: message },
      { status: 500 },
    );
  }
}
