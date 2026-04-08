import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "workspace",
    "Show the Obsidian workspace layout tree with tab IDs",
    {},
    async () => {
      try {
        const result = await execObsidian(["workspace", "ids"]);
        return success(result || "Empty workspace.");
      } catch (e) {
        return error(`Failed to get workspace: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "split",
    "Split the current pane in Obsidian",
    {
      direction: z.enum(["vertical", "horizontal"]).describe("Split direction"),
    },
    async ({ direction }) => {
      try {
        const result = await execObsidian(["command", `id=workspace:split-${direction}`]);
        return success(result || `Split pane ${direction}ly.`);
      } catch (e) {
        return error(`Failed to split: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "close_tab",
    "Close tab(s) in Obsidian",
    {
      target: z
        .enum(["current", "others", "all"])
        .optional()
        .describe("What to close (default: current)"),
    },
    async ({ target }) => {
      try {
        const commandMap: Record<string, string> = {
          current: "workspace:close",
          others: "workspace:close-others",
          all: "workspace:close-all",
        };
        const commandId = commandMap[target || "current"];
        const result = await execObsidian(["command", `id=${commandId}`]);
        return success(result || `Closed ${target || "current"} tab(s).`);
      } catch (e) {
        return error(`Failed to close tab: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "sidebar",
    "Toggle or control a sidebar in Obsidian",
    {
      side: z.enum(["left", "right"]).describe("Which sidebar"),
      action: z
        .enum(["toggle", "open", "close"])
        .optional()
        .describe("Action (default: toggle)"),
    },
    async ({ side, action }) => {
      try {
        const act = action || "toggle";
        const commandId = `app:${act}-${side}-sidebar`;
        const result = await execObsidian(["command", `id=${commandId}`]);
        return success(result || `${act} ${side} sidebar.`);
      } catch (e) {
        return error(`Failed to control sidebar: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "focus",
    "Focus a tab group by direction",
    {
      direction: z.enum(["left", "right", "top", "bottom"]).describe("Direction to focus"),
    },
    async ({ direction }) => {
      try {
        const result = await execObsidian(["command", `id=editor:focus-${direction}`]);
        return success(result || `Focused ${direction}.`);
      } catch (e) {
        return error(`Failed to focus: ${(e as Error).message}`);
      }
    }
  );
}
