import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execObsidian } from "../cli.js";
import { success, error } from "../types.js";

export function register(server: McpServer): void {
  server.tool(
    "search",
    "Search for text in the vault",
    {
      query: z.string().describe("Search query"),
      format: z.enum(["json", "text"]).optional().describe("Output format (default: text)"),
    },
    async ({ query, format }) => {
      try {
        const args = ["search", `query=${query}`];
        if (format) args.push(`format=${format}`);
        const result = await execObsidian(args);
        return success(result || "No results found.");
      } catch (e) {
        return error(`Search failed: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "search_context",
    "Search with surrounding line context",
    {
      query: z.string().describe("Search query"),
    },
    async ({ query }) => {
      try {
        const result = await execObsidian(["search:context", `query=${query}`]);
        return success(result || "No results found.");
      } catch (e) {
        return error(`Search failed: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "backlinks",
    "List notes that link to a given file",
    {
      path: z.string().describe("Path to the file"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["backlinks", `path=${path}`]);
        return success(result || "No backlinks found.");
      } catch (e) {
        return error(`Failed to get backlinks: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "links",
    "List outgoing links from a note",
    {
      path: z.string().describe("Path to the file"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["links", `path=${path}`]);
        return success(result || "No outgoing links found.");
      } catch (e) {
        return error(`Failed to get links: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "outline",
    "Show the headings tree of a note",
    {
      path: z.string().describe("Path to the file"),
    },
    async ({ path }) => {
      try {
        const result = await execObsidian(["outline", `path=${path}`]);
        return success(result || "No headings found.");
      } catch (e) {
        return error(`Failed to get outline: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "orphans",
    "List files with no incoming links",
    {},
    async () => {
      try {
        const result = await execObsidian(["orphans"]);
        return success(result || "No orphan files found.");
      } catch (e) {
        return error(`Failed to find orphans: ${(e as Error).message}`);
      }
    }
  );

  server.tool(
    "deadends",
    "List files with no outgoing links",
    {},
    async () => {
      try {
        const result = await execObsidian(["deadends"]);
        return success(result || "No dead-end files found.");
      } catch (e) {
        return error(`Failed to find dead ends: ${(e as Error).message}`);
      }
    }
  );
}
