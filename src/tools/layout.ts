import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function layoutWorkspace(): Promise<ToolResult> {
  const result = await execObsidian(["workspace", "ids"]);
  return success(result || "Empty workspace.");
}

export async function layoutSplit(p: { direction: string }): Promise<ToolResult> {
  const result = await execObsidian(["command", `id=workspace:split-${p.direction}`]);
  return success(result || `Split pane ${p.direction}ly.`);
}

export async function layoutClose(p: { target?: string }): Promise<ToolResult> {
  const commandMap: Record<string, string> = {
    current: "workspace:close",
    others: "workspace:close-others",
    all: "workspace:close-all",
  };
  const commandId = commandMap[p.target || "current"];
  const result = await execObsidian(["command", `id=${commandId}`]);
  return success(result || `Closed ${p.target || "current"} tab(s).`);
}

export async function layoutSidebar(p: { side: string }): Promise<ToolResult> {
  const commandId = `app:toggle-${p.side}-sidebar`;
  const result = await execObsidian(["command", `id=${commandId}`]);
  return success(result || `Toggled ${p.side} sidebar.`);
}

export async function layoutFocus(p: { direction: string }): Promise<ToolResult> {
  const result = await execObsidian(["command", `id=editor:focus-${p.direction}`]);
  return success(result || `Focused ${p.direction}.`);
}

export async function layoutOpen(p: { path: string }): Promise<ToolResult> {
  const result = await execObsidian(["open", `path=${p.path}`]);
  return success(result || `Opened: ${p.path}`);
}

export async function layoutTabs(p: { path?: string }): Promise<ToolResult> {
  if (p.path) {
    const args = ["tab:open", `path=${p.path}`];
    const result = await execObsidian(args);
    return success(result || "Opened new tab.");
  }
  const result = await execObsidian(["tabs", "ids"]);
  return success(result || "No tabs open.");
}

export async function layoutRecents(): Promise<ToolResult> {
  const result = await execObsidian(["recents"]);
  return success(result || "No recent files.");
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  workspace: layoutWorkspace,
  split: layoutSplit,
  close: layoutClose,
  sidebar: layoutSidebar,
  focus: layoutFocus,
  open: layoutOpen,
  tabs: layoutTabs,
  recents: layoutRecents,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "layout",
    `Control Obsidian window layout, tabs, and navigation.

Actions:
- workspace: Show workspace layout tree with tab IDs (no params)
- split: Split current pane (direction required: "vertical" or "horizontal")
- close: Close tab(s) (target optional: "current", "others", or "all")
- sidebar: Toggle a sidebar (side required: "left" or "right")
- focus: Focus tab group by direction (direction required: "left", "right", "top", or "bottom")
- open: Open a file (path required)
- tabs: Open a new tab or list tabs (path optional; omit to list all tabs)
- recents: List recently opened files (no params)`,
    {
      action: z
        .enum(["workspace", "split", "close", "sidebar", "focus", "open", "tabs", "recents"])
        .describe("Action to perform"),
      path: z.string().optional().describe("File path (for open, tabs)"),
      direction: z
        .enum(["vertical", "horizontal", "left", "right", "top", "bottom"])
        .optional()
        .describe("Direction (for split or focus)"),
      side: z.enum(["left", "right"]).optional().describe("Sidebar side (for sidebar)"),
      target: z
        .enum(["current", "others", "all"])
        .optional()
        .describe("Close target (for close, default: current)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`layout.${params.action} failed: ${(e as Error).message}`);
      }
    }
  );
}
