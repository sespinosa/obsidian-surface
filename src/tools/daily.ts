import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execObsidian } from "../cli.js";
import { error, type HandlerFn, success, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function dailyOpen(): Promise<ToolResult> {
  const result = await execObsidian(["daily"]);
  return success(result || "Opened daily note.");
}

export async function dailyRead(): Promise<ToolResult> {
  const result = await execObsidian(["daily:read"]);
  return success(result || "Daily note is empty.");
}

export async function dailyAppend(p: { content: string }): Promise<ToolResult> {
  if (!p.content) return error("Content is required for append action.");
  const result = await execObsidian(["daily:append", `content=${p.content}`]);
  return success(result || "Appended to daily note.");
}

// --- Handler map ---

export const handlers: Record<string, HandlerFn> = {
  open: dailyOpen,
  read: dailyRead,
  append: dailyAppend,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "daily",
    `Open, read, or append to the daily note.

Actions:
- open: Open the daily note (no params)
- read: Read the daily note content (no params)
- append: Append content to the daily note (content required)`,
    {
      action: z.enum(["open", "read", "append"]).describe("Action to perform"),
      content: z
        .string()
        .optional()
        .describe("Content to append (required for append)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`daily.${params.action} failed: ${(e as Error).message}`);
      }
    },
  );
}
