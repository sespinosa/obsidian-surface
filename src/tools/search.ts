import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execObsidian } from "../cli.js";
import { error, success, type ToolResult, validatePath } from "../types.js";

// --- Handler functions ---

export async function searchText(p: {
  query: string;
  format?: string;
}): Promise<ToolResult> {
  const args = ["search", `query=${p.query}`];
  if (p.format) args.push(`format=${p.format}`);
  const result = await execObsidian(args);
  return success(result || "No results found.");
}

export async function searchContext(p: { query: string }): Promise<ToolResult> {
  const result = await execObsidian(["search:context", `query=${p.query}`]);
  return success(result || "No results found.");
}

export async function searchBacklinks(p: {
  path: string;
}): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian(["backlinks", `path=${p.path}`]);
  return success(result || "No backlinks found.");
}

export async function searchLinks(p: { path: string }): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian(["links", `path=${p.path}`]);
  return success(result || "No outgoing links found.");
}

export async function searchOutline(p: { path: string }): Promise<ToolResult> {
  p.path = validatePath(p.path);
  const result = await execObsidian(["outline", `path=${p.path}`]);
  return success(result || "No headings found.");
}

export async function searchOrphans(): Promise<ToolResult> {
  const result = await execObsidian(["orphans"]);
  return success(result || "No orphan files found.");
}

export async function searchDeadends(): Promise<ToolResult> {
  const result = await execObsidian(["deadends"]);
  return success(result || "No dead-end files found.");
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  text: searchText,
  context: searchContext,
  backlinks: searchBacklinks,
  links: searchLinks,
  outline: searchOutline,
  orphans: searchOrphans,
  deadends: searchDeadends,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "search",
    `Search the vault and explore note relationships.

Actions:
- text: Search for text (query required; format optional: "json" or "text")
- context: Search with surrounding line context (query required)
- backlinks: List notes that link to a file (path required)
- links: List outgoing links from a note (path required)
- outline: Show heading tree of a note (path required)
- orphans: List files with no incoming links (no params)
- deadends: List files with no outgoing links (no params)`,
    {
      action: z
        .enum([
          "text",
          "context",
          "backlinks",
          "links",
          "outline",
          "orphans",
          "deadends",
        ])
        .describe("Action to perform"),
      query: z.string().optional().describe("Search query (for text, context)"),
      path: z
        .string()
        .optional()
        .describe("File path (for backlinks, links, outline)"),
      format: z
        .enum(["json", "text"])
        .optional()
        .describe("Output format (for text, default: text)"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`search.${params.action} failed: ${(e as Error).message}`);
      }
    },
  );
}
