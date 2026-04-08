import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function tagInfo(p: { tag: string }): Promise<ToolResult> {
  const result = await execObsidian(["tag", `tag=${p.tag}`]);
  return success(result || `No information found for tag "${p.tag}".`);
}

export async function tagList(): Promise<ToolResult> {
  const result = await execObsidian(["tags"]);
  return success(result || "No tags found.");
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  info: tagInfo,
  list: tagList,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "tag",
    `Manage tags in the vault.

Actions:
- info: Get usage info for a tag (tag required, with or without #)
- list: List all tags in the vault (no params)`,
    {
      action: z.enum(["info", "list"]).describe("Action to perform"),
      tag: z.string().optional().describe("Tag name (for info, with or without #)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`tag.${params.action} failed: ${(e as Error).message}`);
      }
    }
  );
}
