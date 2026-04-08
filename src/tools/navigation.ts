import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "open",
    "Open a file in Obsidian",
    {
      path: z.string().describe("Path to the file to open"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["open", `path=${path}`]);
        return success(result || `Opened: ${path}`);
      } catch (e) {
        return error(`Failed to open file: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "tab_open",
    "Open a new tab in Obsidian",
    {
      path: z.string().optional().describe("Path to open in new tab"),
    },
    async ({ path }) => {
      try {
        const args = ["tab:open"];
        if (path) args.push(`path=${path}`);
        const result = await execObsidian(args);
        return success(result || "Opened new tab.");
      } catch (e) {
        return error(`Failed to open tab: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "tabs_list",
    "List all open tabs in Obsidian with their IDs",
    {},
    async () => {
      try {
        const result = await execObsidian(["tabs", "ids"]);
        return success(result || "No tabs open.");
      } catch (e) {
        return error(`Failed to list tabs: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "recents",
    "List recently opened files",
    {},
    async () => {
      try {
        const result = await execObsidian(["recents"]);
        return success(result || "No recent files.");
      } catch (e) {
        return error(`Failed to get recents: ${(e as Error).message}`);
      }
    }
  );
}
