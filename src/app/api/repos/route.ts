import { NextRequest, NextResponse } from "next/server";
import {
  getRepos,
  addRepo,
  removeRepo,
  setActiveRepo,
  scanWatchDirs,
  setWatchDirs,
  getWatchDirs,
} from "@/lib/repo-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Auto-scan watch directories for new projects on every GET
    await scanWatchDirs();
    const store = await getRepos();
    const watchDirs = await getWatchDirs();
    return NextResponse.json({ ...store, watchDirs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path: bodyPath, name, dirs } = body as {
      action: "add" | "remove" | "set-active" | "scan" | "set-watch-dirs";
      path?: string;
      name?: string;
      dirs?: string[];
    };

    if (!action) {
      return NextResponse.json(
        { error: "Missing action" },
        { status: 400 },
      );
    }

    let store;
    switch (action) {
      case "add":
        if (!bodyPath) return NextResponse.json({ error: "Missing path" }, { status: 400 });
        store = await addRepo(bodyPath, name);
        break;
      case "remove":
        if (!bodyPath) return NextResponse.json({ error: "Missing path" }, { status: 400 });
        store = await removeRepo(bodyPath);
        break;
      case "set-active":
        if (!bodyPath) return NextResponse.json({ error: "Missing path" }, { status: 400 });
        store = await setActiveRepo(bodyPath);
        break;
      case "scan": {
        const newPaths = await scanWatchDirs();
        store = await getRepos();
        return NextResponse.json({ ...store, newlyRegistered: newPaths });
      }
      case "set-watch-dirs":
        if (!Array.isArray(dirs)) {
          return NextResponse.json({ error: "Missing dirs array" }, { status: 400 });
        }
        store = await setWatchDirs(dirs);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json(store);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
