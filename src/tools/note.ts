import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error, type ToolResult } from "../types.js";

// --- Handler functions ---

export async function noteCreate(p: {
  path: string;
  content?: string;
  open?: boolean;
  newtab?: boolean;
}): Promise<ToolResult> {
  const args = ["create", `path=${p.path}`];
  if (p.content) args.push(`content=${p.content}`);
  if (p.open) args.push("open");
  if (p.newtab) args.push("newtab");
  const result = await execObsidian(args);
  return success(result || `Created note: ${p.path}`);
}

export async function noteRead(p: { path: string }): Promise<ToolResult> {
  const result = await execObsidian(["read", `path=${p.path}`]);
  return success(result);
}

export async function noteWrite(p: { path: string; content: string }): Promise<ToolResult> {
  const result = await execObsidian(["create", `path=${p.path}`, `content=${p.content}`, "overwrite"]);
  return success(result || `Wrote to note: ${p.path}`);
}

export async function noteAppend(p: { path: string; content: string }): Promise<ToolResult> {
  const result = await execObsidian(["append", `path=${p.path}`, `content=${p.content}`]);
  return success(result || `Appended to note: ${p.path}`);
}

export async function notePrepend(p: { path: string; content: string }): Promise<ToolResult> {
  const result = await execObsidian(["prepend", `path=${p.path}`, `content=${p.content}`]);
  return success(result || `Prepended to note: ${p.path}`);
}

export async function noteDelete(p: { path: string }): Promise<ToolResult> {
  const result = await execObsidian(["delete", `path=${p.path}`]);
  return success(result || `Deleted note: ${p.path}`);
}

export async function noteMove(p: { path: string; destination: string }): Promise<ToolResult> {
  const result = await execObsidian(["move", `path=${p.path}`, `to=${p.destination}`]);
  return success(result || `Moved note: ${p.path} → ${p.destination}`);
}

export async function noteSearch(p: { query: string; format?: string }): Promise<ToolResult> {
  const fmt = p.format || "json";
  const result = await execObsidian(["search", `query=${p.query}`, `format=${fmt}`]);
  return success(result || "No results found.");
}

export async function noteList(p: { folder?: string }): Promise<ToolResult> {
  const args = ["files"];
  if (p.folder) args.push(`folder=${p.folder}`);
  const result = await execObsidian(args);
  return success(result || "No files found.");
}

// --- Handler map ---

export const handlers: Record<string, (p: any) => Promise<ToolResult>> = {
  create: noteCreate,
  read: noteRead,
  write: noteWrite,
  append: noteAppend,
  prepend: notePrepend,
  delete: noteDelete,
  move: noteMove,
  search: noteSearch,
  list: noteList,
};

// --- Registration ---

export function register(server: McpServer): void {
  server.tool(
    "note",
    `Manage notes in the vault.

Actions:
- create: Create a note (path required; content, open, newtab optional)
- read: Read note content (path required)
- write: Overwrite note content (path, content required)
- append: Append to a note (path, content required)
- prepend: Prepend to a note (path, content required)
- delete: Delete a note (path required)
- move: Move/rename a note (path, destination required)
- search: Search notes (query required; format optional)
- list: List files in a folder (folder optional, defaults to vault root)`,
    {
      action: z
        .enum(["create", "read", "write", "append", "prepend", "delete", "move", "search", "list"])
        .describe("Action to perform"),
      path: z.string().optional().describe("Path to the note"),
      content: z.string().optional().describe("Note content"),
      destination: z.string().optional().describe("Destination path (for move)"),
      query: z.string().optional().describe("Search query (for search)"),
      format: z.enum(["json", "text"]).optional().describe("Output format for search (default: json)"),
      folder: z.string().optional().describe("Folder path (for list, defaults to vault root)"),
      open: z.boolean().optional().describe("Open note after creating"),
      newtab: z.boolean().optional().describe("Open in a new tab"),
    },
    async (params) => {
      try {
        return await handlers[params.action](params);
      } catch (e) {
        return error(`note.${params.action} failed: ${(e as Error).message}`);
      }
    }
  );
}
