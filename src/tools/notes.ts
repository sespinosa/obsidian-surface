import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "note_create",
    "Create a new note in the vault",
    {
      path: z.string().describe("Path for the note (e.g. 'folder/name.md')"),
      content: z.string().optional().describe("Content of the note"),
      open: z.boolean().optional().describe("Open the note in Obsidian after creating"),
      newtab: z.boolean().optional().describe("Open in a new tab"),
    },
    async ({ path, content, open, newtab }) => {
      try {
        const args = ["create", `path=${path}`];
        if (content) args.push(`content=${content}`);
        if (open) args.push("open");
        if (newtab) args.push("newtab");
        const result = await execObsidian(args);
        return success(result || `Created note: ${path}`);
      } catch (e) {
        return error(`Failed to create note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_read",
    "Read the content of a note",
    {
      path: z.string().describe("Path to the note"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["read", `path=${path}`]);
        return success(result);
      } catch (e) {
        return error(`Failed to read note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_write",
    "Write/overwrite the content of a note",
    {
      path: z.string().describe("Path to the note"),
      content: z.string().describe("New content for the note"),
    },
    async ({ path, content }) => {
      try {
        const result = await execObsidian(["create", `path=${path}`, `content=${content}`, "overwrite"]);
        return success(result || `Wrote to note: ${path}`);
      } catch (e) {
        return error(`Failed to write note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_append",
    "Append content to a note",
    {
      path: z.string().describe("Path to the note"),
      content: z.string().describe("Content to append"),
    },
    async ({ path, content }) => {
      try {
        const result = await execObsidian(["append", `path=${path}`, `content=${content}`]);
        return success(result || `Appended to note: ${path}`);
      } catch (e) {
        return error(`Failed to append to note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_prepend",
    "Prepend content to a note",
    {
      path: z.string().describe("Path to the note"),
      content: z.string().describe("Content to prepend"),
    },
    async ({ path, content }) => {
      try {
        const result = await execObsidian(["prepend", `path=${path}`, `content=${content}`]);
        return success(result || `Prepended to note: ${path}`);
      } catch (e) {
        return error(`Failed to prepend to note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_delete",
    "Delete a note from the vault",
    {
      path: z.string().describe("Path to the note to delete"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["delete", `path=${path}`]);
        return success(result || `Deleted note: ${path}`);
      } catch (e) {
        return error(`Failed to delete note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_move",
    "Move or rename a note",
    {
      path: z.string().describe("Current path of the note"),
      destination: z.string().describe("New path for the note"),
    },
    async ({ path, destination }) => {
      try {
        const result = await execObsidian(["move", `path=${path}`, `to=${destination}`]);
        return success(result || `Moved note: ${path} → ${destination}`);
      } catch (e) {
        return error(`Failed to move note: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_search",
    "Search for notes in the vault",
    {
      query: z.string().describe("Search query"),
      format: z.enum(["json", "text"]).optional().describe("Output format (default: json)"),
    },
    async ({ query, format }) => {
      try {
        const fmt = format || "json";
        const result = await execObsidian(["search", `query=${query}`, `format=${fmt}`]);
        return success(result || "No results found.");
      } catch (e) {
        return error(`Search failed: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "note_list",
    "List files in a vault folder",
    {
      folder: z.string().optional().describe("Folder path (defaults to vault root)"),
    },
    async ({ folder }) => {
      try {
        const args = ["files"];
        if (folder) args.push(`folder=${folder}`);
        const result = await execObsidian(args);
        return success(result || "No files found.");
      } catch (e) {
        return error(`Failed to list files: ${(e as Error).message}`);
      }
    }
  );
}
