import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "daily",
    "Open, read, or append to the daily note",
    {
      action: z.enum(["open", "read", "append"]).describe("Action to perform"),
      content: z.string().optional().describe("Content to append (required when action is 'append')"),
    },
    async ({ action, content }) => {
      try {
        if (action === "open") {
          const result = await execObsidian(["daily"]);
          return success(result || "Opened daily note.");
        } else if (action === "read") {
          const result = await execObsidian(["daily:read"]);
          return success(result || "Daily note is empty.");
        } else {
          if (!content) return error("Content is required for append action.");
          const result = await execObsidian(["daily:append", `content=${content}`]);
          return success(result || "Appended to daily note.");
        }
      } catch (e) {
        return error(`Failed to ${action} daily note: ${(e as Error).message}`);
      }
    }
  );
}
